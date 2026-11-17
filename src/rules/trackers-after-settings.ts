import { huArticle, say } from '../i18n.js';
import type { Finding, Rule } from '../types.js';
import { tcfFindings } from './tcf-findings.js';
import { categoryLabel, findTrackerHits, trackerFinding } from './tracker-hits.js';

const ID = 'trackers-after-settings';

export const trackersAfterSettings: Rule = {
  id: ID,
  title: 'Trackers run after the visitor switched everything off in the settings',
  description:
    'Opt-in check. privalint opens the settings layer of the consent banner on the start page ' +
    'in a fresh browser, switches off every optional category, saves, reloads the page and ' +
    'records what still loads. Anything on the tracker list that loads or sets new cookies ' +
    'after that ignores the visitor’s choice.',
  references: ['§ 25 Abs. 1 TDDDG', 'Art. 6(1)(a) GDPR'],
  requires: ['after-settings'],
  check({ page, lang }) {
    const settings = page.consent?.settings;
    const after = settings?.afterSave;
    if (after === undefined) {
      return [];
    }
    const button = settings?.saveLabel ?? say(lang, { en: 'save', de: 'Speichern', hu: 'mentés' });
    const tcf =
      settings?.tcf === undefined
        ? []
        : tcfFindings({
            tcf: settings.tcf,
            ruleId: ID,
            pageUrl: page.finalUrl,
            lang,
            action: {
              en: `switching off all categories and clicking "${button}"`,
              de: `alle Kategorien abgewählt und „${button}“ geklickt wurde`,
              hu: `az összes kategória kikapcsolása és ${huArticle(button)} „${button}” gombra kattintás után`,
            },
          });
    const trackerFindings = findTrackerHits(after.requests, after.cookies, lang, after.storage).map(
      (hit): Finding => {
        const { vendor } = hit.tracker;
        const category = categoryLabel(hit.tracker.category, lang);
        return {
          ruleId: ID,
          ...trackerFinding(hit, lang, {
            message: {
              en: `${vendor} (${category}) still runs after switching off all categories and clicking "${button}".`,
              de: `${vendor} (${category}) läuft weiter, obwohl alle Kategorien abgewählt und „${button}“ geklickt wurde.`,
              hu: `${huArticle(vendor, true)} ${vendor} (${category}) az összes kategória kikapcsolása és ${huArticle(button)} „${button}” gombra kattintás után is tovább fut.`,
            },
            grantedMessage: {
              en: `${vendor} tells Google that consent was granted, although all categories were switched off and "${button}" was clicked (Google Consent Mode).`,
              de: `${vendor} meldet Google eine erteilte Einwilligung, obwohl alle Kategorien abgewählt und „${button}“ geklickt wurde (Google Consent Mode).`,
              hu: `${huArticle(vendor, true)} ${vendor} megadott hozzájárulást jelez a Google-nek, pedig az összes kategóriát kikapcsolták és ${huArticle(button)} „${button}” gombra kattintottak (Google Consent Mode).`,
            },
            fix: {
              en: `Check that ${vendor} belongs to a category the visitor can switch off in your consent manager, and that saving the settings blocks it the same way rejecting does.`,
              de: `Prüfen, ob ${vendor} im Consent-Tool einer abwählbaren Kategorie zugeordnet ist und das Speichern der Einstellungen es genauso blockiert wie das Ablehnen.`,
              hu: `Ellenőrizze, hogy ${huArticle(vendor)} ${vendor} a hozzájárulás-kezelőben olyan kategóriába tartozik-e, amelyet a látogató kikapcsolhat, és hogy a beállítások mentése ugyanúgy blokkolja-e, mint az elutasítás.`,
            },
            grantedFix: {
              en: 'Make the consent manager update Google Consent Mode to "denied" for every switched-off category when the settings are saved, and check that no tag sets it to "granted" on its own.',
              de: 'Das Consent-Tool so einstellen, dass es Google Consent Mode beim Speichern für jede abgewählte Kategorie auf „denied“ setzt, und prüfen, dass kein Tag ihn selbst auf „granted“ setzt.',
              hu: 'Állítsa be a hozzájárulás-kezelőt úgy, hogy a beállítások mentésekor minden kikapcsolt kategóriánál „denied” értékre frissítse a Google Consent Mode-ot, és ellenőrizze, hogy egyetlen címke se állítsa magától „granted” értékre.',
            },
          }),
          pageUrl: page.finalUrl,
          subject: vendor,
          evidence: hit.evidence,
        };
      },
    );
    return [...trackerFindings, ...tcf];
  },
};
