import { say } from '../i18n.js';
import type { Rule } from '../types.js';
import { linkMatches, linksChecked } from './links.js';

const ID = 'impressum-link';

/**
 * Link texts and URL slugs used for a legal notice across the EU.
 * Matched against the visible text and the URL path, so `/impressum`
 * behind an icon-only link is still found.
 */
const LEGAL_NOTICE =
  /impressum|imprint|legal[\s_-]?notice|site[\s_-]?notice|anbieterkennzeichnung|mentions[\s_-]?l[eé]gales|aviso[\s_-]?legal|note[\s_-]?legali|colofon|informacje[\s_-]?prawne|impresszum/i;

const CONTACT = /kontakt|contact/i;

export const impressumLink: Rule = {
  id: ID,
  title: 'No link to an Impressum',
  description:
    'Commercial websites in Germany must provide a legal notice that is easy to recognise, ' +
    'directly reachable and always available, which in practice means a link on every page. ' +
    'Disable this rule for purely private sites or sites outside its scope.',
  references: ['§ 5 DDG', 'BGH, 20.07.2006, Az. I ZR 228/03'],
  check({ page, lang }) {
    if (page.links.some(linkMatches(LEGAL_NOTICE))) {
      return [];
    }

    const contact = page.links.find(linkMatches(CONTACT));
    if (contact !== undefined) {
      return [
        {
          ruleId: ID,
          severity: 'info',
          message: say(lang, {
            en: 'No direct Impressum link, only a contact link.',
            de: 'Kein direkter Impressum-Link, nur ein Kontakt-Link.',
          }),
          pageUrl: page.finalUrl,
          evidence: [say(lang, { en: 'contact link: ', de: 'Kontakt-Link: ' }) + contact.href],
          fix: say(lang, {
            en: 'Two clicks via "Kontakt" can be enough if the Impressum is clearly linked from there (BGH I ZR 228/03), but a direct "Impressum" link next to it is safer.',
            de: 'Zwei Klicks über „Kontakt“ können reichen, wenn das Impressum dort klar verlinkt ist (BGH I ZR 228/03). Sicherer ist ein direkter Link „Impressum“ daneben.',
          }),
        },
      ];
    }

    return [
      {
        ruleId: ID,
        severity: 'warning',
        message: say(lang, {
          en: 'No link to an Impressum or legal notice was found on this page.',
          de: 'Auf dieser Seite wurde kein Link zu einem Impressum gefunden.',
        }),
        pageUrl: page.finalUrl,
        evidence: [linksChecked(page.links.length, lang)],
        fix: say(lang, {
          en: 'Add a link labelled "Impressum" to a part of the layout that appears on every page, usually the footer.',
          de: 'Einen Link „Impressum“ in einen Bereich einbauen, der auf jeder Seite erscheint, meist den Footer.',
        }),
      },
    ];
  },
};
