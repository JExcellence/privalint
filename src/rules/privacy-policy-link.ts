import { say } from '../i18n.js';
import type { Rule } from '../types.js';
import { linkMatches, linksChecked } from './links.js';

const ID = 'privacy-policy-link';

const PRIVACY_POLICY =
  /datenschutz|privacy|data[\s_-]?protection|confidentialit|privacidad|protezione[\s_-]?dei[\s_-]?dati|privacybeleid|polityka[\s_-]?prywatno/i;

export const privacyPolicyLink: Rule = {
  id: ID,
  title: 'No link to a privacy policy',
  description:
    'Visitors must be told how their data is processed at the time it is collected. Since every ' +
    'page view already involves server logs, the privacy policy has to be reachable from every page.',
  references: ['Art. 12 GDPR', 'Art. 13 GDPR'],
  check({ page, lang }) {
    if (page.links.some(linkMatches(PRIVACY_POLICY))) {
      return [];
    }
    return [
      {
        ruleId: ID,
        severity: 'warning',
        message: say(lang, {
          en: 'No link to a privacy policy was found on this page.',
          de: 'Auf dieser Seite wurde kein Link zur Datenschutzerklärung gefunden.',
        }),
        pageUrl: page.finalUrl,
        evidence: [linksChecked(page.links.length, lang)],
        fix: say(lang, {
          en: 'Add a link labelled "Datenschutz" or "Datenschutzerklärung" next to the Impressum link in the footer.',
          de: 'Einen Link „Datenschutz“ oder „Datenschutzerklärung“ neben dem Impressum-Link in den Footer setzen.',
        }),
      },
    ];
  },
};
