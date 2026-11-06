import type { Browser } from 'playwright';
import type { NetworkAdapter } from './network.js';
import { crawlTarget, isFirstParty } from './url.js';

/** Fetches a text file of the site, or undefined when it isn't there (or isn't text). */
export type FetchText = (url: string) => Promise<string | undefined>;

/** Sitemaps read at most, an index and the sitemaps it lists counted together. */
const MAX_SITEMAPS = 4;
const MAX_BYTES = 5_000_000;
const MAX_URLS = 5_000;
const TIMEOUT_MS = 10_000;

/** Pages likely to hold forms, embeds or checkout steps, read first. */
const PRIORITY =
  /kontakt|contact|kapcsolat|newsletter|hirlevel|checkout|kasse|warenkorb|cart|kosar|penztar|anmeld|regist|signup|sign-up|login|konto|account|fiok|termin|booking|buchen|foglal|angebot|anfrage|quote/i;

/**
 * Pages of the site from its sitemaps (robots.txt `Sitemap:` lines, else /sitemap.xml, sitemap
 * indexes one level deep), spread over its sections: pages likely to hold forms come first, then
 * one page per top-level path in turn. Empty when the site has no sitemap privalint can read.
 */
export async function sitemapPages(
  siteUrl: URL,
  fetchText: FetchText,
  limit: number,
): Promise<string[]> {
  if (limit <= 0) return [];
  const robots = (await fetchText(new URL('/robots.txt', siteUrl).href)) ?? '';
  const declared = [...robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)]
    .map((match) => match[1] ?? '')
    .filter((url) => isFirstParty(url, siteUrl));
  const pending = declared.length > 0 ? declared : [new URL('/sitemap.xml', siteUrl).href];
  const urls: string[] = [];
  let read = 0;
  while (pending.length > 0 && read < MAX_SITEMAPS && urls.length < MAX_URLS) {
    const xml = await fetchText(pending.shift() as string);
    read += 1;
    if (xml === undefined) continue;
    const locations = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((match) =>
      decodeXml(match[1] ?? ''),
    );
    if (/<sitemapindex[\s>]/i.test(xml)) {
      pending.push(...locations.filter((url) => isFirstParty(url, siteUrl)));
    } else {
      urls.push(...locations.slice(0, MAX_URLS - urls.length));
    }
  }
  return choosePages(urls, siteUrl, limit);
}

/**
 * Up to `limit` distinct pages. First, likely form pages, the shallowest first and at most one per
 * section, for up to half the pages (at least one). Then the rest round-robin over sections. A
 * section is the directory a page sits in, so `/de/produkte/a` and `/de/produkte/b` share one
 * while `/de/kontakt` and `/de/blog/x` don't.
 */
export function choosePages(urls: readonly string[], siteUrl: URL, limit: number): string[] {
  const start = crawlTarget(siteUrl.href, siteUrl);
  const candidates = [
    ...new Set(urls.map((url) => crawlTarget(url, siteUrl)).filter((url) => url !== undefined)),
  ].filter((url) => url !== start);
  const sectionOf = (url: string) => new URL(url).pathname.replace(/\/[^/]*\/?$/, '');
  const depth = (url: string) => new URL(url).pathname.split('/').filter(Boolean).length;
  const chosen: string[] = [];
  const prioritySections = new Set<string>();
  const priority = candidates
    .filter((url) => PRIORITY.test(new URL(url).pathname))
    .sort((a, b) => depth(a) - depth(b));
  for (const url of priority) {
    if (chosen.length >= Math.max(1, Math.floor(limit / 2))) break;
    if (prioritySections.has(sectionOf(url))) continue;
    prioritySections.add(sectionOf(url));
    chosen.push(url);
  }
  const sections = new Map<string, string[]>();
  for (const url of candidates) {
    if (chosen.includes(url)) continue;
    sections.set(sectionOf(url), [...(sections.get(sectionOf(url)) ?? []), url]);
  }
  const queues = [...sections.values()];
  while (chosen.length < limit && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next !== undefined && chosen.length < limit) chosen.push(next);
    }
  }
  return chosen.slice(0, limit);
}

function decodeXml(text: string): string {
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}

/** Reads text files with the browser's request context, like the transport check. */
export function browserFetchText(browser: Browser): FetchText {
  return async (url) => {
    const context = await browser.newContext();
    try {
      const response = await context.request.get(url, {
        timeout: TIMEOUT_MS,
        maxRedirects: 3,
        failOnStatusCode: false,
      });
      if (response.status() !== 200) return undefined;
      const body = await response.body();
      return body.byteLength > MAX_BYTES ? undefined : body.toString('utf8');
    } catch {
      return undefined;
    } finally {
      await context.close();
    }
  };
}

/** Reads text files through the network adapter: one hop, no redirects followed. */
export function adapterFetchText(adapter: NetworkAdapter): FetchText {
  return async (url) => {
    try {
      const response = await adapter({
        url,
        method: 'GET',
        headers: {},
        body: null,
        resourceType: 'other',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.status !== 200 || response.body === undefined) return undefined;
      const body = response.body;
      if (typeof body === 'string') return body.length > MAX_BYTES ? undefined : body;
      if (body instanceof Uint8Array) {
        return body.byteLength > MAX_BYTES ? undefined : new TextDecoder().decode(body);
      }
      const chunks: Uint8Array[] = [];
      let size = 0;
      for await (const chunk of body) {
        size += chunk.byteLength;
        if (size > MAX_BYTES) return undefined;
        chunks.push(chunk);
      }
      return new TextDecoder().decode(Buffer.concat(chunks));
    } catch {
      return undefined;
    }
  };
}
