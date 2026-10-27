import { chromium } from 'playwright';
import { assessPage } from './assessment.js';
import { capturePage } from './capture.js';
import { diagnosticUrl } from './diagnostics.js';
import { applyRegion } from './legal.js';
import { networkLimits } from './network.js';
import { defaultRules } from './rules/index.js';
import { DEFAULTS, type ScanOptions } from './scan-options.js';
import type { PageSnapshot, ScanResult } from './types.js';
import { crawlTarget, withoutHash } from './url.js';

export type { ScanOptions } from './scan-options.js';

function integer(value: number, name: string, minimum: number): void {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new RangeError(`${name} must be a safe integer of at least ${minimum}`);
  }
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Scan aborted', 'AbortError');
}

export async function scan(target: string, options: ScanOptions = {}): Promise<ScanResult> {
  throwIfAborted(options.signal);
  const startedAt = Date.now();
  const rules = options.rules ?? defaultRules;
  const maxPages = options.maxPages ?? DEFAULTS.maxPages;
  integer(maxPages, 'maxPages', 1);
  integer(options.settleMs ?? DEFAULTS.settleMs, 'settleMs', 0);
  integer(options.timeoutMs ?? DEFAULTS.timeoutMs, 'timeoutMs', 1);
  integer(options.maxDiagnostics ?? 100, 'maxDiagnostics', 0);
  if (options.captureTimeoutMs !== undefined)
    integer(options.captureTimeoutMs, 'captureTimeoutMs', 1);
  if (options.networkLimits && !options.networkAdapter) {
    throw new TypeError('networkLimits requires networkAdapter');
  }
  if (options.networkAdapter && options.offline) {
    throw new TypeError('offline cannot be combined with networkAdapter');
  }
  if (options.networkAdapter) networkLimits(options.networkLimits);
  const lang = options.lang ?? 'en';
  const region = options.region ?? 'de';
  let siteUrl = new URL(target);
  if (!/^https?:$/.test(siteUrl.protocol)) throw new TypeError('Expected an HTTP(S) target');
  const browser = await chromium.launch({
    headless: options.headed !== true,
    ...(options.channel === undefined ? {} : { channel: options.channel }),
  });
  try {
    throwIfAborted(options.signal);
    const snapshots: PageSnapshot[] = [];
    const queue = [siteUrl.href];
    const seen = new Set(queue);
    const captured = new Set<string>();
    let url = queue.shift();
    while (url !== undefined && snapshots.length < maxPages) {
      throwIfAborted(options.signal);
      const isStart = snapshots.length === 0;
      const snapshot = await capturePage(browser, url, siteUrl, options, isStart);
      if (isStart) {
        const failureMode = options.failureMode ?? (options.networkAdapter ? 'report' : 'throw');
        if (snapshot.error !== undefined && failureMode === 'throw') {
          throw new Error(`Could not load ${diagnosticUrl(url)}: ${snapshot.error}`);
        }
        siteUrl = new URL(snapshot.finalUrl);
      }
      const finalUrl = withoutHash(snapshot.finalUrl);
      if (!captured.has(finalUrl)) {
        captured.add(finalUrl);
        seen.add(finalUrl);
        snapshots.push(snapshot);
        options.onPage?.(snapshot);
        for (const link of snapshot.links) {
          const next = crawlTarget(link.href, siteUrl);
          if (next !== undefined && !seen.has(next)) {
            seen.add(next);
            queue.push(next);
          }
        }
      }
      url = queue.shift();
    }
    throwIfAborted(options.signal);
    const assessments = snapshots.map((page, index) =>
      assessPage(page, rules, siteUrl, lang, index === 0, options.consentCheck !== false),
    );
    const partial =
      assessments.some((assessment) =>
        assessment.evaluations.some(
          (evaluation) => evaluation.partial || evaluation.reason === 'consent-disabled',
        ),
      ) || snapshots.some((page) => !page.capture?.complete);
    const result: ScanResult = {
      siteUrl: siteUrl.href,
      lang,
      region,
      scannedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
      pages: snapshots.map((page, index) => ({
        url: page.url,
        finalUrl: page.finalUrl,
        status: page.status,
        requestCount: page.requestCount ?? page.requests.length,
        cookieCount: page.cookies.length,
        ...(page.error === undefined ? {} : { error: page.error }),
        ...(page.capture === undefined ? {} : { capture: page.capture }),
        ruleEvaluations: assessments[index]?.evaluations ?? [],
      })),
      ...consentSummary(snapshots[0]),
      findings: applyRegion(
        assessments.flatMap((assessment) => assessment.findings),
        region,
      ),
      rules: rules.map(({ check: _check, ...meta }) => meta),
      coverage: partial ? 'partial' : 'complete',
    };
    return options.networkAdapter ? redactReport(result) : result;
  } finally {
    await browser.close();
  }
}

function consentSummary(start: PageSnapshot | undefined): Pick<ScanResult, 'consent'> {
  if (start?.consent === undefined) return {};
  const { afterReject: _afterReject, ...summary } = start.consent;
  return { consent: summary };
}

/** Adapter reports omit URL credentials, paths, queries and fragments by default. */
function redactReport(result: ScanResult): ScanResult {
  const redactText = (text: string) => text.replace(/https?:\/\/[^\s<>"']+/gi, diagnosticUrl);
  return {
    ...result,
    siteUrl: diagnosticUrl(result.siteUrl),
    ...(result.consent === undefined
      ? {}
      : {
          consent: {
            ...result.consent,
            ...(result.consent.acceptLabel === undefined
              ? {}
              : { acceptLabel: redactText(result.consent.acceptLabel) }),
            ...(result.consent.rejectLabel === undefined
              ? {}
              : { rejectLabel: redactText(result.consent.rejectLabel) }),
          },
        }),
    pages: result.pages.map((page) => ({
      ...page,
      url: diagnosticUrl(page.url),
      finalUrl: diagnosticUrl(page.finalUrl),
    })),
    findings: result.findings.map((finding) => ({
      ...finding,
      pageUrl: diagnosticUrl(finding.pageUrl),
      message: redactText(finding.message),
      evidence: finding.evidence.map(redactText),
      ...(finding.fix === undefined ? {} : { fix: redactText(finding.fix) }),
    })),
  };
}
