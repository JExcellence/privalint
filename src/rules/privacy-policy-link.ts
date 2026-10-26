import type { Rule } from '../types.js';
import { linkMatches } from './links.js';

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
  check({ page }) {
    if (page.links.some(linkMatches(PRIVACY_POLICY))) {
      return [];
    }
    return [
      {
        ruleId: ID,
        severity: 'warning',
        message: 'No link to a privacy policy was found on this page.',
        pageUrl: page.finalUrl,
        evidence: [`${page.links.length} links checked`],
        fix: 'Add a link labelled "Datenschutz" or "Datenschutzerklärung" next to the Impressum link in the footer.',
      },
    ];
  },
};
