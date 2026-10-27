import { say } from '../i18n.js';
import type { Rule } from '../types.js';

const ID = 'consent-settings-link';

export const consentSettingsLink: Rule = {
  id: ID,
  title: 'No way to reopen the cookie settings',
  description:
    'After the visitor rejected and the page reloaded, privalint looks for a visible link or ' +
    'button that reopens the consent settings, such as a "Cookie-Einstellungen" footer link or ' +
    'the floating button of the consent manager. Without one, a choice cannot be changed or ' +
    'withdrawn as easily as it was made.',
  references: ['Art. 7(3) GDPR'],
  check({ page, lang }) {
    const consent = page.consent;
    if (consent?.rejected !== true || consent.settingsControl?.found !== false) {
      return [];
    }
    const button = consent.rejectLabel ?? say(lang, { en: 'reject', de: 'Ablehnen' });
    const evidence = [
      say(lang, {
        en: `Checked after clicking "${button}" and reloading`,
        de: `Geprüft nach Klick auf „${button}“ und Neuladen`,
      }),
    ];
    if (consent.cmp !== undefined) {
      evidence.push(say(lang, { en: 'Consent manager: ', de: 'Consent-Tool: ' }) + consent.cmp);
    }
    return [
      {
        ruleId: ID,
        severity: 'warning',
        message: say(lang, {
          en: 'No link or button to reopen the cookie settings was found after rejecting.',
          de: 'Nach dem Ablehnen wurde kein Link und kein Button gefunden, der die Cookie-Einstellungen wieder öffnet.',
        }),
        pageUrl: page.finalUrl,
        evidence,
        fix: say(lang, {
          en:
            'Add a "Cookie settings" link to the footer of every page, or enable the floating ' +
            'button of your consent manager. Most offer a call for it, e.g. Cookiebot.renew(), ' +
            'UC_UI.showSecondLayer() (Usercentrics), Didomi.preferences.show() or the ' +
            'ot-sdk-show-settings class (OneTrust).',
          de:
            'Einen Link „Cookie-Einstellungen“ in den Footer jeder Seite setzen oder den ' +
            'schwebenden Button des Consent-Tools aktivieren. Die meisten bieten dafür einen ' +
            'Aufruf, z. B. Cookiebot.renew(), UC_UI.showSecondLayer() (Usercentrics), ' +
            'Didomi.preferences.show() oder die Klasse ot-sdk-show-settings (OneTrust).',
        }),
      },
    ];
  },
};
