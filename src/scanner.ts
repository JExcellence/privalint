import { randomUUID } from 'node:crypto';
import { type Browser, chromium } from 'playwright';
import { assessPage } from './assessment.js';
import { capturePage } from './capture.js';
import { diagnosticUrl } from './diagnostics.js';
import { applyRegion } from './legal.js';
import { VERSION } from './meta.js';
import { networkLimits } from './network.js';
import { applyPolicy, ruleSetting, validateRuleSettings } from './policy.js';
import { REPORT_SCHEMA_VERSION } from './report-contract.js';
import { defaultRules } from './rules/index.js';
import { DEFAULTS, type ScanOptions } from './scan-options.js';
import type { PageSnapshot, ScanProgressEvent, ScanResult } from './types.js';
import { crawlTarget, withoutHash } from './url.js';

export type { ScanOptions } from './scan-options.js';

function integer(value: number, name: string, minimum: number): void {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new RangeError(`${name} must be a safe integer of at least ${minimum}`);
  }
}

async function launchBrowser(options: ScanOptions): Promise<Browser> {
  const sandbox = options.sandbox === true;
  try {
    return await chromium.launch({
      headless: options.headed !== true,
      chromiumSandbox: sandbox,
      ...(options.channel === undefined ? {} : { channel: options.channel }),
    });
  } catch (error) {
    if (!sandbox) throw error;
    // Chromium's own message ("No usable sandbox!") does not say what to change.
    throw new Error(
      'Chromium could not start with its sandbox. On Linux this usually means unprivileged user ' +
        'namespaces are restricted (Ubuntu 23.10 and later, many containers). Allow them for ' +
        'Chromium or run without --sandbox; see ' +
        'https://chromium.googlesource.com/chromium/src/+/main/docs/security/apparmor-userns-restrictions.md',
      { cause: error },
    );
  }
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Scan aborted', 'AbortError');
}

export async function scan(target: string, options: ScanOptions = {}): Promise<ScanResult> {
  throwIfAborted(options.signal);
  const startedAt = Date.now();
  const scanId = randomUUID();
  const emit = (event: ScanProgressEvent) =>
    options.onProgress?.({ ...event, scanId, elapsedMs: Date.now() - startedAt });
  emit({ stage: 'starting', elapsedMs: 0 });
  const configuredRules = options.rules ?? defaultRules;
  validateRuleSettings(options.ruleSettings ?? {}, [...defaultRules, ...configuredRules]);
  if (
    options.allow &&
    (!Array.isArray(options.allow.vendors) ||
      !options.allow.vendors.every((vendor) => typeof vendor === 'string' && vendor.length > 0))
  ) {
    throw new TypeError('allow.vendors must contain non-empty vendor names');
  }
  const rules = configuredRules.filter(
    (rule) => ruleSetting(options.ruleSettings, rule.id) !== 'off',
  );
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
  const browser = await launchBrowser(options);
  try {
    throwIfAborted(options.signal);
    const snapshots: PageSnapshot[] = [];
    const queue = [siteUrl.href];
    const seen = new Set(queue);
    const pageIds = new Map<string, { pageId: string; pageIndex: number }>();
    let url = queue.shift();
    while (url !== undefined && snapshots.length < maxPages) {
      throwIfAborted(options.signal);
      const isStart = snapshots.length === 0;
      const pageIndex = snapshots.length;
      const captureId = randomUUID();
      emit({
        stage: 'loading-page',
        elapsedMs: 0,
        pageUrl: diagnosticUrl(url),
        pageIndex,
        captureId,
      });
      let progressFailure: { error: unknown } | undefined;
      const snapshot = await capturePage(
        browser,
        url,
        siteUrl,
        {
          ...options,
          onProgress: (event) => {
            try {
              emit({ ...event, pageIndex, captureId });
            } catch (error) {
              progressFailure = { error };
              throw error;
            }
          },
        },
        isStart,
      );
      if (progressFailure) throw progressFailure.error;
      if (isStart) {
        const failureMode = options.failureMode ?? (options.networkAdapter ? 'report' : 'throw');
        if (snapshot.error !== undefined && failureMode === 'throw') {
          throw new Error(`Could not load ${diagnosticUrl(url)}: ${snapshot.error}`);
        }
        siteUrl = new URL(snapshot.finalUrl);
      }
      const finalUrl = withoutHash(snapshot.finalUrl);
      const existingPage = pageIds.get(finalUrl);
      const { pageId, pageIndex: resolvedIndex } = existingPage ?? {
        pageId: randomUUID(),
        pageIndex,
      };
      pageIds.set(finalUrl, { pageId, pageIndex: resolvedIndex });
      snapshot.pageId = pageId;
      emit({
        stage: 'page-captured',
        elapsedMs: 0,
        pageUrl: diagnosticUrl(snapshot.finalUrl),
        captureId,
        pageId,
        pageIndex: resolvedIndex,
      });
      if (existingPage === undefined) {
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
    const assessments = snapshots.map((page, index) => {
      emit({
        stage: 'evaluating-rules',
        elapsedMs: 0,
        pageIndex: index,
        ...(page.pageId === undefined ? {} : { pageId: page.pageId }),
        pageUrl: diagnosticUrl(page.finalUrl),
      });
      return assessPage(
        page,
        rules,
        siteUrl,
        lang,
        index === 0,
        options.consentCheck !== false,
        configuredRules,
      );
    });
    const partial =
      assessments.some((assessment) =>
        assessment.evaluations.some(
          (evaluation) => evaluation.partial || evaluation.reason === 'consent-disabled',
        ),
      ) || snapshots.some((page) => !page.capture?.complete);
    const result: ScanResult = {
      scanId,
      schemaVersion: REPORT_SCHEMA_VERSION,
      scannerVersion: VERSION,
      options: {
        maxPages,
        settleMs: options.settleMs ?? DEFAULTS.settleMs,
        timeoutMs: options.timeoutMs ?? DEFAULTS.timeoutMs,
        locale: options.locale ?? DEFAULTS.locale,
        lang,
        region,
        consentCheck: options.consentCheck !== false,
        headed: options.headed === true,
        channel: options.channel ?? 'chromium',
        sandbox: options.sandbox === true,
        captureTimeoutMs: options.captureTimeoutMs ?? (options.networkAdapter ? 60_000 : null),
        maxDiagnostics: options.maxDiagnostics ?? 100,
        failureMode: options.failureMode ?? (options.networkAdapter ? 'report' : 'throw'),
        captureMode: options.networkAdapter
          ? 'adapter'
          : options.offline
            ? 'offline-fixture'
            : 'native',
        networkLimits: options.networkAdapter ? networkLimits(options.networkLimits) : null,
        selectedRules: rules.map((rule) => rule.id),
        ruleSettings: { ...options.ruleSettings },
        allowedVendors: [...(options.allow?.vendors ?? [])],
      },
      siteUrl: siteUrl.href,
      lang,
      region,
      scannedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
      pages: snapshots.map((page, index) => ({
        ...(page.pageId === undefined ? {} : { pageId: page.pageId }),
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
      findings: applyPolicy(
        applyRegion(
          assessments.flatMap((assessment) => assessment.findings),
          region,
        ),
        options.ruleSettings,
        options.allow?.vendors,
      ),
      rules: rules.map(({ check: _check, ...meta }) => meta),
      coverage: partial ? 'partial' : 'complete',
    };
    emit({ stage: 'completed', elapsedMs: 0 });
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
