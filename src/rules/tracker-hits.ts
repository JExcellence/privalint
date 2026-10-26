import { findTrackerByCookie, findTrackerByUrl, type Tracker } from '../data/trackers.js';
import type { RecordedCookie, RecordedRequest } from '../types.js';

const MAX_EVIDENCE = 5;

export interface TrackerHit {
  tracker: Tracker;
  /** Up to five request URLs and cookie names, deduplicated. */
  evidence: string[];
}

/** Matches requests and cookies against the tracker list, grouped by vendor. */
export function findTrackerHits(
  requests: readonly RecordedRequest[],
  cookies: readonly RecordedCookie[],
): TrackerHit[] {
  const hits = new Map<string, { tracker: Tracker; evidence: Set<string> }>();
  const record = (tracker: Tracker, evidence: string) => {
    const hit = hits.get(tracker.vendor) ?? { tracker, evidence: new Set<string>() };
    hit.evidence.add(evidence);
    hits.set(tracker.vendor, hit);
  };

  for (const request of requests) {
    const tracker = findTrackerByUrl(request.url);
    if (tracker !== undefined) {
      record(tracker, `request ${request.url}`);
    }
  }
  for (const cookie of cookies) {
    const tracker =
      findTrackerByCookie(cookie.name) ??
      findTrackerByUrl(`https://${cookie.domain.replace(/^\./, '')}/`);
    if (tracker !== undefined) {
      record(tracker, `cookie ${cookie.name} (${cookie.domain})`);
    }
  }

  return [...hits.values()].map(({ tracker, evidence }) => ({
    tracker,
    evidence: [...evidence].slice(0, MAX_EVIDENCE),
  }));
}
