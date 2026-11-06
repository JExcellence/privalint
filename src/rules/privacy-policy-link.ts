import { say } from '../i18n.js';
import type { Rule } from '../types.js';
import { legalLabels } from './legal-labels.js';
import { linkMatches, linksChecked } from './links.js';

const ID = 'privacy-policy-link';

export const PRIVACY_POLICY =
  /datenschutz|privacy|data[\s_-]?protection|confidentialit|privacidad|protezione[\s_-]?dei[\s_-]?dati|privacybeleid|polityka[\s_-]?prywatno|adatv[eé]del|adatkezel/i;

export const privacyPolicyLink: Rule = {
  id: ID,
  title: 'No link to a privacy policy',
  description:
    'Visitors must be told how their data is processed at the time it is collected. Since every ' +
    'page view already involves server logs, the privacy policy has to be reachable from every page.',
  references: ['Art. 12 GDPR', 'Art. 13 GDPR'],
  check({ page, lang, region = 'de' }) {
    if (page.links.some(linkMatches(PRIVACY_POLICY))) {
      return [];
    }
    const { notice, privacy } = legalLabels(page.language, region);
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
          en: `Add a link labelled "${privacy}" next to the "${notice}" link in the footer.`,
          de: `Einen Link „${privacy}“ neben dem Link „${notice}“ in den Footer setzen.`,
        }),
      },
    ];
  },
};
