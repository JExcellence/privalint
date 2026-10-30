import { getDomain } from 'tldts';

const SKIPPED_EXTENSIONS =
  /\.(pdf|zip|gz|rar|7z|jpe?g|png|gif|webp|avif|svg|ico|mp4|webm|mp3|wav|docx?|xlsx?|pptx?|csv|xml|json|txt)$/i;

export function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/**
 * Whether the URL belongs to the same site, meaning the same registrable domain (eTLD+1) per the
 * public suffix list bundled with `tldts`, private suffixes included. So `example.co.uk`,
 * `www.example.co.uk` and `shop.example.co.uk` are one site, while `a.github.io` and
 * `b.github.io` are two.
 *
 * Hosts without a registrable domain (IP addresses, `localhost`, single-label names, or a host
 * that is itself a public suffix such as `github.io`) only match the exact same host.
 */
export function isFirstParty(url: string, siteUrl: URL): boolean {
  const host = safeHost(url);
  if (host === undefined) {
    return false;
  }
  const siteHost = siteUrl.hostname;
  const domain = registrableDomain(host);
  const siteDomain = registrableDomain(siteHost);
  if (domain === null || siteDomain === null) {
    return host === siteHost;
  }
  return domain === siteDomain;
}

function registrableDomain(host: string): string | null {
  return getDomain(host, { allowPrivateDomains: true });
}

/** Anything listed by host, optionally narrowed to some paths. */
export interface HostPattern {
  /** Hostnames; subdomains match too. */
  domains: string[];
  /**
   * If set, only these paths count. A path ending in `/` matches everything below it,
   * otherwise it must match exactly or be followed by `/`.
   */
  paths?: string[];
}

/** Returns the first entry whose hosts and paths match the URL. */
export function findByUrl<T extends HostPattern>(
  entries: readonly T[],
  url: string,
): T | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  return entries.find(
    (entry) =>
      entry.domains.some((domain) => hostMatches(parsed.hostname, domain)) &&
      (entry.paths === undefined || entry.paths.some((path) => pathMatches(parsed.pathname, path))),
  );
}

function pathMatches(pathname: string, path: string): boolean {
  if (path.endsWith('/')) {
    return pathname.startsWith(path);
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function safeHost(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

export function withoutHash(url: string): string {
  const parsed = new URL(url);
  parsed.hash = '';
  return parsed.href;
}

/**
 * Returns a normalized URL to visit next, or `undefined` if the link should not be crawled.
 * Query strings are dropped so calendars and filter pages don't eat the page budget.
 */
export function crawlTarget(href: string, siteUrl: URL): string | undefined {
  let url: URL;
  try {
    url = new URL(href, siteUrl);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return undefined;
  }
  if (!isFirstParty(url.href, siteUrl) || SKIPPED_EXTENSIONS.test(url.pathname)) {
    return undefined;
  }
  url.hash = '';
  url.search = '';
  return url.href;
}
