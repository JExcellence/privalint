import { findProvider } from './data/providers.js';
import { findCdn, findEmbed } from './data/third-parties.js';
import { findTrackerByUrl } from './data/trackers.js';
import { observedRequests } from './observations.js';
import { FONT_SERVICES } from './rules/privacy-policy-vendors.js';
import type { PageSnapshot, RecordedRequest, ThirdPartyHost, ThirdPartyPhase } from './types.js';
import { hostMatches, isFirstParty, registrableDomain, safeHost } from './url.js';

/** More hosts than this are cut, the busiest kept. */
const MAX_HOSTS = 200;

/** The vendor privalint's lists know for a request, if any. */
function vendorOf(url: string): string | undefined {
  const host = safeHost(url) ?? '';
  return (
    findTrackerByUrl(url)?.vendor ??
    findEmbed(url)?.vendor ??
    FONT_SERVICES.find((font) => font.hosts.some((domain) => hostMatches(host, domain)))?.vendor ??
    findCdn(url)?.vendor ??
    findProvider(url)?.vendor
  );
}

/**
 * Every host outside the site that answered a request, before consent, after rejecting or after
 * saving the settings, on any scanned page. Only hosts are kept, never paths or query strings, so
 * the inventory carries no personal data from request addresses.
 */
export function thirdPartyInventory(
  pages: readonly PageSnapshot[],
  siteUrl: URL,
): ThirdPartyHost[] {
  const hosts = new Map<string, ThirdPartyHost>();
  const add = (
    page: PageSnapshot,
    phase: ThirdPartyPhase,
    requests: readonly RecordedRequest[],
  ) => {
    for (const request of observedRequests(requests)) {
      if (!/^https?:/i.test(request.url) || isFirstParty(request.url, siteUrl)) continue;
      const host = safeHost(request.url);
      if (host === undefined) continue;
      let entry = hosts.get(host);
      if (entry === undefined) {
        const vendor = vendorOf(request.url);
        entry = {
          host,
          site: registrableDomain(host) ?? host,
          ...(page.pageId === undefined ? {} : { firstPageId: page.pageId }),
          phases: [],
          requests: 0,
          ...(vendor === undefined ? {} : { vendor }),
        };
        hosts.set(host, entry);
      }
      entry.requests += 1;
      if (!entry.phases.includes(phase)) entry.phases.push(phase);
    }
  };
  for (const page of pages) {
    add(page, 'before-consent', page.requests);
    if (page.consent?.afterReject) add(page, 'after-reject', page.consent.afterReject.requests);
    const saved = page.consent?.settings?.afterSave;
    if (saved) add(page, 'after-settings', saved.requests);
    const closed = page.consent?.close?.afterClose;
    if (closed) add(page, 'after-close', closed.requests);
  }
  return [...hosts.values()]
    .sort((a, b) => b.requests - a.requests || a.host.localeCompare(b.host))
    .slice(0, MAX_HOSTS);
}
