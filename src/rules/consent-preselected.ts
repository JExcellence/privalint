import { say } from '../i18n.js';
import type { Rule } from '../types.js';

const ID = 'consent-preselected';

export const consentPreselected: Rule = {
  id: ID,
  title: 'Optional categories are switched on before the visitor chooses',
  description:
    'Opt-in check. Consent needs an active choice; a box ticked in advance is not one. privalint ' +
    'opens the settings layer of the consent banner on the start page and notes optional ' +
    'categories, or wider consent levels, that are already selected before anything is clicked. ' +
    'Switches that are disabled because they are strictly necessary are not counted.',
  references: ['Art. 4(11) GDPR', 'CJEU, 01.10.2019, C-673/17 (Planet49)'],
  requires: ['after-settings'],
  check({ page, lang }) {
    const settings = page.consent?.settings;
    const preselected = (settings?.preselected ?? []).filter((label) => label !== '');
    const count = settings?.preselected?.length ?? 0;
    if (count === 0) return [];
    const names = preselected.map((label) => `"${label}"`).join(', ');
    return [
      {
        ruleId: ID,
        severity: 'error',
        message: say(lang, {
          en: `${count} optional ${count === 1 ? 'category is' : 'categories are'} switched on in the cookie settings before the visitor chooses${names ? `: ${names}` : ''}.`,
          de: `In den Cookie-Einstellungen ${count === 1 ? 'ist 1 optionale Kategorie' : `sind ${count} optionale Kategorien`} schon vor der Wahl der Besucher eingeschaltet${names ? `: ${names}` : ''}.`,
        }),
        pageUrl: page.finalUrl,
        evidence: [
          ...(settings?.openLabel === undefined
            ? []
            : [
                say(lang, {
                  en: `settings opened with "${settings.openLabel}"`,
                  de: `Einstellungen über „${settings.openLabel}“ geöffnet`,
                }),
              ]),
          ...preselected,
        ],
        fix: say(lang, {
          en: 'Start every optional category switched off in the consent manager settings, so that only the visitor can switch it on.',
          de: 'In den Einstellungen des Consent-Tools jede optionale Kategorie ausgeschaltet starten lassen, damit nur Besucher sie einschalten.',
        }),
      },
    ];
  },
};
