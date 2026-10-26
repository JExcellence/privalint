import { say } from '../i18n.js';
import type { Finding, Rule } from '../types.js';
import { categoryLabel, findTrackerHits } from './tracker-hits.js';

const ID = 'trackers-after-reject';

export const trackersAfterReject: Rule = {
  id: ID,
  title: 'Trackers run after the visitor rejected them',
  description:
    'privalint clicks the reject button of the consent banner on the start page, reloads the ' +
    'page and records what still loads. Anything on the tracker list that loads or sets new ' +
    'cookies after that ignores the visitor’s explicit refusal.',
  references: ['§ 25 Abs. 1 TDDDG', 'Art. 6(1)(a) GDPR', 'Art. 7(3) GDPR'],
  check({ page, lang }) {
    const after = page.consent?.afterReject;
    if (after === undefined) {
      return [];
    }
    const button = page.consent?.rejectLabel ?? say(lang, { en: 'reject', de: 'Ablehnen' });
    return findTrackerHits(after.requests, after.cookies, lang).map(
      ({ tracker, evidence }): Finding => {
        const { vendor } = tracker;
        const category = categoryLabel(tracker.category, lang);
        return {
          ruleId: ID,
          // Same reasoning as pre-consent-trackers: the container alone may be configured correctly.
          severity: tracker.category === 'tag-manager' ? 'warning' : 'error',
          message: say(lang, {
            en: `${vendor} (${category}) still runs after clicking "${button}".`,
            de: `${vendor} (${category}) läuft weiter, obwohl „${button}“ geklickt wurde.`,
          }),
          pageUrl: page.finalUrl,
          subject: vendor,
          evidence,
          fix: say(lang, {
            en: `Check that ${vendor} is assigned to a consent category in your consent manager and that the category is blocked when the visitor rejects.`,
            de: `Prüfen, ob ${vendor} im Consent-Tool einer Kategorie zugeordnet ist und diese Kategorie beim Ablehnen blockiert wird.`,
          }),
        };
      },
    );
  },
};
