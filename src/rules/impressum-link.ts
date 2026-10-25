import type { Rule } from '../types.js';

const ID = 'impressum-link';

/**
 * Link texts and URL slugs used for a legal notice across the EU.
 * Matched against both the visible text and the href, so `/impressum`
 * behind an icon-only link is still found.
 */
const LEGAL_NOTICE =
  /impressum|imprint|legal[\s_-]?notice|site[\s_-]?notice|anbieterkennzeichnung|mentions[\s_-]?l[eé]gales|aviso[\s_-]?legal|note[\s_-]?legali|colofon|informacje[\s_-]?prawne/i;

export const impressumLink: Rule = {
  id: ID,
  title: 'No link to an Impressum',
  description:
    'Commercial websites in Germany must provide a legal notice that is easy to recognise, ' +
    'directly reachable and always available, which in practice means a link on every page. ' +
    'Disable this rule for purely private sites or sites outside its scope.',
  references: ['§ 5 DDG', 'BGH, 20.07.2006, Az. I ZR 228/03'],
  check({ page }) {
    const found = page.links.some(
      (link) => LEGAL_NOTICE.test(link.text) || LEGAL_NOTICE.test(link.href),
    );
    if (found) {
      return [];
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
