import type { Browser } from 'playwright';
import { observeConsent } from './consent.js';
import { classifyLoadError, Diagnostics } from './diagnostics.js';
import { ControlledNetwork, networkLimits } from './network.js';
import { DEFAULTS, type ScanOptions } from './scan-options.js';
import type { PageSnapshot } from './types.js';
import { isFirstParty } from './url.js';

/** Always owns and closes its context. Each crawl page starts without cookies/storage. */
export async function capturePage(
  browser: Browser,
  url: string,
  siteUrl: URL,
  options: ScanOptions,
  checkConsent: boolean,
): Promise<PageSnapshot> {
  const controlled = options.networkAdapter !== undefined;
  const context = await browser.newContext({
    locale: options.locale ?? DEFAULTS.locale,
    serviceWorkers: controlled ? 'block' : 'allow',
    // fulfill() works offline. Unhandled browser HTTP traffic has no network fallback.
    offline: controlled,
  });
  const controller = new AbortController();
  const captureMs = options.captureTimeoutMs ?? (controlled ? 60_000 : undefined);
  const deadline = captureMs === undefined ? undefined : AbortSignal.timeout(captureMs);
  const signal = AbortSignal.any([
    controller.signal,
    ...(options.signal ? [options.signal] : []),
    ...(deadline ? [deadline] : []),
  ]);
  const diagnostics = new Diagnostics(
    options.maxDiagnostics ?? 100,
    controlled ? networkLimits(options.networkLimits).maxRequests : 5_000,
  );
  const requests: PageSnapshot['requests'] = [];
  diagnostics.attach(context, requests);
  const network = options.networkAdapter
    ? new ControlledNetwork(
        options.networkAdapter,
        networkLimits(options.networkLimits),
        diagnostics,
        signal,
      )
    : undefined;
  let closing: Promise<void> | undefined;
  const closeOnAbort = () => {
    closing ??= context.close().catch(() => {});
  };
  signal.addEventListener('abort', closeOnAbort, { once: true });
  const snapshot: PageSnapshot = {
    url,
    finalUrl: url,
    status: null,
    requests: [],
    cookies: [],
    links: [],
    resourceHints: [],
  };
  let document = false;
  let beforeComplete = false;
  try {
    if (signal.aborted) closeOnAbort();
    await network?.attach(context);
    if (options.offline) {
      await context.route('**/*', (route) =>
        isFirstParty(route.request().url(), siteUrl)
          ? route.continue()
          : route.fulfill({ status: 200, body: '' }),
      );
    }
    const page = await context.newPage();
    await network?.attachPage(page);
    const response = await page.goto(url, {
      waitUntil: 'load',
      timeout: options.timeoutMs ?? DEFAULTS.timeoutMs,
    });
    snapshot.finalUrl = page.url();
    snapshot.status = response?.status() ?? null;
    await page
      .waitForLoadState('networkidle', {
        timeout: options.timeoutMs ?? DEFAULTS.timeoutMs,
      })
      .catch(() => diagnostics.add('timeout', page.url()));
    await page.waitForTimeout(options.settleMs ?? DEFAULTS.settleMs);
    snapshot.links = await page.$$eval('a[href]', (anchors) =>
      anchors.map((a) => ({
        href: (a as HTMLAnchorElement).href,
        text: [a.textContent, a.getAttribute('aria-label'), a.getAttribute('title')]
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 200),
      })),
    );
    snapshot.resourceHints = await page.$$eval('link[rel][href]', (elements) =>
      elements.map((link) => ({
        rel: (link.getAttribute('rel') ?? '').toLowerCase(),
        href: (link as HTMLLinkElement).href,
      })),
    );
    // Offline adapter contexts cannot prove a connection from a preconnect hint alone.
    if (controlled) snapshot.resourceHints = [];
    snapshot.cookies = (await context.cookies()).map(({ name, domain, path, expires }) => ({
      name,
      domain,
      path,
      expires,
    }));
    snapshot.requests = [...requests];
    snapshot.requestCount = diagnostics.data.requests;
    document = true;
    beforeComplete = diagnostics.data.issueCount === 0 && snapshot.error === undefined;
    if (checkConsent && options.consentCheck !== false) {
      snapshot.consent = await observeConsent(page, context, requests, {
        settleMs: options.settleMs ?? DEFAULTS.settleMs,
        timeoutMs: options.timeoutMs ?? DEFAULTS.timeoutMs,
        signal,
        onReject: () => {
          diagnostics.phase = 'after-reject';
        },
        onTimeout: () => diagnostics.add('timeout', page.url()),
      });
      if (signal.aborted) throw new DOMException('Capture ended', 'AbortError');
      if (snapshot.consent.error && !diagnostics.hasIssues('after-reject')) {
        diagnostics.add(classifyLoadError(snapshot.consent.error), page.url());
      }
    }
  } catch (error) {
    if (snapshot.requests.length === 0) snapshot.requests = [...requests];
    snapshot.requestCount ??= diagnostics.data.requests;
    const kind = signal.aborted
      ? options.signal?.aborted
        ? 'aborted'
        : 'timeout'
      : classifyLoadError(error);
    snapshot.error = kind;
    if (diagnostics.data.issueCount === 0) diagnostics.add(kind, url);
    if (
      checkConsent &&
      options.consentCheck !== false &&
      (snapshot.consent === undefined || signal.aborted)
    ) {
      snapshot.consent = {
        ...snapshot.consent,
        bannerFound: snapshot.consent?.bannerFound ?? false,
        rejected: false,
        state: 'interaction-failed',
        error: kind,
      };
    }
  } finally {
    diagnostics.stop();
    controller.abort();
    signal.removeEventListener('abort', closeOnAbort);
    await Promise.all([closing ?? context.close(), network?.close()]);
  }
  if (options.signal?.aborted) throw new DOMException('Scan aborted', 'AbortError');
  beforeComplete = beforeComplete && !diagnostics.hasIssues('before-consent');
  if (snapshot.consent?.rejected) {
    snapshot.consent.afterRejectComplete = !diagnostics.hasIssues('after-reject');
  }
  snapshot.capture = {
    complete: beforeComplete && diagnostics.data.issueCount === 0,
    beforeConsentComplete: beforeComplete,
    document,
    diagnostics: diagnostics.data,
  };
  return snapshot;
}
