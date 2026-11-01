import { say } from '../i18n.js';
import type { Finding, Rule, TcfObservation } from '../types.js';
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
  references: ['§ 25 Abs. 1 TDDDG', 'Art. 6(1)(a) GDPR'],
  requires: ['after-settings'],
  check({ page, lang }) {
    const settings = page.consent?.settings;
    const after = settings?.afterSave;
    if (after === undefined) {
      return [];
    }
    const button = settings?.saveLabel ?? say(lang, { en: 'save', de: 'Speichern' });
    const tcfFindings = settings?.tcf === undefined ? [] : tcfLeftOn(settings.tcf, button);
    const trackerFindings = findTrackerHits(after.requests, after.cookies, lang).map(
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
    return [...trackerFindings, ...tcfFindings];

    /**
     * What the TCF consent manager itself reports after "everything off". Stored consent ignores
     * the visitor's choice: an error. Legitimate interest alone is a warning, because TCF banners
     * keep the objection in a separate tab, and the law on it is less settled.
     */
    function tcfLeftOn(tcf: TcfObservation, saved: string): Finding[] {
      const evidence = [
        `TCF purpose consents: ${tcf.purposesOn.join(', ') || '-'}`,
        `TCF vendor consents: ${tcf.vendorConsents}`,
        `TCF legitimate-interest purposes: ${tcf.legitimateInterestsOn.join(', ') || '-'}`,
        `TCF legitimate-interest vendors: ${tcf.vendorLegitimateInterests}`,
      ];
      const base = { ruleId: ID, pageUrl: page.finalUrl, subject: TCF_SUBJECT, evidence };
      if (tcf.purposesOn.length > 0 || tcf.vendorConsents > 0) {
        return [
          {
            ...base,
            severity: 'error',
            message: say(lang, {
              en: `The consent manager still reports consent (IAB TCF) after switching off all categories and clicking "${saved}".`,
              de: `Das Consent-Tool meldet weiterhin Einwilligungen (IAB TCF), obwohl alle Kategorien abgewählt und „${saved}“ geklickt wurde.`,
            }),
            fix: say(lang, {
              en: 'Make sure the save button of the settings layer stores the switches as shown. Consent for TCF purposes and vendors must be off when the visitor switched everything off.',
              de: 'Sicherstellen, dass der Speichern-Button der Einstellungen die Schalter so speichert, wie sie angezeigt werden. Einwilligungen für TCF-Zwecke und -Anbieter müssen aus sein, wenn alles abgewählt wurde.',
            }),
          },
        ];
      }
      if (tcf.legitimateInterestsOn.length > 0 || tcf.vendorLegitimateInterests > 0) {
        return [
          {
            ...base,
            severity: 'warning',
            message: say(lang, {
              en: `After switching off all categories, the consent manager still processes data on the basis of legitimate interest (IAB TCF, purposes ${tcf.legitimateInterestsOn.join(', ') || '-'}).`,
              de: `Nach dem Abwählen aller Kategorien verarbeitet das Consent-Tool weiterhin Daten auf Grundlage berechtigten Interesses (IAB TCF, Zwecke ${tcf.legitimateInterestsOn.join(', ') || '-'}).`,
            }),
            fix: say(lang, {
              en: 'Show the objection to legitimate interest on the same layer as the category switches, or switch legitimate interest off together with them. Check whether these purposes may rely on legitimate interest at all.',
              de: 'Den Widerspruch gegen berechtigtes Interesse auf derselben Ebene wie die Kategorie-Schalter anbieten oder ihn zusammen mit ihnen abschalten. Prüfen, ob diese Zwecke überhaupt auf berechtigtes Interesse gestützt werden dürfen.',
            }),
          },
        ];
      }
      return [];
    }
  },
};

const TCF_SUBJECT = 'IAB TCF';
