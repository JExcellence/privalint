import { findEmbed } from '../data/third-parties.js';
import { huArticle, type Lang, say, type Text } from '../i18n.js';
import type { Finding, Rule } from '../types.js';
import { groupRequestsByVendor } from './third-party-hits.js';

const ID = 'third-party-embeds';

export const thirdPartyEmbeds: Rule = {
  id: ID,
  title: 'Embedded content loads before consent',
  description:
    'Videos, maps, captchas and social embeds contact their provider as soon as the page loads, ' +
    "which sends the visitor's IP address and often sets cookies. Load them only after the " +
    'visitor has agreed, typically with a click-to-load placeholder.',
  references: ['Art. 6(1) GDPR', '§ 25 Abs. 1 TDDDG'],
  check({ page, lang }) {
    return [...groupRequestsByVendor(page.requests, findEmbed)].map(
      ([vendor, evidence]): Finding => ({
        ruleId: ID,
        severity: 'warning',
        message: say(lang, {
          en: `${vendor} loads before the visitor has given consent.`,
          de: `${vendor} wird geladen, bevor eine Einwilligung vorliegt.`,
          hu: `${huArticle(vendor, true)} ${vendor} betöltődik, mielőtt a látogató hozzájárult volna.`,
        }),
        pageUrl: page.finalUrl,
        subject: vendor,
        evidence,
        fix: withHint(lang, vendor, evidence, {
          en: `Review the purpose and legal basis for ${vendor}. Where consent is required, use a click-to-load placeholder or block the resource until consent. Security widgets may need a separate necessity assessment.`,
          de: `Zweck und Rechtsgrundlage für ${vendor} prüfen. Soweit Einwilligung erforderlich ist, einen Platzhalter verwenden oder bis zur Einwilligung blockieren. Sicherheits-Widgets benötigen gegebenenfalls eine gesonderte Erforderlichkeitsprüfung.`,
          hu: `Vizsgálja felül ${huArticle(vendor)} ${vendor} használatának célját és jogalapját. Ahol hozzájárulás szükséges, használjon kattintásra betöltődő helyőrzőt, vagy blokkolja az erőforrást a hozzájárulásig. Biztonsági widgeteknél külön szükségességi vizsgálat kellhet.`,
        }),
      }),
    );
  },
};

/**
 * Privacy-enhanced modes some providers offer. None replaces consent, but each reduces what loads
 * before it. Sources: YouTube Help "Turn on privacy-enhanced mode" (answer 171780), Vimeo Help
 * "About Player Parameters" (dnt).
 */
function hintFor(vendor: string, urls: readonly string[]): Text | undefined {
  if (
    vendor === 'YouTube' &&
    urls.some((url) =>
      /(?:^|\.)youtube\.com\/embed\//i.test(new URL(url).hostname + new URL(url).pathname),
    )
  ) {
    return {
      en: 'Until then, the privacy-enhanced mode (www.youtube-nocookie.com/embed/...) avoids cookies before playback; it does not replace consent.',
      de: 'Bis dahin vermeidet der erweiterte Datenschutzmodus (www.youtube-nocookie.com/embed/...) Cookies vor dem Abspielen; er ersetzt keine Einwilligung.',
      hu: 'Addig is a fokozott adatvédelmi mód (www.youtube-nocookie.com/embed/...) lejátszás előtt nem használ sütiket; ez nem helyettesíti a hozzájárulást.',
    };
  }
  if (vendor === 'Vimeo' && !urls.some((url) => /[?&]dnt=(?:1|true)\b/i.test(url))) {
    return {
      en: 'Until then, the player parameter dnt=1 stops Vimeo from setting new cookies other than its security cookies; it does not replace consent.',
      de: 'Bis dahin verhindert der Player-Parameter dnt=1, dass Vimeo außer Sicherheits-Cookies neue Cookies setzt; er ersetzt keine Einwilligung.',
      hu: 'Addig is a dnt=1 lejátszóparaméter megakadályozza, hogy a Vimeo a biztonsági sütiken kívül új sütiket állítson be; ez nem helyettesíti a hozzájárulást.',
    };
  }
  if (vendor === 'Google Maps') {
    return {
      en: 'A placeholder image of the location with a link to Google Maps loads nothing from Google until the visitor clicks.',
      de: 'Ein Platzhalterbild des Standorts mit Link zu Google Maps lädt nichts von Google, bis der Besucher klickt.',
      hu: 'A helyszín helyőrző képe egy Google Térkép-hivatkozással semmit nem tölt be a Google-tól, amíg a látogató nem kattint.',
    };
  }
  return undefined;
}

function withHint(lang: Lang, vendor: string, urls: readonly string[], fix: Text): string {
  const hint = hintFor(vendor, urls);
  return hint === undefined ? say(lang, fix) : `${say(lang, fix)} ${say(lang, hint)}`;
}
