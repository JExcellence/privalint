import {
  type CookieTracker,
  findTrackerByCookie,
  findTrackerByUrl,
  type TrackerCategory,
} from '../data/trackers.js';
import { huArticle, type Lang, say, type Text } from '../i18n.js';
import { observedRequests } from '../observations.js';
import type { CnameCloak, RecordedCookie, RecordedRequest, StorageKey } from '../types.js';
import { safeHost } from '../url.js';

const MAX_EVIDENCE = 5;

export interface TrackerHit {
  /** A full tracker for host matches; cookie matches from the generated list have no hosts. */
  tracker: CookieTracker;
  /** Up to five request URLs, cookie names and storage keys, deduplicated. */
  evidence: string[];
}

/**
 * Matches requests, cookies and Web Storage keys against the tracker list, grouped by vendor.
 * Storage keys are looked up like first-party cookies: the vendors and the Open Cookie Database
 * use the same names for both ("cookie / data key").
 */
export function findTrackerHits(
  requests: readonly RecordedRequest[],
  cookies: readonly RecordedCookie[],
  lang: Lang,
  storage: readonly StorageKey[] = [],
  cloaks: readonly CnameCloak[] = [],
): TrackerHit[] {
  const requestLabel = say(lang, { en: 'request', de: 'Anfrage', hu: 'kérés' });
  const hits = new Map<string, { tracker: CookieTracker; evidence: Set<string> }>();
  const record = (tracker: CookieTracker, evidence: string) => {
    const hit = hits.get(tracker.vendor) ?? { tracker, evidence: new Set<string>() };
    hit.evidence.add(evidence);
    hits.set(tracker.vendor, hit);
  };

  for (const request of observedRequests(requests)) {
    const cloak = cloaks.find((entry) => entry.host === safeHost(request.url));
    if (cloak !== undefined) {
      // A first-party subdomain that is a CNAME to a tracker: the tracker, behind the site's name.
      record(
        { vendor: cloak.vendor, category: cloak.category },
        `${requestLabel} ${request.url} (CNAME ${[cloak.host, ...cloak.chain].join(' → ')})`,
      );
      continue;
    }
    const tracker = findTrackerByUrl(request.url);
    if (tracker !== undefined) {
      const proxied = tracker.proxied
        ? say(lang, {
            en: ` (proxied through ${new URL(request.url).hostname})`,
            de: ` (über ${new URL(request.url).hostname} weitergeleitet)`,
            hu: ` (${huArticle(new URL(request.url).hostname)} ${new URL(request.url).hostname} kiszolgálón keresztül továbbítva)`,
          })
        : '';
      record(tracker, `${requestLabel} ${request.url}${proxied}`);
    }
  }
  for (const cookie of cookies) {
    const tracker = findTrackerByCookie(cookie.name, cookie.domain);
    if (tracker !== undefined) {
      record(tracker, `cookie ${cookie.name} (${cookie.domain})`);
    }
  }
  for (const { area, name } of storage) {
    const tracker = findTrackerByCookie(name);
    if (tracker !== undefined) {
      record(tracker, `${area === 'local' ? 'localStorage' : 'sessionStorage'} ${name}`);
    }
  }

  return [...hits.values()].map(({ tracker, evidence }) => ({
    tracker,
    evidence: [...evidence].slice(0, MAX_EVIDENCE),
  }));
}

const CATEGORY_LABELS: Record<TrackerCategory, Text> = {
  analytics: { en: 'analytics', de: 'Analyse', hu: 'analitika' },
  advertising: { en: 'advertising', de: 'Werbung', hu: 'hirdetés' },
  'session-replay': { en: 'session-replay', de: 'Session-Replay', hu: 'munkamenet-visszajátszás' },
  fingerprinting: { en: 'fingerprinting', de: 'Fingerprinting', hu: 'ujjlenyomat-azonosítás' },
  social: { en: 'social', de: 'Social Media', hu: 'közösségi média' },
  'marketing-automation': {
    en: 'marketing-automation',
    de: 'Marketing-Automatisierung',
    hu: 'marketingautomatizálás',
  },
  'tag-manager': { en: 'tag-manager', de: 'Tag-Manager', hu: 'címkekezelő' },
};

export const categoryLabel = (category: TrackerCategory, lang: Lang) =>
  say(lang, CATEGORY_LABELS[category]);
