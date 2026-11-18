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
          fr: "Le site ressemble à une boutique en ligne, mais aucun lien vers des informations sur l'accessibilité n'a été trouvé sur la page d'accueil.",
          it: "Sembra un negozio online, ma nella pagina iniziale non è stato trovato alcun link a informazioni sull'accessibilità.",
          es: 'Parece una tienda online, pero en la página de inicio no se encontró ningún enlace a información sobre accesibilidad.',
          pl: 'Wygląda to na sklep internetowy, ale na stronie startowej nie znaleziono linku do informacji o dostępności.',
        }),
        pageUrl: page.finalUrl,
        evidence: [linksChecked(page.links.length, lang)],
        fix: say(lang, {
          en: 'Publish how the shop meets the accessibility requirements, in the terms and conditions or on its own page, and link it in the footer ("Accessibility statement"). Micro-enterprises are exempt.',
          de: 'Veröffentlichen, wie der Shop die Barrierefreiheitsanforderungen erfüllt, in den AGB oder auf einer eigenen Seite, und sie im Footer verlinken („Barrierefreiheitserklärung“). Kleinstunternehmen sind ausgenommen.',
          hu: 'Tegye közzé, hogyan teljesíti a bolt az akadálymentességi követelményeket, az ÁSZF-ben vagy külön oldalon, és hivatkozzon rá a láblécben („Akadálymentességi nyilatkozat”). A mikrovállalkozások mentesülnek.',
          fr: "Publiez la façon dont la boutique respecte les exigences d'accessibilité, dans les conditions générales ou sur une page dédiée, et ajoutez un lien dans le pied de page (« Accessibilité »). Les microentreprises en sont dispensées.",
          it: 'Pubblica come il negozio soddisfa i requisiti di accessibilità, nelle condizioni generali o in una pagina dedicata, e inserisci il link nel piè di pagina («Dichiarazione di accessibilità»). Le microimprese sono esenti.',
          es: 'Publica cómo cumple la tienda los requisitos de accesibilidad, en las condiciones generales o en una página propia, y enlázalo en el pie de página («Declaración de accesibilidad»). Las microempresas están exentas.',
          pl: 'Opublikuj, jak sklep spełnia wymogi dostępności, w regulaminie lub na osobnej stronie, i umieść link w stopce („Deklaracja dostępności”). Mikroprzedsiębiorstwa są zwolnione.',
        }),
      },
    ];
  },
};
