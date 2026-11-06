import { say } from '../i18n.js';
import type { Rule } from '../types.js';
import { LEGAL_NOTICE } from './impressum-link.js';
import { linkMatches } from './links.js';
import { PRIVACY_POLICY } from './privacy-policy-link.js';

const ID = 'banner-legal-links';

export const bannerLegalLinks: Rule = {
  id: ID,
  title: 'A blocking consent banner without links to the privacy policy and the Impressum',
  description:
    'A banner that covers the page or stops it from scrolling hides the footer while it is open. ' +
    'Visitors then can read neither the privacy policy nor the Impressum before they decide, ' +
    'unless the banner itself links them. Small banners that leave the page usable are not checked.',
  references: ['Art. 12 Abs. 1 DSGVO', 'Art. 13 DSGVO', '§ 5 DDG'],
  requires: ['consent'],
  check({ page, lang }) {
    const consent = page.consent;
    if (consent?.bannerBlocking !== true || consent.bannerLinks === undefined) return [];
    const links = consent.bannerLinks;
    const missing = [
      ...(links.some(linkMatches(PRIVACY_POLICY))
        ? []
        : [
            say(lang, {
              en: 'privacy policy',
              de: 'Datenschutzerklärung',
              hu: 'adatkezelési tájékoztató',
            }),
          ]),
      ...(links.some(linkMatches(LEGAL_NOTICE))
        ? []
        : [say(lang, { en: 'Impressum', de: 'Impressum', hu: 'impresszum' })]),
    ];
    if (missing.length === 0) return [];
    const list = missing.join(say(lang, { en: ' and ', de: ' und ', hu: ' és ' }));
    return [
      {
        ruleId: ID,
        severity: 'warning',
        message: say(lang, {
          en: `The consent banner blocks the page but doesn't link the ${list}.`,
          de: `Das Cookie-Banner blockiert die Seite, verlinkt aber nicht die ${list}.`,
          hu: `A sütibanner eltakarja az oldalt, de nem hivatkozik a következőkre: ${list}.`,
        }),
        pageUrl: page.finalUrl,
        evidence: [
          say(lang, {
            en: `${links.length} links inside the banner`,
            de: `${links.length} Links im Banner`,
            hu: `${links.length} hivatkozás a bannerben`,
          }),
          ...links.slice(0, 3).map((link) => `${link.text || '(no text)'} -> ${link.href}`),
        ],
        fix: say(lang, {
          en: 'Link the privacy policy and the Impressum in the banner itself, or make the banner small enough that the footer stays usable while it is open.',
          de: 'Datenschutzerklärung und Impressum direkt im Banner verlinken, oder das Banner so klein halten, dass der Footer nutzbar bleibt, solange es offen ist.',
          hu: 'Hivatkozzon az adatkezelési tájékoztatóra és az impresszumra magában a bannerben, vagy tegye a bannert olyan kicsivé, hogy nyitott állapotban is használható maradjon a lábléc.',
        }),
      },
    ];
  },
};
