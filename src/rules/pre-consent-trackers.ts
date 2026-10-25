import { findTrackerByCookie, findTrackerByUrl, type Tracker } from '../data/trackers.js';
import type { Finding, Rule } from '../types.js';

const ID = 'pre-consent-trackers';
const MAX_EVIDENCE = 5;

interface Hit {
  tracker: Tracker;
  evidence: Set<string>;
}

export const preConsentTrackers: Rule = {
  id: ID,
  title: 'Trackers run before consent',
  description:
    'Analytics, advertising and session-replay tools must not load or set cookies until the ' +
    'visitor has opted in. The page is loaded without interacting with any consent banner, so ' +
    'everything reported here happened before consent.',
  references: [
    '§ 25 Abs. 1 TDDDG',
    'Art. 5(3) ePrivacy Directive',
    'Art. 6(1)(a) GDPR',
    'CJEU C-673/17 (Planet49)',
  ],
  check({ page }) {
    const hits = new Map<string, Hit>();
    const record = (tracker: Tracker, evidence: string) => {
      const hit = hits.get(tracker.vendor) ?? { tracker, evidence: new Set<string>() };
      hit.evidence.add(evidence);
      hits.set(tracker.vendor, hit);
    };

    for (const request of page.requests) {
      const tracker = findTrackerByUrl(request.url);
      if (tracker !== undefined) {
        record(tracker, `request ${request.url}`);
      }
    }
    for (const cookie of page.cookies) {
      const tracker =
        findTrackerByCookie(cookie.name) ??
        findTrackerByUrl(`https://${cookie.domain.replace(/^\./, '')}/`);
      if (tracker !== undefined) {
        record(tracker, `cookie ${cookie.name} (${cookie.domain})`);
      }
    }

    return [...hits.values()].map(({ tracker, evidence }): Finding => {
      const isTagManager = tracker.category === 'tag-manager';
      return {
        ruleId: ID,
        severity: isTagManager ? 'warning' : 'error',
        message: isTagManager
          ? `${tracker.vendor} loads before consent. The container itself sends the visitor's IP address to a third party, and any tag it fires without a consent check is a violation.`
          : `${tracker.vendor} (${tracker.category}) runs before the visitor has given consent.`,
        pageUrl: page.finalUrl,
        evidence: [...evidence].slice(0, MAX_EVIDENCE),
        fix: `Only load ${tracker.vendor} after opt-in, for example by letting your consent manager inject it or by using it in a consent mode that sends no requests until consent is given.`,
      };
    });
  },
};
