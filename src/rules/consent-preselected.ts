import { plPlural, say } from '../i18n.js';
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
          hu: `A sütibeállításokban ${count} választható kategória már a látogató döntése előtt be van kapcsolva${names ? `: ${names}` : ''}.`,
          fr: `${count} ${count <= 1 ? 'catégorie facultative est activée' : 'catégories facultatives sont activées'} dans les paramètres des cookies avant que le visiteur ne choisisse${names ? ` : ${names}` : ''}.`,
          it: `${count} ${count === 1 ? 'categoria facoltativa è attivata' : 'categorie facoltative sono attivate'} nelle impostazioni dei cookie prima che il visitatore scelga${names ? `: ${names}` : ''}.`,
          es: `${count} ${count === 1 ? 'categoría opcional está activada' : 'categorías opcionales están activadas'} en la configuración de cookies antes de que el visitante elija${names ? `: ${names}` : ''}.`,
          pl: `${count} ${plPlural(count, 'opcjonalna kategoria jest włączona', 'opcjonalne kategorie są włączone', 'opcjonalnych kategorii jest włączonych')} w ustawieniach cookies, zanim odwiedzający dokona wyboru${names ? `: ${names}` : ''}.`,
        }),
        pageUrl: page.finalUrl,
        evidence: [
          ...(settings?.openLabel === undefined
            ? []
            : [
                say(lang, {
                  en: `settings opened with "${settings.openLabel}"`,
                  de: `Einstellungen über „${settings.openLabel}“ geöffnet`,
                  hu: `beállítások megnyitva ezzel: „${settings.openLabel}”`,
                  fr: `paramètres ouverts avec « ${settings.openLabel} »`,
                  it: `impostazioni aperte con «${settings.openLabel}»`,
                  es: `configuración abierta con «${settings.openLabel}»`,
                  pl: `ustawienia otwarte przyciskiem „${settings.openLabel}”`,
                }),
              ]),
          ...preselected,
        ],
        fix: say(lang, {
          en: 'Start every optional category switched off in the consent manager settings, so that only the visitor can switch it on.',
          de: 'In den Einstellungen des Consent-Tools jede optionale Kategorie ausgeschaltet starten lassen, damit nur Besucher sie einschalten.',
          hu: 'A hozzájárulás-kezelő beállításaiban minden választható kategória kikapcsolva induljon, hogy csak a látogató kapcsolhassa be.',
          fr: "Désactivez par défaut chaque catégorie facultative dans les paramètres du gestionnaire de consentement, pour que seul le visiteur puisse l'activer.",
          it: 'Lascia disattivata in partenza ogni categoria facoltativa nelle impostazioni del gestore del consenso, in modo che solo il visitatore possa attivarla.',
          es: 'Deja todas las categorías opcionales desactivadas de inicio en la configuración del gestor de consentimiento, para que solo el visitante pueda activarlas.',
          pl: 'Ustaw wszystkie opcjonalne kategorie w menedżerze zgód domyślnie jako wyłączone, tak aby tylko odwiedzający mógł je włączyć.',
        }),
      },
    ];
  },
};
