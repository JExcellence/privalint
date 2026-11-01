import {
  type CookieTracker,
  findTrackerByCookie,
  findTrackerByUrl,
  type TrackerCategory,
} from '../data/trackers.js';
import { type Lang, say, type Text } from '../i18n.js';
import { observedRequests } from '../observations.js';
import type { RecordedCookie, RecordedRequest, StorageKey } from '../types.js';

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
): TrackerHit[] {
  const requestLabel = say(lang, { en: 'request', de: 'Anfrage' });
  const hits = new Map<string, { tracker: CookieTracker; evidence: Set<string> }>();
  const record = (tracker: CookieTracker, evidence: string) => {
    const hit = hits.get(tracker.vendor) ?? { tracker, evidence: new Set<string>() };
    hit.evidence.add(evidence);
    hits.set(tracker.vendor, hit);
  };

  for (const request of observedRequests(requests)) {
    const tracker = findTrackerByUrl(request.url);
    if (tracker !== undefined) {
      record(tracker, `${requestLabel} ${request.url}`);
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
  analytics: { en: 'analytics', de: 'Analyse' },
  advertising: { en: 'advertising', de: 'Werbung' },
  'session-replay': { en: 'session-replay', de: 'Session-Replay' },
  social: { en: 'social', de: 'Social Media' },
  'marketing-automation': { en: 'marketing-automation', de: 'Marketing-Automatisierung' },
  'tag-manager': { en: 'tag-manager', de: 'Tag-Manager' },
};

export const categoryLabel = (category: TrackerCategory, lang: Lang) =>
  say(lang, CATEGORY_LABELS[category]);
