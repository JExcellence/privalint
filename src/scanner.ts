import { type Browser, chromium } from 'playwright';
import { defaultRules } from './rules/index.js';
import type { Finding, PageSnapshot, Rule, ScanResult } from './types.js';
import { crawlTarget, isFirstParty } from './url.js';

export interface ScanOptions {
  /** Maximum number of same-host pages to visit, starting with the given URL. */
  maxPages?: number | undefined;
  /** Extra time to wait after the network is idle, to catch delayed tags. */
  settleMs?: number | undefined;
  /** Navigation timeout per page. */
  timeoutMs?: number | undefined;
  locale?: string | undefined;
  rules?: readonly Rule[];
  /**
   * Answer every third-party request with an empty response instead of fetching it.
   * Requests are still recorded. Used by the test suite to stay off the network.
   */
  offline?: boolean;
  onPage?: (snapshot: PageSnapshot) => void;
}

const DEFAULTS = {
  maxPages: 1,
  settleMs: 2_000,
  timeoutMs: 30_000,
  locale: 'de-DE',
} satisfies ScanOptions;

export async function scan(target: string, options: ScanOptions = {}): Promise<ScanResult> {
  const startedAt = Date.now();
  const rules = options.rules ?? defaultRules;
  const maxPages = Math.max(1, options.maxPages ?? DEFAULTS.maxPages);
  let siteUrl = new URL(target);

  const browser = await chromium.launch();
  try {
    const snapshots: PageSnapshot[] = [];
    const queue = [siteUrl.href];
    const seen = new Set(queue);

    let url = queue.shift();
    while (url !== undefined && snapshots.length < maxPages) {
      const snapshot = await capturePage(browser, url, siteUrl, options);
      if (snapshots.length === 0) {
        // Follow redirects like http -> https or apex -> www for the rest of the crawl.
        siteUrl = new URL(snapshot.finalUrl);
      }
      snapshots.push(snapshot);
      options.onPage?.(snapshot);

      for (const link of snapshot.links) {
        const next = crawlTarget(link.href, siteUrl);
        if (next !== undefined && !seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
      url = queue.shift();
    }

    // Error pages are listed in the result but not linted.
    const findings: Finding[] = snapshots
      .filter((page) => page.status === null || page.status < 400)
      .flatMap((page) => rules.flatMap((rule) => rule.check({ siteUrl, page })));

    return {
      siteUrl: siteUrl.href,
      scannedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
      pages: snapshots.map((page) => ({
        url: page.url,
        finalUrl: page.finalUrl,
        status: page.status,
        requestCount: page.requests.length,
        cookieCount: page.cookies.length,
      })),
      findings,
      rules: rules.map(({ check: _check, ...meta }) => meta),
    };
  } finally {
    await browser.close();
  }
}

async function capturePage(
  browser: Browser,
  url: string,
  siteUrl: URL,
  options: ScanOptions,
): Promise<PageSnapshot> {
  // A fresh context per page means no cookies or storage carry over:
  // every page is seen the way a first-time visitor sees it.
  const context = await browser.newContext({ locale: options.locale ?? DEFAULTS.locale });
  try {
    if (options.offline) {
      await context.route('**/*', (route) =>
        isFirstParty(route.request().url(), siteUrl)
          ? route.continue()
          : route.fulfill({ status: 200, body: '' }),
      );
    }

    const page = await context.newPage();
    const requests: PageSnapshot['requests'] = [];
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

    return {
      url,
      finalUrl: page.url(),
      status: response?.status() ?? null,
      requests,
      cookies,
      links,
      resourceHints,
    };
  } finally {
    await context.close();
  }
}
