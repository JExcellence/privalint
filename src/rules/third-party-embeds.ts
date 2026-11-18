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
          fr: `${vendor} se charge avant que le visiteur ait donné son consentement.`,
          it: `${vendor} viene caricato prima che il visitatore abbia dato il consenso.`,
          es: `${vendor} se carga antes de que el visitante haya dado su consentimiento.`,
          pl: `${vendor} ładuje się, zanim odwiedzający wyrazi zgodę.`,
        }),
        pageUrl: page.finalUrl,
        subject: vendor,
        evidence,
        fix: withHint(lang, vendor, evidence, {
          en: `Review the purpose and legal basis for ${vendor}. Where consent is required, use a click-to-load placeholder or block the resource until consent. Security widgets may need a separate necessity assessment.`,
          de: `Zweck und Rechtsgrundlage für ${vendor} prüfen. Soweit Einwilligung erforderlich ist, einen Platzhalter verwenden oder bis zur Einwilligung blockieren. Sicherheits-Widgets benötigen gegebenenfalls eine gesonderte Erforderlichkeitsprüfung.`,
          hu: `Vizsgálja felül ${huArticle(vendor)} ${vendor} használatának célját és jogalapját. Ahol hozzájárulás szükséges, használjon kattintásra betöltődő helyőrzőt, vagy blokkolja az erőforrást a hozzájárulásig. Biztonsági widgeteknél külön szükségességi vizsgálat kellhet.`,
          fr: `Examinez la finalité et la base légale de ${vendor}. Si un consentement est nécessaire, utilisez un espace réservé à cliquer ou bloquez la ressource jusqu'au consentement. Les widgets de sécurité peuvent nécessiter une évaluation distincte de leur nécessité.`,
          it: `Valuta finalità e base giuridica di ${vendor}. Dove serve il consenso, usa un segnaposto con caricamento al clic o blocca la risorsa fino al consenso. I widget di sicurezza possono richiedere una valutazione di necessità separata.`,
          es: `Revisa la finalidad y la base jurídica de ${vendor}. Cuando se requiera consentimiento, usa un marcador que cargue al hacer clic o bloquea el recurso hasta el consentimiento. Los widgets de seguridad pueden requerir una valoración de necesidad aparte.`,
          pl: `Sprawdź cel i podstawę prawną dla ${vendor}. Tam, gdzie wymagana jest zgoda, użyj zaślepki ładowanej po kliknięciu albo blokuj zasób do czasu wyrażenia zgody. Widżety bezpieczeństwa mogą wymagać osobnej oceny niezbędności.`,
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
      fr: 'En attendant, le mode de confidentialité renforcé (www.youtube-nocookie.com/embed/...) évite les cookies avant la lecture ; il ne remplace pas le consentement.',
      it: 'Nel frattempo la modalità di privacy avanzata (www.youtube-nocookie.com/embed/...) evita i cookie prima della riproduzione; non sostituisce il consenso.',
      es: 'Mientras tanto, el modo de privacidad mejorada (www.youtube-nocookie.com/embed/...) evita las cookies antes de la reproducción; no sustituye al consentimiento.',
      pl: 'Do tego czasu tryb rozszerzonej prywatności (www.youtube-nocookie.com/embed/...) pozwala uniknąć cookies przed odtworzeniem; nie zastępuje zgody.',
    };
  }
  if (vendor === 'Vimeo' && !urls.some((url) => /[?&]dnt=(?:1|true)\b/i.test(url))) {
    return {
      en: 'Until then, the player parameter dnt=1 stops Vimeo from setting new cookies other than its security cookies; it does not replace consent.',
      de: 'Bis dahin verhindert der Player-Parameter dnt=1, dass Vimeo außer Sicherheits-Cookies neue Cookies setzt; er ersetzt keine Einwilligung.',
      hu: 'Addig is a dnt=1 lejátszóparaméter megakadályozza, hogy a Vimeo a biztonsági sütiken kívül új sütiket állítson be; ez nem helyettesíti a hozzájárulást.',
      fr: 'En attendant, le paramètre de lecteur dnt=1 empêche Vimeo de poser de nouveaux cookies autres que ses cookies de sécurité ; il ne remplace pas le consentement.',
      it: 'Nel frattempo il parametro del player dnt=1 impedisce a Vimeo di impostare nuovi cookie diversi dai suoi cookie di sicurezza; non sostituisce il consenso.',
      es: 'Mientras tanto, el parámetro del reproductor dnt=1 impide que Vimeo instale nuevas cookies distintas de sus cookies de seguridad; no sustituye al consentimiento.',
      pl: 'Do tego czasu parametr odtwarzacza dnt=1 powstrzymuje Vimeo przed ustawianiem nowych cookies poza cookies bezpieczeństwa; nie zastępuje zgody.',
    };
  }
  if (vendor === 'Google Maps') {
    return {
      en: 'A placeholder image of the location with a link to Google Maps loads nothing from Google until the visitor clicks.',
      de: 'Ein Platzhalterbild des Standorts mit Link zu Google Maps lädt nichts von Google, bis der Besucher klickt.',
      hu: 'A helyszín helyőrző képe egy Google Térkép-hivatkozással semmit nem tölt be a Google-tól, amíg a látogató nem kattint.',
      fr: 'Une image de remplacement du lieu avec un lien vers Google Maps ne charge rien depuis Google tant que le visiteur ne clique pas.',
      it: "Un'immagine segnaposto della posizione con un link a Google Maps non carica nulla da Google finché il visitatore non fa clic.",
      es: 'Una imagen de marcador de la ubicación con un enlace a Google Maps no carga nada de Google hasta que el visitante hace clic.',
      pl: 'Obraz zastępczy lokalizacji z linkiem do Map Google nie ładuje niczego z Google, dopóki odwiedzający nie kliknie.',
    };
  }
  return undefined;
}

function withHint(lang: Lang, vendor: string, urls: readonly string[], fix: Text): string {
  const hint = hintFor(vendor, urls);
  return hint === undefined ? say(lang, fix) : `${say(lang, fix)} ${say(lang, hint)}`;
}
