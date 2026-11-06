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
import { summarizeRules } from './rule-summary.js';
import { defaultRules } from './rules/index.js';
import { DEFAULTS, type ScanOptions } from './scan-options.js';
import type {
  ConsentSummary,
  OffSiteRedirect,
  PageSnapshot,
  ScanProgressEvent,
  ScanResult,
  SettingsObservation,
} from './types.js';
import { crawlTarget, isFirstParty, withoutHash } from './url.js';

export type { ScanOptions } from './scan-options.js';

/** Other hosts of the site whose first page gets the start-page checks, at most. */
const MAX_HOST_STARTS = 5;

interface Capture {
  url: string;
  snapshot: PageSnapshot;
  isStart: boolean;
  /** The first page of another host of the site, checked like a start page. */
  hostStart: boolean;
  pageIndex: number;
  captureId: string;
}

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
      'Chromium could not start with its sandbox. It needs unprivileged user namespaces. ' +
        'In a Docker container the default seccomp profile blocks them: run the container with ' +
        'a seccomp profile that allows them (see Docker’s seccomp docs) or run privalint ' +
        'without --sandbox. On Ubuntu 23.10 and later, AppArmor restricts them unless Chromium ' +
        'is allowed to use them: ' +
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
  const concurrency = options.concurrency ?? DEFAULTS.concurrency;
  integer(concurrency, 'concurrency', 1);
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
    const offSite: OffSiteRedirect[] = [];
    const queue = [siteUrl.href];
    const seen = new Set(queue);
    const hostChecks = options.hostChecks ?? 'each';
    // Queue indexes whose page is the first of its host; decided in queue order, so concurrent
    // and sequential crawls agree.
    const hostStartIndexes = new Set<number>();
    const hostsSeen = new Set([siteUrl.host]);
    const hostStarts = new Set<PageSnapshot>();
    const pageIds = new Map<string, { pageId: string; pageIndex: number }>();
    // Captures run ahead of the queue head, but their results are committed strictly in queue
    // order. Pages, their order and the queue therefore match a sequential crawl exactly.
    const pending = new Map<number, Promise<Capture>>();
    let head = 0;
    let launched = 0;
    const launch = (index: number): Promise<Capture> => {
      const url = queue[index] as string;
      const isStart = index === 0;
      const hostStart = hostStartIndexes.has(index);
      const pageIndex = snapshots.length + (index - head);
      const captureId = randomUUID();
      emit({
        stage: 'loading-page',
        elapsedMs: 0,
        pageUrl: diagnosticUrl(url),
        pageIndex,
        captureId,
      });
      let progressFailure: { error: unknown } | undefined;
      const task = capturePage(
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
        isStart || hostStart ? 'reject' : 'none',
      ).then(async (snapshot) => {
        if (progressFailure) throw progressFailure.error;
        if (
          isStart &&
          options.settingsCheck === true &&
          options.consentCheck !== false &&
          snapshot.consent?.bannerFound === true
        ) {
          snapshot.consent.settings = await checkSettings(browser, url, siteUrl, options);
        }
        return { url, snapshot, isStart, hostStart, pageIndex, captureId };
      });
      // Awaited in queue order below; this only keeps a page that fails while an earlier one is
      // still loading from becoming an unhandled rejection.
      task.catch(() => undefined);
      return task;
    };
    // The start page decides the site URL that later links are resolved against, so it runs alone.
    const canLaunch = () =>
      launched < queue.length &&
      (launched === 0 || head > 0) &&
      launched - head < concurrency &&
      snapshots.length + (launched - head) < maxPages;
    while (head < queue.length && snapshots.length < maxPages) {
      throwIfAborted(options.signal);
      while (canLaunch()) {
        pending.set(launched, launch(launched));
        launched += 1;
      }
      const { url, snapshot, isStart, hostStart, pageIndex, captureId } = await (pending.get(
        head,
      ) as Promise<Capture>);
      pending.delete(head);
      head += 1;
      if (isStart) {
        const failureMode = options.failureMode ?? (options.networkAdapter ? 'report' : 'throw');
        if (snapshot.error !== undefined && failureMode === 'throw') {
          throw new Error(`Could not load ${diagnosticUrl(url)}: ${snapshot.error}`);
        }
        siteUrl = new URL(snapshot.finalUrl);
        hostsSeen.add(siteUrl.host);
      } else if (!isFirstParty(snapshot.finalUrl, siteUrl)) {
        // A link that redirected to another site: its trackers and cookies aren't this site's.
        offSite.push({ url: snapshot.url, finalUrl: snapshot.finalUrl });
        emit({ stage: 'page-captured', elapsedMs: 0, captureId, pageIndex });
        continue;
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
        if (hostStart) hostStarts.add(snapshot);
        options.onPage?.(snapshot);
        for (const link of snapshot.links) {
          const next = crawlTarget(link.href, siteUrl);
          if (next !== undefined && !seen.has(next)) {
            seen.add(next);
            queue.push(next);
            const host = new URL(next).host;
            if (
              hostChecks === 'each' &&
              !hostsSeen.has(host) &&
              hostStartIndexes.size < MAX_HOST_STARTS
            ) {
              hostsSeen.add(host);
              hostStartIndexes.add(queue.length - 1);
            }
          }
        }
      }
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
      return assessPage(page, rules, siteUrl, {
        lang,
        region,
        isStart: index === 0 || hostStarts.has(page),
        consentEnabled: options.consentCheck !== false,
        catalog: configuredRules,
        settingsEnabled: options.settingsCheck === true,
        transportEnabled: !options.networkAdapter && !options.offline,
      });
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
        concurrency,
        settleMs: options.settleMs ?? DEFAULTS.settleMs,
        timeoutMs: options.timeoutMs ?? DEFAULTS.timeoutMs,
        locale: options.locale ?? DEFAULTS.locale,
        lang,
        region,
        consentCheck: options.consentCheck !== false,
        settingsCheck: options.settingsCheck === true,
        hostChecks,
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
      ...(offSite.length === 0 ? {} : { offSiteRedirects: offSite }),
      ...consentByHost(snapshots.filter((page) => hostStarts.has(page))),
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
    result.ruleSummary = summarizeRules(
      result.pages,
      rules.map((rule) => rule.id),
    );
    emit({ stage: 'completed', elapsedMs: 0 });
    const clean = withoutCredentials(result);
    return options.networkAdapter ? redactReport(clean) : clean;
  } finally {
    await browser.close();
  }
}

/** Runs the settings path on the start page in a fresh context, after the reject path. */
async function checkSettings(
  browser: Browser,
  url: string,
  siteUrl: URL,
  options: ScanOptions,
): Promise<SettingsObservation> {
  const capture = await capturePage(browser, url, siteUrl, options, 'settings');
  if (capture.consent?.settings !== undefined) return capture.consent.settings;
  // The page didn't load: a browser problem. It loaded but showed no banner this time: say so,
  // instead of calling a geo- or A/B-dependent banner a browser failure.
  return capture.error === undefined
    ? { outcome: 'banner-not-shown', reason: 'banner-not-shown' }
    : { outcome: 'interaction-failed', reason: 'browser-interaction-failed', error: capture.error };
}

function consentSummary(start: PageSnapshot | undefined): Pick<ScanResult, 'consent'> {
  if (start?.consent === undefined) return {};
  const {
    afterReject: _afterReject,
    bannerLinks: _bannerLinks,
    bannerBlocking: _bannerBlocking,
    bannerControls: _bannerControls,
    settings,
    ...summary
  } = start.consent;
  if (settings === undefined) return { consent: summary };
  const { afterSave: _afterSave, ...settingsSummary } = settings;
  return { consent: { ...summary, settings: settingsSummary } };
}

function consentByHost(pages: readonly PageSnapshot[]): Pick<ScanResult, 'consentByHost'> {
  const byHost: Record<string, ConsentSummary> = {};
  for (const page of pages) {
    const { consent } = consentSummary(page);
    if (consent !== undefined) byHost[new URL(page.finalUrl).host] = consent;
  }
  return Object.keys(byHost).length === 0 ? {} : { consentByHost: byHost };
}

const URL_CREDENTIALS = /(https?:\/\/)[^\s/?#@]+@/gi;

/**
 * Basic-auth credentials in the target URL (a staging site) open the site, but must never reach a
 * report, a SARIF upload or a PR comment. Every string in the report is cleaned, so a URL in a
 * field added later can't carry them either.
 */
function withoutCredentials<T>(value: T): T {
  if (typeof value === 'string') return value.replace(URL_CREDENTIALS, '$1') as T;
  if (Array.isArray(value)) return value.map(withoutCredentials) as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, withoutCredentials(item)]),
    ) as T;
  }
  return value;
}

const redactText = (text: string) => text.replace(/https?:\/\/[^\s<>"']+/gi, diagnosticUrl);

/** Button labels can quote URLs; adapter reports keep only their origin. */
function redactConsent(consent: ConsentSummary): ConsentSummary {
  return {
    ...consent,
    ...(consent.acceptLabel === undefined ? {} : { acceptLabel: redactText(consent.acceptLabel) }),
    ...(consent.rejectLabel === undefined ? {} : { rejectLabel: redactText(consent.rejectLabel) }),
    ...(consent.settings === undefined
      ? {}
      : {
          settings: {
            ...consent.settings,
            ...(consent.settings.openLabel === undefined
              ? {}
              : { openLabel: redactText(consent.settings.openLabel) }),
            ...(consent.settings.saveLabel === undefined
              ? {}
              : { saveLabel: redactText(consent.settings.saveLabel) }),
          },
        }),
  };
}

/** Adapter reports omit URL credentials, paths, queries and fragments by default. */
function redactReport(result: ScanResult): ScanResult {
  return {
    ...result,
    siteUrl: diagnosticUrl(result.siteUrl),
    ...(result.consent === undefined ? {} : { consent: redactConsent(result.consent) }),
    ...(result.consentByHost === undefined
      ? {}
      : {
          consentByHost: Object.fromEntries(
            Object.entries(result.consentByHost).map(([host, consent]) => [
              host,
              redactConsent(consent),
            ]),
          ),
        }),
    pages: result.pages.map((page) => ({
      ...page,
      url: diagnosticUrl(page.url),
      finalUrl: diagnosticUrl(page.finalUrl),
    })),
    ...(result.offSiteRedirects === undefined
      ? {}
      : {
          offSiteRedirects: result.offSiteRedirects.map(({ url, finalUrl }) => ({
            url: diagnosticUrl(url),
            finalUrl: diagnosticUrl(finalUrl),
          })),
        }),
    findings: result.findings.map((finding) => ({
      ...finding,
      pageUrl: diagnosticUrl(finding.pageUrl),
      message: redactText(finding.message),
      evidence: finding.evidence.map(redactText),
      ...(finding.fix === undefined ? {} : { fix: redactText(finding.fix) }),
    })),
  };
}
