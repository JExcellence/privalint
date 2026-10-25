const SKIPPED_EXTENSIONS =
  /\.(pdf|zip|gz|rar|7z|jpe?g|png|gif|webp|avif|svg|ico|mp4|webm|mp3|wav|docx?|xlsx?|pptx?|csv|xml|json|txt)$/i;

export function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/**
 * Treats `example.com`, `www.example.com` and `cdn.example.com` as the same site.
 * This is a simplification: it does not consult the public suffix list, so
 * sibling subdomains on shared hosts (e.g. `*.github.io`) count as first party.
 */
export function isFirstParty(url: string, siteUrl: URL): boolean {
  const host = safeHost(url);
  if (host === undefined) {
    return false;
  }
  const siteHost = siteUrl.hostname.replace(/^www\./, '');
  return hostMatches(host, siteHost) || hostMatches(siteHost, host);
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
