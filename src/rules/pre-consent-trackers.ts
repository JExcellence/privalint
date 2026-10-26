import type { Finding, Rule } from '../types.js';
import { findTrackerHits } from './tracker-hits.js';

const ID = 'pre-consent-trackers';

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
    return findTrackerHits(page.requests, page.cookies).map(({ tracker, evidence }): Finding => {
      const isTagManager = tracker.category === 'tag-manager';
      return {
        ruleId: ID,
        severity: isTagManager ? 'warning' : 'error',
        message: isTagManager
          ? `${tracker.vendor} loads before consent and sends the visitor's IP address to a third party.`
          : `${tracker.vendor} (${tracker.category}) runs before the visitor has given consent.`,
        pageUrl: page.finalUrl,
        subject: tracker.vendor,
        evidence,
        fix: `Only load ${tracker.vendor} after opt-in, for example by letting your consent manager inject it or by using it in a consent mode that sends no requests until consent is given.`,
      };
    });
  },
};
