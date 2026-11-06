import { resolveCname } from 'node:dns/promises';
import { findTrackerByUrl, type TrackerCategory } from './data/trackers.js';
import type { CnameCloak, PageSnapshot } from './types.js';
import { hostMatches, isFirstParty, safeHost } from './url.js';

/** Resolves the CNAME records of a host; empty when it has none. */
export type CnameResolver = (host: string) => Promise<string[]>;

/**
 * Tracker domains first-party subdomains are CNAMEd to, from AdGuard's MIT-licensed
 * cname-trackers list (data/combined_original_trackers.txt, updated 2026-11-05):
 * https://github.com/AdguardTeam/cname-trackers
 */
const CLOAKING_TARGETS: ReadonlyArray<{
  vendor: string;
  category: TrackerCategory;
  domains: string[];
}> = [
  {
    vendor: 'Adobe Experience Cloud',
    category: 'analytics',
    domains: ['2o7.net', 'data.adobedc.net', 'sc.adobedc.net', 'sc.omtrdc.net'],
  },
  { vendor: 'Eulerian', category: 'analytics', domains: ['eulerian.net'] },
  { vendor: 'Criteo', category: 'advertising', domains: ['dnsdelegation.io', 'storetail.io'] },
  { vendor: 'Keyade', category: 'advertising', domains: ['k.keyade.com'] },
  { vendor: 'AT Internet', category: 'analytics', domains: ['at-o.net'] },
  { vendor: 'Commanders Act', category: 'tag-manager', domains: ['tagcommander.com'] },
  { vendor: 'Oracle Eloqua', category: 'marketing-automation', domains: ['t.eloqua.com'] },
  { vendor: 'Wizaly', category: 'analytics', domains: ['wizaly.com'] },
  { vendor: 'Ingenious Technologies', category: 'advertising', domains: ['affex.org'] },
  { vendor: 'Pardot', category: 'marketing-automation', domains: ['go.pardot.com'] },
];

const MAX_HOSTS = 20;
const MAX_HOPS = 5;
const TIMEOUT_MS = 3_000;

export const systemResolver: CnameResolver = (host) => resolveCname(host);

function trackerFor(host: string): { vendor: string; category: TrackerCategory } | undefined {
  const cloaking = CLOAKING_TARGETS.find((target) =>
    target.domains.some((domain) => hostMatches(host, domain)),
  );
  if (cloaking !== undefined) return cloaking;
  const tracker = findTrackerByUrl(`https://${host}/`);
  return tracker === undefined || tracker.proxied ? undefined : tracker;
}

/** The CNAME chain of `host`, at most five hops; empty on any DNS error or timeout. */
async function chainOf(host: string, resolve: CnameResolver): Promise<string[]> {
  const chain: string[] = [];
  let current = host;
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const next = await Promise.race([
      resolve(current).catch(() => [] as string[]),
      new Promise<string[]>((done) => setTimeout(() => done([]), TIMEOUT_MS).unref()),
    ]);
    const target = next[0]?.replace(/\.$/, '').toLowerCase();
    if (target === undefined || target === '' || chain.includes(target)) break;
    chain.push(target);
    current = target;
  }
  return chain;
}

/**
 * First-party subdomains (other than the scanned host) that requests went to, resolved to their
 * CNAME chain. A chain that reaches a tracker domain is a cloaked tracker: its requests and
 * cookies look first-party. Each affected page gets the matches in `cnameCloaks`.
 */
export async function findCnameCloaks(
  pages: readonly PageSnapshot[],
  siteUrl: URL,
  resolve: CnameResolver = systemResolver,
): Promise<void> {
  const hosts = new Set<string>();
  for (const page of pages) {
    for (const request of page.requests) {
      const host = safeHost(request.url);
      if (host === undefined || host === siteUrl.hostname) continue;
      if (isFirstParty(request.url, siteUrl) && hosts.size < MAX_HOSTS) hosts.add(host);
    }
  }
  const cloaks = new Map<string, CnameCloak>();
  for (const host of hosts) {
    const chain = await chainOf(host, resolve);
    const hit = chain.map((hop) => trackerFor(hop)).find((tracker) => tracker !== undefined);
    if (hit !== undefined) {
      cloaks.set(host, { host, chain, vendor: hit.vendor, category: hit.category });
    }
  }
  if (cloaks.size === 0) return;
  for (const page of pages) {
    const used = [...cloaks.values()].filter((cloak) =>
      page.requests.some((request) => safeHost(request.url) === cloak.host),
    );
    if (used.length > 0) page.cnameCloaks = used;
  }
}
