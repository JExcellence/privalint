import { huArticle, say } from '../i18n.js';
import type { Finding, Rule } from '../types.js';
import { tcfFindings } from './tcf-findings.js';
import { categoryLabel, findTrackerHits, trackerFinding } from './tracker-hits.js';

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
    const trackerFindings = findTrackerHits(
      after.requests,
      after.cookies,
      lang,
      after.storage,
      page.cnameCloaks,
    ).map((hit): Finding => {
      const { vendor } = hit.tracker;
      const category = categoryLabel(hit.tracker.category, lang);
      return {
        ruleId: ID,
        ...trackerFinding(hit, lang, {
          message: {
            en: `${vendor} (${category}) still runs after clicking "${button}".`,
            de: `${vendor} (${category}) läuft weiter, obwohl „${button}“ geklickt wurde.`,
            hu: `${huArticle(vendor, true)} ${vendor} (${category}) ${huArticle(button)} „${button}” gombra kattintás után is tovább fut.`,
          },
          deniedMessage: {
            en: `${vendor} (${category}) still sends Google Consent Mode pings after clicking "${button}".`,
            de: `${vendor} (${category}) sendet weiter Google-Consent-Mode-Pings, obwohl „${button}“ geklickt wurde.`,
            hu: `${huArticle(vendor, true)} ${vendor} (${category}) ${huArticle(button)} „${button}” gombra kattintás után is Google Consent Mode pingeket küld.`,
          },
          grantedMessage: {
            en: `${vendor} tells Google that consent was granted, although the visitor clicked "${button}" (Google Consent Mode).`,
            de: `${vendor} meldet Google eine erteilte Einwilligung, obwohl „${button}“ geklickt wurde (Google Consent Mode).`,
            hu: `${huArticle(vendor, true)} ${vendor} megadott hozzájárulást jelez a Google-nek, pedig a látogató ${huArticle(button)} „${button}” gombra kattintott (Google Consent Mode).`,
          },
          fix: {
            en: `Check that ${vendor} is assigned to a consent category in your consent manager and that the category is blocked when the visitor rejects.`,
            de: `Prüfen, ob ${vendor} im Consent-Tool einer Kategorie zugeordnet ist und diese Kategorie beim Ablehnen blockiert wird.`,
            hu: `Ellenőrizze, hogy ${huArticle(vendor)} ${vendor} a hozzájárulás-kezelőben hozzá van-e rendelve egy hozzájárulási kategóriához, és hogy ez a kategória blokkolva van-e, amikor a látogató elutasít.`,
          },
          grantedFix: {
            en: 'Make the consent manager update Google Consent Mode to "denied" for every storage type when the visitor rejects, and check that no tag sets it to "granted" on its own.',
            de: 'Das Consent-Tool so einstellen, dass es Google Consent Mode beim Ablehnen für alle Speicherarten auf „denied“ setzt, und prüfen, dass kein Tag ihn selbst auf „granted“ setzt.',
            hu: 'Állítsa be a hozzájárulás-kezelőt úgy, hogy elutasításkor minden tárolási típusnál „denied” értékre frissítse a Google Consent Mode-ot, és ellenőrizze, hogy egyetlen címke se állítsa magától „granted” értékre.',
          },
        }),
        pageUrl: page.finalUrl,
        subject: vendor,
        evidence: hit.evidence,
      };
    });
    return [...trackerFindings, ...tcf];
  },
};
