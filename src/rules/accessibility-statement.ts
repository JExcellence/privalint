import { say } from '../i18n.js';
import type { Rule } from '../types.js';
import { linkMatches, linksChecked } from './links.js';
import { isStartPage, looksLikeShop } from './shop.js';

const ID = 'accessibility-statement';

const ACCESSIBILITY =
  /barrierefrei|accessibility|accessibilit[ée]|akadálymentes|toegankelijkheid|accesibilidad|accessibilità/i;

export const accessibilityStatement: Rule = {
  id: ID,
  title: 'Online shop without visible accessibility information',
  description:
    'Since 28 June 2025, e-commerce services for consumers must publish how they meet the ' +
    'accessibility requirements (European Accessibility Act). The information may sit in the ' +
    'terms and conditions, so a missing link is only noted, on sites that look like a shop.',
  references: ['§ 14 BFSG', 'Anlage 3 BFSG'],
  check({ page, siteUrl, lang }) {
    if (!isStartPage(page, siteUrl) || !looksLikeShop(page)) return [];
    if (page.links.some(linkMatches(ACCESSIBILITY))) return [];
    return [
      {
        ruleId: ID,
        // The law allows the information in the terms and conditions; a link can't be required.
        severity: 'info',
        message: say(lang, {
          en: 'This looks like an online shop, but no link to accessibility information was found on the start page.',
          de: 'Die Seite sieht aus wie ein Onlineshop, aber auf der Startseite wurde kein Link zu Informationen über die Barrierefreiheit gefunden.',
          hu: 'Az oldal webáruháznak tűnik, de a kezdőlapon nem található hivatkozás akadálymentességi tájékoztatóra.',
        }),
        pageUrl: page.finalUrl,
        evidence: [linksChecked(page.links.length, lang)],
        fix: say(lang, {
          en: 'Publish how the shop meets the accessibility requirements, in the terms and conditions or on its own page, and link it in the footer ("Accessibility statement"). Micro-enterprises are exempt.',
          de: 'Veröffentlichen, wie der Shop die Barrierefreiheitsanforderungen erfüllt, in den AGB oder auf einer eigenen Seite, und sie im Footer verlinken („Barrierefreiheitserklärung“). Kleinstunternehmen sind ausgenommen.',
          hu: 'Tegye közzé, hogyan teljesíti a bolt az akadálymentességi követelményeket, az ÁSZF-ben vagy külön oldalon, és hivatkozzon rá a láblécben („Akadálymentességi nyilatkozat”). A mikrovállalkozások mentesülnek.',
        }),
      },
    ];
  },
};
