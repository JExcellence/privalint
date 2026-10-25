import type { PageLink, Rule } from '../types.js';

const ID = 'impressum-link';

/**
 * Link texts and URL slugs used for a legal notice across the EU.
 * Matched against both the visible text and the href, so `/impressum`
 * behind an icon-only link is still found.
 */
const LEGAL_NOTICE =
  /impressum|imprint|legal[\s_-]?notice|site[\s_-]?notice|anbieterkennzeichnung|mentions[\s_-]?l[eé]gales|aviso[\s_-]?legal|note[\s_-]?legali|colofon|informacje[\s_-]?prawne/i;

const CONTACT = /kontakt|contact/i;

const matches = (pattern: RegExp) => (link: PageLink) =>
  pattern.test(link.text) || pattern.test(link.href);

export const impressumLink: Rule = {
  id: ID,
  title: 'No link to an Impressum',
  description:
    'Commercial websites in Germany must provide a legal notice that is easy to recognise, ' +
    'directly reachable and always available, which in practice means a link on every page. ' +
    'Disable this rule for purely private sites or sites outside its scope.',
  references: ['§ 5 DDG', 'BGH, 20.07.2006, Az. I ZR 228/03'],
  check({ page }) {
    if (page.links.some(matches(LEGAL_NOTICE))) {
      return [];
    }

    const contact = page.links.find(matches(CONTACT));
    if (contact !== undefined) {
      return [
        {
          ruleId: ID,
          severity: 'info',
          message:
            'No direct Impressum link, only a contact link. Two clicks via "Kontakt" can be enough if the Impressum is linked clearly from there, but a direct link is safer.',
          pageUrl: page.finalUrl,
          evidence: [`contact link: ${contact.href}`],
          fix: 'Add a link labelled "Impressum" next to the contact link.',
        },
      ];
    }

    return [
      {
        ruleId: ID,
        severity: 'warning',
        message: 'No link to an Impressum or legal notice was found on this page.',
        pageUrl: page.finalUrl,
        evidence: [`${page.links.length} links checked`],
        fix: 'Add a link labelled "Impressum" to a part of the layout that appears on every page, usually the footer.',
      },
    ];
  },
};
