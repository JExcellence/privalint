import { type Browser, chromium } from 'playwright';
import { observeConsent } from './consent.js';
import type { Lang } from './i18n.js';
import { applyRegion, type Region } from './legal.js';
import { defaultRules } from './rules/index.js';
import type { Finding, PageSnapshot, Rule, ScanResult } from './types.js';
import { crawlTarget, isFirstParty, withoutHash } from './url.js';

export interface ScanOptions {
  /** Maximum number of pages on the same site to visit, starting with the given URL. */
  maxPages?: number | undefined;
  /** Extra time to wait after the network is idle, to catch delayed tags. */
  settleMs?: number | undefined;
  /** Navigation timeout per page. */
  timeoutMs?: number | undefined;
  locale?: string | undefined;
  /** Language of messages and fixes in the findings. */
  lang?: Lang | undefined;
  /** Country whose law the findings are judged by. */
  region?: Region | undefined;
  rules?: readonly Rule[];
  /**
   * Answer every third-party request with an empty response instead of fetching it.
   * Requests are still recorded. Used by the test suite to stay off the network.
   */
  offline?: boolean;
  /**
   * Click "reject" on the start page's consent banner and record what still loads.
   * On by default.
   */
  consentCheck?: boolean | undefined;
  /**
   * Open a visible browser window instead of running headless. Some sites only show their
   * consent banner to regular browsers. Needs a display, so it doesn't work on CI runners.
   */
  headed?: boolean | undefined;
  /**
   * Use an installed browser instead of Playwright's bundled Chromium,
   * e.g. `chrome` or `msedge`.
   */
  channel?: string | undefined;
  onPage?: (snapshot: PageSnapshot) => void;
}

const DEFAULTS = {
  maxPages: 1,
  settleMs: 2_000,
  timeoutMs: 30_000,
  locale: 'de-DE',
  lang: 'en',
  region: 'de',
} satisfies ScanOptions;

export async function scan(target: string, options: ScanOptions = {}): Promise<ScanResult> {
  const startedAt = Date.now();
  const rules = options.rules ?? defaultRules;
  const maxPages = Math.max(1, options.maxPages ?? DEFAULTS.maxPages);
  const lang = options.lang ?? DEFAULTS.lang;
  const region = options.region ?? DEFAULTS.region;
  let siteUrl = new URL(target);

  const browser = await chromium.launch({
    headless: options.headed !== true,
    ...(options.channel === undefined ? {} : { channel: options.channel }),
  });
  try {
    const snapshots: PageSnapshot[] = [];
    const queue = [siteUrl.href];
    const seen = new Set(queue);
    const captured = new Set<string>();

    let url = queue.shift();
    while (url !== undefined && snapshots.length < maxPages) {
      const isStart = snapshots.length === 0;
      const snapshot = await capturePage(browser, url, siteUrl, options, isStart);
      if (isStart) {
        if (snapshot.error !== undefined) {
          throw new Error(`Could not load ${url}: ${snapshot.error}`);
        }
        // Follow redirects like http -> https or apex -> www for the rest of the crawl.
        siteUrl = new URL(snapshot.finalUrl);
      }

      // Several links can redirect to the same page; only lint it once.
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

    // Pages that failed, returned an error status or redirected off-site are listed but not linted.
    const observed: Finding[] = snapshots
      .filter(
        (page) =>
          page.error === undefined &&
          (page.status === null || page.status < 400) &&
          isFirstParty(page.finalUrl, siteUrl),
      )
      .flatMap((page) => rules.flatMap((rule) => rule.check({ siteUrl, page, lang })));
    const findings = applyRegion(observed, region);

    return {
      siteUrl: siteUrl.href,
      lang,
      region,
      scannedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
      pages: snapshots.map((page) => ({
        url: page.url,
        finalUrl: page.finalUrl,
        status: page.status,
        requestCount: page.requests.length,
        cookieCount: page.cookies.length,
        ...(page.error === undefined ? {} : { error: page.error }),
      })),
      ...consentSummary(snapshots[0]),
      findings,
      rules: rules.map(({ check: _check, ...meta }) => meta),
    };
  } finally {
    await browser.close();
  }
}

function consentSummary(start: PageSnapshot | undefined): Pick<ScanResult, 'consent'> {
  if (start?.consent === undefined) {
    return {};
  }
  const { afterReject: _afterReject, ...summary } = start.consent;
  return { consent: summary };
}

async function capturePage(
  browser: Browser,
  url: string,
  siteUrl: URL,
  options: ScanOptions,
  checkConsent: boolean,
): Promise<PageSnapshot> {
  // A fresh context per page means no cookies or storage carry over:
  // every page is seen the way a first-time visitor sees it.
  const context = await browser.newContext({ locale: options.locale ?? DEFAULTS.locale });
  const requests: PageSnapshot['requests'] = [];
  try {
    if (options.offline) {
      await context.route('**/*', (route) =>
        isFirstParty(route.request().url(), siteUrl)
          ? route.continue()
          : route.fulfill({ status: 200, body: '' }),
      );
    }

    const page = await context.newPage();
    page.on('request', (request) => {
      requests.push({ url: request.url(), resourceType: request.resourceType() });
    });

    const response = await page.goto(url, {
      waitUntil: 'load',
      timeout: options.timeoutMs ?? DEFAULTS.timeoutMs,
    });
    await page
      .waitForLoadState('networkidle', { timeout: options.timeoutMs ?? DEFAULTS.timeoutMs })
      .catch(() => {
        // Long-polling or streaming pages never go idle; carry on with what we have.
      });
    await page.waitForTimeout(options.settleMs ?? DEFAULTS.settleMs);

    const links = await page.$$eval('a[href]', (anchors) =>
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
    const resourceHints = await page.$$eval('link[rel][href]', (elements) =>
      elements.map((link) => ({
        rel: (link.getAttribute('rel') ?? '').toLowerCase(),
        href: (link as HTMLLinkElement).href,
      })),
    );
    const cookies = (await context.cookies()).map(({ name, domain, path, expires }) => ({
      name,
      domain,
      path,
      expires,
    }));

    const snapshot: PageSnapshot = {
      url,
      finalUrl: page.url(),
      status: response?.status() ?? null,
      // Copy: the listener keeps writing to `requests` during the consent check.
      requests: [...requests],
      cookies,
      links,
      resourceHints,
    };
    if (checkConsent && options.consentCheck !== false) {
      snapshot.consent = await observeConsent(page, context, requests, {
        settleMs: options.settleMs ?? DEFAULTS.settleMs,
        timeoutMs: options.timeoutMs ?? DEFAULTS.timeoutMs,
      });
    }
    return snapshot;
  } catch (error) {
    // Downloads, timeouts and crashed pages should not end the whole crawl.
    const message = error instanceof Error ? error.message : String(error);
    return {
      url,
      finalUrl: url,
      status: null,
      requests,
      cookies: [],
      links: [],
      resourceHints: [],
      error: message.split('\n')[0] ?? message,
    };
  } finally {
    await context.close();
  }
}
