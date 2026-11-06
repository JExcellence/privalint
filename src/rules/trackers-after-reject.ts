import { huArticle, say } from '../i18n.js';
import type { Finding, Rule } from '../types.js';
import { tcfFindings } from './tcf-findings.js';
import { categoryLabel, findTrackerHits } from './tracker-hits.js';

const ID = 'trackers-after-reject';

export const trackersAfterReject: Rule = {
  id: ID,
  title: 'Trackers run after the visitor rejected them',
  description:
    'privalint clicks the reject button of the consent banner on the start page, reloads the ' +
    'page and records what still loads. Anything on the tracker list that loads or sets new ' +
    'cookies after that ignores the visitor’s explicit refusal.',
  references: ['§ 25 Abs. 1 TDDDG', 'Art. 6(1)(a) GDPR'],
  check({ page, lang }) {
    const after = page.consent?.afterReject;
    if (after === undefined) {
      return [];
    }
    const button =
      page.consent?.rejectLabel ?? say(lang, { en: 'reject', de: 'Ablehnen', hu: 'elutasítás' });
    const tcf =
      page.consent?.tcf === undefined
        ? []
        : tcfFindings({
            tcf: page.consent.tcf,
            ruleId: ID,
            pageUrl: page.finalUrl,
            lang,
            action: {
              en: `clicking "${button}"`,
              de: `„${button}“ geklickt wurde`,
              hu: `${huArticle(button)} „${button}” gombra kattintás után`,
            },
          });
    const trackerFindings = findTrackerHits(after.requests, after.cookies, lang, after.storage).map(
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
            hu: `${huArticle(vendor, true)} ${vendor} (${category}) ${huArticle(button)} „${button}” gombra kattintás után is tovább fut.`,
          }),
          pageUrl: page.finalUrl,
          subject: vendor,
          evidence,
          fix: say(lang, {
            en: `Check that ${vendor} is assigned to a consent category in your consent manager and that the category is blocked when the visitor rejects.`,
            de: `Prüfen, ob ${vendor} im Consent-Tool einer Kategorie zugeordnet ist und diese Kategorie beim Ablehnen blockiert wird.`,
            hu: `Ellenőrizze, hogy ${huArticle(vendor)} ${vendor} a hozzájárulás-kezelőben hozzá van-e rendelve egy hozzájárulási kategóriához, és hogy ez a kategória blokkolva van-e, amikor a látogató elutasít.`,
          }),
        };
      },
    );
    return [...trackerFindings, ...tcf];
  },
};
