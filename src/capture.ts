import { type Browser, devices, type Page } from 'playwright';
import { observeClose, observeConsent, observeSettings } from './consent.js';
import { classifyLoadError, Diagnostics, diagnosticUrl } from './diagnostics.js';
import { readForms } from './forms.js';
import { ControlledNetwork, networkLimits, watchPageCancellations } from './network.js';
import { DEFAULTS, type ScanOptions } from './scan-options.js';
import { readStorageKeys } from './storage.js';
import { observeTransport } from './transport.js';
import type { LinkedPageText, PageSnapshot } from './types.js';
import { isFirstParty } from './url.js';

/**
 * Which consent path to test on the page: none, the reject button, or the settings layer.
 * Settings runs in its own capture because a stored reject would hide the banner.
 */
export type ConsentPath = 'none' | 'reject' | 'settings' | 'close';

/** Always owns and closes its context. Each crawl page starts without cookies/storage. */
export async function capturePage(
  browser: Browser,
  url: string,
  siteUrl: URL,
  options: ScanOptions,
  consentPath: ConsentPath,
  keepText = false,
): Promise<PageSnapshot> {
  const checkConsent = consentPath !== 'none';
  const controlled = options.networkAdapter !== undefined;
  const context = await browser.newContext({
    ...deviceOptions(options.device),
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
    if (network) await network.attachPage(page);
    else {
      // Without an adapter nothing else listens to CDP; page cancels need their own session.
      const session = await context.newCDPSession(page);
      await watchPageCancellations(session, (_, cancelled) =>
        diagnostics.cancelledByPage(cancelled),
      );
    }
    const navigationStart = performance.now();
    const response = await page.goto(url, {
      waitUntil: 'load',
      timeout: options.timeoutMs ?? DEFAULTS.timeoutMs,
    });
    const loaded = performance.now();
    diagnostics.timing.loadMs = Math.round(loaded - navigationStart);
    snapshot.finalUrl = page.url();
    snapshot.status = response?.status() ?? null;
    await page
      .waitForLoadState('networkidle', {
        timeout: options.timeoutMs ?? DEFAULTS.timeoutMs,
      })
      .catch(() => diagnostics.add('timeout', page.url()));
    diagnostics.timing.networkIdleMs = Math.round(performance.now() - loaded);
    await page.waitForTimeout(options.settleMs ?? DEFAULTS.settleMs);
    // A script may have redirected while the page settled; links and rules belong to where it went.
    snapshot.finalUrl = page.url();
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
    const language = await page
      .evaluate(() => globalThis.document.documentElement.lang)
      .catch(() => '');
    const primary = /^[a-z]{2,3}/i.exec(language.trim())?.[0];
    if (primary !== undefined) snapshot.language = primary.toLowerCase();
    snapshot.browserLanguage =
      (options.locale ?? DEFAULTS.locale).split('-')[0]?.toLowerCase() ?? '';
    snapshot.forms = await readForms(page);
    const security = await readPageSecurity(page);
    if (security.insecure.length > 0) snapshot.insecureResources = security.insecure;
    const header = response?.headers()['referrer-policy'];
    if (header !== undefined || security.referrer !== undefined) {
      snapshot.referrerPolicy = {
        ...(header === undefined ? {} : { header }),
        ...(security.referrer === undefined ? {} : { meta: security.referrer }),
      };
    }
    const text = keepText ? await readText(page, snapshot.finalUrl) : undefined;
    if (text !== undefined) snapshot.pageText = text;
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
    snapshot.storage = await readStorageKeys(page);
    // One extra request to the target, so only where privalint owns the network.
    if (consentPath === 'reject' && !controlled && !options.offline) {
      snapshot.transport = await observeTransport(context.request, snapshot.finalUrl, response);
    }
    snapshot.requests = [...requests];
    snapshot.requestCount = diagnostics.data.requests;
    document = true;
    beforeComplete = diagnostics.restrictingIssues === 0 && snapshot.error === undefined;
    if (checkConsent && options.consentCheck !== false) {
      options.onProgress?.({
        stage: 'checking-consent',
        elapsedMs: 0,
        pageUrl: diagnosticUrl(url),
      });
      const consentOptions = {
        settleMs: options.settleMs ?? DEFAULTS.settleMs,
        timeoutMs: options.timeoutMs ?? DEFAULTS.timeoutMs,
        signal,
        onReject: () => {
          diagnostics.phase = 'after-reject';
        },
        onTimeout: () => diagnostics.add('timeout', page.url()),
      };
      if (consentPath === 'close') {
        const close = await observeClose(page, context, requests, consentOptions);
        snapshot.consent = {
          bannerFound: close !== undefined,
          rejected: false,
          ...(close === undefined ? {} : { close }),
        };
      } else if (consentPath === 'settings') {
        const settings = await observeSettings(page, context, requests, consentOptions);
        snapshot.consent = {
          bannerFound: settings !== undefined,
          rejected: false,
          ...(settings === undefined ? {} : { settings }),
        };
      } else {
        snapshot.consent = await observeConsent(page, context, requests, consentOptions);
      }
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
        outcome: 'interaction-failed',
        reason: 'browser-interaction-failed',
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
  // The close path, too, reuses the after-reject phase for what loads after closing.
  if (snapshot.consent?.close?.afterClose !== undefined) {
    snapshot.consent.close.afterCloseComplete = !diagnostics.hasIssues('after-reject');
  }
  // The settings path reuses the after-reject phase for what loads after saving.
  if (snapshot.consent?.settings?.afterSave !== undefined) {
    snapshot.consent.settings.afterSaveComplete = !diagnostics.hasIssues('after-reject');
  }
  snapshot.capture = {
    complete: beforeComplete && diagnostics.restrictingIssues === 0,
    beforeConsentComplete: beforeComplete,
    document,
    diagnostics: diagnostics.data,
  };
  return snapshot;
}

/** Characters of page text kept; enough for a long privacy policy. */
const MAX_PAGE_TEXT = 100_000;

/** The visible text of the page and whether it links an e-mail address. */
async function readText(page: Page, url: string): Promise<LinkedPageText | undefined> {
  return page
    .evaluate((max) => {
      const doc = globalThis.document;
      return {
        text: (doc.body?.innerText ?? '').slice(0, max),
        mailto: doc.querySelector('a[href^="mailto:" i]') !== null,
      };
    }, MAX_PAGE_TEXT)
    .then((read) => ({ url, ...read }))
    .catch(() => undefined);
}

/** Resources referenced over http:// and the referrer policy set by meta tag. */
async function readPageSecurity(page: Page): Promise<{ insecure: string[]; referrer?: string }> {
  const read = await page
    .evaluate(() => {
      const selector =
        'script[src], img[src], iframe[src], source[src], video[src], audio[src], embed[src], link[rel~="stylesheet" i][href]';
      const urls = [...document.querySelectorAll(selector)].map(
        (element) => (element as HTMLLinkElement).href || (element as HTMLImageElement).src || '',
      );
      const meta = document.querySelector('meta[name="referrer" i]')?.getAttribute('content');
      return {
        insecure: [...new Set(urls.filter((url) => /^http:/i.test(url)))].slice(0, 10),
        ...(meta == null ? {} : { referrer: meta }),
      };
    })
    .catch(() => ({ insecure: [] as string[] }));
  return read;
}

/**
 * The browser context options of a Playwright device. The scan always runs Chromium, so the device's
 * own default browser is left out; Chromium emulates viewport, touch and the mobile user agent.
 */
export function deviceOptions(name: string | undefined): Record<string, unknown> {
  if (name === undefined) return {};
  const descriptor = devices[name];
  if (descriptor === undefined) throw new Error(`Unknown device "${name}".`);
  const { defaultBrowserType: _browser, ...options } = descriptor;
  return options;
}
