import { plPlural, say, type Text } from '../i18n.js';
import { observedRequests } from '../observations.js';
import type { Finding, Rule } from '../types.js';
import { hostMatches, safeHost } from '../url.js';

const ID = 'google-fonts';
const GOOGLE_FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

/** dns-prefetch only resolves the name; these hints open a real connection. */
const CONNECTING_HINTS = new Set(['preconnect', 'preload', 'prefetch', 'stylesheet']);

const FIX: Text = {
  en:
    'Self-host the font files. In Next.js, next/font/google downloads fonts at build time and ' +
    'serves them from your own domain. Elsewhere, install the family from @fontsource or download ' +
    'it via google-webfonts-helper, then remove every reference to fonts.googleapis.com and ' +
    'fonts.gstatic.com.',
  de:
    'Die Schriftdateien selbst hosten. In Next.js lädt next/font/google die Schriften beim Build ' +
    'herunter und liefert sie von der eigenen Domain aus. Sonst die Schrift über @fontsource ' +
    'installieren oder mit dem google-webfonts-helper herunterladen und danach alle Verweise auf ' +
    'fonts.googleapis.com und fonts.gstatic.com entfernen.',
  hu:
    'Tárolja a betűtípusfájlokat a saját szerverén. Next.js-ben a next/font/google build közben ' +
    'letölti a betűtípusokat, és a saját domainről szolgálja ki őket. Máshol telepítse a családot ' +
    'a @fontsource csomagból, vagy töltse le a google-webfonts-helperrel, majd távolítson el minden ' +
    'hivatkozást a fonts.googleapis.com és a fonts.gstatic.com címre.',
  fr: 'Hébergez vous-même les fichiers de police. Avec Next.js, next/font/google télécharge les polices au moment du build et les sert depuis votre propre domaine. Ailleurs, installez la famille depuis @fontsource ou téléchargez-la via google-webfonts-helper, puis supprimez toute référence à fonts.googleapis.com et fonts.gstatic.com.',
  it: 'Ospita in proprio i file dei font. In Next.js, next/font/google scarica i font in fase di build e li serve dal tuo dominio. Altrove, installa la famiglia da @fontsource o scaricala tramite google-webfonts-helper, poi rimuovi ogni riferimento a fonts.googleapis.com e fonts.gstatic.com.',
  es: 'Aloja tú mismo los archivos de las fuentes. En Next.js, next/font/google descarga las fuentes al compilar y las sirve desde tu propio dominio. En otros casos, instala la familia desde @fontsource o descárgala con google-webfonts-helper, y después elimina toda referencia a fonts.googleapis.com y fonts.gstatic.com.',
  pl: 'Hostuj pliki czcionek samodzielnie. W Next.js next/font/google pobiera czcionki podczas budowania i serwuje je z Twojej domeny. W innych przypadkach zainstaluj rodzinę z @fontsource lub pobierz ją przez google-webfonts-helper, a następnie usuń wszystkie odwołania do fonts.googleapis.com i fonts.gstatic.com.',
};

const isGoogleFontUrl = (url: string): boolean => {
  const host = safeHost(url);
  return host !== undefined && GOOGLE_FONT_HOSTS.some((domain) => hostMatches(host, domain));
};

export const googleFonts: Rule = {
  id: ID,
  title: 'Google Fonts loaded from Google servers',
  description:
    "Loading fonts from Google's CDN sends every visitor's IP address to Google without " +
    'consent. LG München I awarded a visitor damages for this in 2022.',
  references: ['Art. 6(1) GDPR', 'LG München I, 20.01.2022, Az. 3 O 17493/20'],
  check({ page, lang }) {
    const requests = observedRequests(page.requests).filter((request) =>
      isGoogleFontUrl(request.url),
    );
    if (requests.length > 0) {
      const count = requests.length;
      return [
        {
          ruleId: ID,
          severity: 'error',
          message: say(lang, {
            en: `Fonts are loaded from Google (${count} request${count === 1 ? '' : 's'}).`,
            de: `Schriften werden von Google geladen (${count} ${count === 1 ? 'Anfrage' : 'Anfragen'}).`,
            hu: `Az oldal betűtípusokat tölt be a Google-tól (${count} kérés).`,
            fr: `Des polices sont chargées depuis Google (${count} requête${count <= 1 ? '' : 's'}).`,
            it: `I font vengono caricati da Google (${count} ${count === 1 ? 'richiesta' : 'richieste'}).`,
            es: `Se cargan fuentes desde Google (${count} ${count === 1 ? 'solicitud' : 'solicitudes'}).`,
            pl: `Czcionki są ładowane z Google (${count} ${plPlural(count, 'żądanie', 'żądania', 'żądań')}).`,
          }),
          pageUrl: page.finalUrl,
          evidence: [...new Set(requests.map((request) => request.url))].slice(0, 5),
          fix: say(lang, FIX),
        },
      ];
    }

    const hints = page.resourceHints.filter(
      (hint) =>
        isGoogleFontUrl(hint.href) &&
        hint.rel.split(/\s+/).some((rel) => CONNECTING_HINTS.has(rel)),
    );
    if (hints.length > 0) {
      return [
        {
          ruleId: ID,
          severity: 'warning',
          message: say(lang, {
            en: 'The page preconnects to Google Fonts. No font was fetched, but the browser still opens a connection and transmits the IP address.',
            de: 'Die Seite baut vorab eine Verbindung zu Google Fonts auf. Es wurde keine Schrift geladen, aber der Browser öffnet trotzdem eine Verbindung und überträgt die IP-Adresse.',
            hu: 'Az oldal előre kapcsolatot nyit a Google Fonts felé. Betűtípus nem töltődött le, de a böngésző így is kapcsolatot létesít, és továbbítja az IP-címet.',
            fr: "La page se préconnecte à Google Fonts. Aucune police n'a été chargée, mais le navigateur ouvre tout de même une connexion et transmet l'adresse IP.",
            it: "La pagina si preconnette a Google Fonts. Nessun font è stato scaricato, ma il browser apre comunque una connessione e trasmette l'indirizzo IP.",
            es: 'La página hace preconnect a Google Fonts. No se descargó ninguna fuente, pero el navegador abre igualmente una conexión y transmite la dirección IP.',
            pl: 'Strona nawiązuje wstępne połączenie (preconnect) z Google Fonts. Nie pobrano żadnej czcionki, ale przeglądarka i tak otwiera połączenie i przesyła adres IP.',
          }),
          pageUrl: page.finalUrl,
          evidence: hints.map((hint) => `<link rel="${hint.rel}" href="${hint.href}">`),
          fix: say(lang, {
            en: 'Remove the leftover <link> tags pointing to Google Fonts.',
            de: 'Die übrig gebliebenen <link>-Tags zu Google Fonts entfernen.',
            hu: 'Távolítsa el a Google Fonts felé mutató megmaradt <link> elemeket.',
            fr: 'Supprimez les balises <link> restantes qui pointent vers Google Fonts.',
            it: 'Rimuovi i tag <link> rimasti che puntano a Google Fonts.',
            es: 'Elimina las etiquetas <link> sobrantes que apuntan a Google Fonts.',
            pl: 'Usuń pozostałe znaczniki <link> wskazujące na Google Fonts.',
          }),
        } satisfies Finding,
      ];
    }

    return [];
  },
};
