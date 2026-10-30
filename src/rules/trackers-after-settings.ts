import { say } from '../i18n.js';
import type { Finding, Rule } from '../types.js';
import { categoryLabel, findTrackerHits } from './tracker-hits.js';

const ID = 'trackers-after-settings';

export const trackersAfterSettings: Rule = {
  id: ID,
  title: 'Trackers run after the visitor switched everything off in the settings',
  description:
    'Opt-in check. privalint opens the settings layer of the consent banner on the start page ' +
    'in a fresh browser, switches off every optional category, saves, reloads the page and ' +
    'records what still loads. Anything on the tracker list that loads or sets new cookies ' +
    'after that ignores the visitor’s choice.',
  references: ['§ 25 Abs. 1 TDDDG', 'Art. 6(1)(a) GDPR', 'Art. 7(3) GDPR'],
  requires: ['after-settings'],
  check({ page, lang }) {
    const settings = page.consent?.settings;
    const after = settings?.afterSave;
    if (after === undefined) {
      return [];
    }
    const button = settings?.saveLabel ?? say(lang, { en: 'save', de: 'Speichern' });
    return findTrackerHits(after.requests, after.cookies, lang).map(
      ({ tracker, evidence }): Finding => {
        const { vendor } = tracker;
        const category = categoryLabel(tracker.category, lang);
        return {
          ruleId: ID,
          // Same reasoning as trackers-after-reject: the container alone may be configured correctly.
          severity: tracker.category === 'tag-manager' ? 'warning' : 'error',
          message: say(lang, {
            en: `${vendor} (${category}) still runs after switching off all categories and clicking "${button}".`,
            de: `${vendor} (${category}) läuft weiter, obwohl alle Kategorien abgewählt und „${button}“ geklickt wurde.`,
          }),
          pageUrl: page.finalUrl,
          subject: vendor,
          evidence,
          fix: say(lang, {
            en: `Check that ${vendor} belongs to a category the visitor can switch off in your consent manager, and that saving the settings blocks it the same way rejecting does.`,
            de: `Prüfen, ob ${vendor} im Consent-Tool einer abwählbaren Kategorie zugeordnet ist und das Speichern der Einstellungen es genauso blockiert wie das Ablehnen.`,
          }),
        };
      },
    );
  },
};
