import type { Finding, Rule } from '../types.js';
import { findTrackerHits } from './tracker-hits.js';

const ID = 'trackers-after-reject';

export const trackersAfterReject: Rule = {
  id: ID,
  title: 'Trackers run after the visitor rejected them',
  description:
    'privalint clicks the reject button of the consent banner on the start page, reloads the ' +
    'page and records what still loads. Anything on the tracker list that loads or sets new ' +
    'cookies after that ignores the visitor’s explicit refusal.',
  references: ['§ 25 Abs. 1 TDDDG', 'Art. 6(1)(a) GDPR', 'Art. 7(3) GDPR'],
  check({ page }) {
    const after = page.consent?.afterReject;
    if (after === undefined) {
      return [];
    }
    return findTrackerHits(after.requests, after.cookies).map(
      ({ tracker, evidence }): Finding => ({
        ruleId: ID,
        // Same reasoning as pre-consent-trackers: the container alone may be configured correctly.
        severity: tracker.category === 'tag-manager' ? 'warning' : 'error',
        message: `${tracker.vendor} (${tracker.category}) still runs after clicking "${page.consent?.rejectLabel ?? 'reject'}".`,
        pageUrl: page.finalUrl,
        subject: tracker.vendor,
        evidence,
        fix: `Check that ${tracker.vendor} is assigned to a consent category in your consent manager and that the category is blocked when the visitor rejects.`,
      }),
    );
  },
};
