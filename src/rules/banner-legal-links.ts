import { plPlural, say } from '../i18n.js';
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
              fr: 'la politique de confidentialité',
              it: "l'informativa sulla privacy",
              es: 'la política de privacidad',
              pl: 'polityki prywatności',
            }),
          ]),
      ...(links.some(linkMatches(LEGAL_NOTICE))
        ? []
        : [
            say(lang, {
              en: 'Impressum',
              de: 'Impressum',
              hu: 'impresszum',
              fr: 'les mentions légales',
              it: 'le note legali',
              es: 'el aviso legal',
              pl: 'noty prawnej',
            }),
          ]),
    ];
    if (missing.length === 0) return [];
    const list = missing.join(
      say(lang, {
        en: ' and ',
        de: ' und ',
        hu: ' és ',
        fr: ' et ',
        it: ' e ',
        es: ' y ',
        pl: ' ani ',
      }),
    );
    return [
      {
        ruleId: ID,
        severity: 'warning',
        message: say(lang, {
          en: `The consent banner blocks the page but doesn't link the ${list}.`,
          de: `Das Cookie-Banner blockiert die Seite, verlinkt aber nicht die ${list}.`,
          hu: `A sütibanner eltakarja az oldalt, de nem hivatkozik a következőkre: ${list}.`,
          fr: `Le bandeau de consentement bloque la page mais ne renvoie pas vers ${list}.`,
          it: `Il banner del consenso blocca la pagina ma non contiene link verso ${list}.`,
          es: `El banner de consentimiento bloquea la página, pero no enlaza ${list}.`,
          pl: `Baner zgody blokuje stronę, ale nie zawiera linku do ${list}.`,
        }),
        pageUrl: page.finalUrl,
        evidence: [
          say(lang, {
            en: `${links.length} links inside the banner`,
            de: `${links.length} Links im Banner`,
            hu: `${links.length} hivatkozás a bannerben`,
            fr: `${links.length} ${links.length <= 1 ? 'lien' : 'liens'} dans le bandeau`,
            it: `${links.length} link nel banner`,
            es: `${links.length} ${links.length === 1 ? 'enlace' : 'enlaces'} dentro del banner`,
            pl: `${links.length} ${plPlural(links.length, 'link', 'linki', 'linków')} na banerze`,
          }),
          ...links.slice(0, 3).map((link) => `${link.text || '(no text)'} -> ${link.href}`),
        ],
        fix: say(lang, {
          en: 'Link the privacy policy and the Impressum in the banner itself, or make the banner small enough that the footer stays usable while it is open.',
          de: 'Datenschutzerklärung und Impressum direkt im Banner verlinken, oder das Banner so klein halten, dass der Footer nutzbar bleibt, solange es offen ist.',
          hu: 'Hivatkozzon az adatkezelési tájékoztatóra és az impresszumra magában a bannerben, vagy tegye a bannert olyan kicsivé, hogy nyitott állapotban is használható maradjon a lábléc.',
          fr: "Ajoutez dans le bandeau lui-même un lien vers la politique de confidentialité et les mentions légales, ou réduisez le bandeau pour que le pied de page reste utilisable tant qu'il est ouvert.",
          it: "Inserisci nel banner stesso i link all'informativa sulla privacy e alle note legali, oppure rendi il banner abbastanza piccolo da lasciare utilizzabile il piè di pagina mentre è aperto.",
          es: 'Enlaza la política de privacidad y el aviso legal en el propio banner, o haz el banner lo bastante pequeño para que el pie de página siga siendo utilizable mientras está abierto.',
          pl: 'Umieść link do polityki prywatności i noty prawnej w samym banerze albo zmniejsz baner na tyle, by stopka pozostała dostępna, gdy jest otwarty.',
        }),
      },
    ];
  },
};
