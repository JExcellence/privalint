import { plPlural, say, type Text } from '../i18n.js';
import { observedRequests } from '../observations.js';
import type { Finding, Rule } from '../types.js';
import { hostMatches, safeHost } from '../url.js';

const ID = 'adobe-fonts';
/** use.typekit.net serves the kit CSS and fonts, p.typekit.net counts page views for licensing. */
const ADOBE_FONT_HOSTS = ['use.typekit.net', 'p.typekit.net'];

/** dns-prefetch only resolves the name; these hints open a real connection. */
const CONNECTING_HINTS = new Set(['preconnect', 'preload', 'prefetch', 'stylesheet']);

const FIX: Text = {
  en:
    'Adobe Fonts are licensed for web use through Adobe’s servers only, so they cannot simply be ' +
    'self-hosted. Either license the font for self-hosting from its foundry or ask Adobe Sales ' +
    'about local hosting, or switch to an open-licensed font (e.g. from Fontsource) and serve it ' +
    'from your own domain. Then remove every reference to use.typekit.net and p.typekit.net.',
  de:
    'Adobe Fonts sind für das Web nur über Adobes Server lizenziert und lassen sich nicht einfach ' +
    'selbst hosten. Entweder die Schrift beim Hersteller für Self-Hosting lizenzieren oder bei Adobe ' +
    'nach lokalem Hosting fragen, oder auf eine Schrift mit offener Lizenz (z. B. über Fontsource) ' +
    'wechseln und sie von der eigenen Domain ausliefern. Danach alle Verweise auf use.typekit.net ' +
    'und p.typekit.net entfernen.',
  hu:
    'Az Adobe Fonts betűtípusai webes használatra csak az Adobe szerverein keresztül licencelhetők, ' +
    'ezért nem lehet őket egyszerűen saját szerveren tárolni. Licencelje a betűtípust saját ' +
    'tárolásra a készítőjétől, kérdezze az Adobe értékesítését a helyi tárolásról, vagy váltson ' +
    'nyílt licencű betűtípusra (pl. a Fontsource-ból), és szolgálja ki a saját domainről. Ezután ' +
    'távolítson el minden hivatkozást a use.typekit.net és a p.typekit.net címre.',
  fr: "Les polices Adobe Fonts ne sont concédées pour le web qu'à travers les serveurs d'Adobe et ne peuvent donc pas simplement être auto-hébergées. Achetez une licence d'auto-hébergement auprès de la fonderie, demandez à Adobe un hébergement local, ou passez à une police sous licence libre (par exemple via Fontsource) servie depuis votre propre domaine. Supprimez ensuite toute référence à use.typekit.net et p.typekit.net.",
  it: "I font Adobe sono concessi in licenza per il web solo tramite i server di Adobe, quindi non si possono semplicemente ospitare in proprio. Acquista dalla fonderia una licenza per l'hosting in proprio o chiedi ad Adobe Sales l'hosting locale, oppure passa a un font con licenza libera (ad es. da Fontsource) e servilo dal tuo dominio. Poi rimuovi ogni riferimento a use.typekit.net e p.typekit.net.",
  es: 'Las fuentes de Adobe solo se licencian para la web a través de los servidores de Adobe, así que no se pueden alojar sin más en un servidor propio. Licencia la fuente para alojamiento propio con su fundición o consulta a Adobe Sales sobre el alojamiento local, o cambia a una fuente con licencia abierta (p. ej. de Fontsource) y sírvela desde tu propio dominio. Después elimina toda referencia a use.typekit.net y p.typekit.net.',
  pl: 'Czcionki Adobe są licencjonowane do użytku w sieci wyłącznie przez serwery Adobe, więc nie można ich po prostu hostować samodzielnie. Kup licencję na samodzielny hosting od odlewni czcionki lub zapytaj Adobe Sales o hosting lokalny albo przejdź na czcionkę z otwartą licencją (np. z Fontsource) i serwuj ją z własnej domeny. Następnie usuń wszystkie odwołania do use.typekit.net i p.typekit.net.',
};

const isAdobeFontUrl = (url: string): boolean => {
  const host = safeHost(url);
  return host !== undefined && ADOBE_FONT_HOSTS.some((domain) => hostMatches(host, domain));
};

export const adobeFonts: Rule = {
  id: ID,
  title: 'Adobe Fonts loaded from Adobe servers',
  description:
    "Adobe Fonts (Typekit) are served from Adobe's servers, which receive every visitor's IP " +
    'address and the page’s hostname, and count page views for font licensing. The reasoning ' +
    'that made Google Fonts a problem applies the same way.',
  references: ['Art. 6(1) GDPR', 'LG München I, 20.01.2022, Az. 3 O 17493/20 (by analogy)'],
  check({ page, lang }) {
    const requests = observedRequests(page.requests).filter((request) =>
      isAdobeFontUrl(request.url),
    );
    if (requests.length > 0) {
      const count = requests.length;
      return [
        {
          ruleId: ID,
          severity: 'error',
          message: say(lang, {
            en: `Fonts are loaded from Adobe (${count} request${count === 1 ? '' : 's'}).`,
            de: `Schriften werden von Adobe geladen (${count} ${count === 1 ? 'Anfrage' : 'Anfragen'}).`,
            hu: `Az oldal betűtípusokat tölt be az Adobe-tól (${count} kérés).`,
            fr: `Des polices sont chargées depuis Adobe (${count} requête${count <= 1 ? '' : 's'}).`,
            it: `I font vengono caricati da Adobe (${count} ${count === 1 ? 'richiesta' : 'richieste'}).`,
            es: `Se cargan fuentes desde Adobe (${count} ${count === 1 ? 'solicitud' : 'solicitudes'}).`,
            pl: `Czcionki są ładowane z Adobe (${count} ${plPlural(count, 'żądanie', 'żądania', 'żądań')}).`,
          }),
          pageUrl: page.finalUrl,
          evidence: [...new Set(requests.map((request) => request.url))].slice(0, 5),
          fix: say(lang, FIX),
        },
      ];
    }

    const hints = page.resourceHints.filter(
      (hint) =>
        isAdobeFontUrl(hint.href) && hint.rel.split(/\s+/).some((rel) => CONNECTING_HINTS.has(rel)),
    );
    if (hints.length > 0) {
      return [
        {
          ruleId: ID,
          severity: 'warning',
          message: say(lang, {
            en: 'The page preconnects to Adobe Fonts. No font was fetched, but the browser still opens a connection and transmits the IP address.',
            de: 'Die Seite baut vorab eine Verbindung zu Adobe Fonts auf. Es wurde keine Schrift geladen, aber der Browser öffnet trotzdem eine Verbindung und überträgt die IP-Adresse.',
            hu: 'Az oldal előre kapcsolatot nyit az Adobe Fonts felé. Betűtípus nem töltődött le, de a böngésző így is kapcsolatot létesít, és továbbítja az IP-címet.',
            fr: "La page se préconnecte à Adobe Fonts. Aucune police n'a été chargée, mais le navigateur ouvre tout de même une connexion et transmet l'adresse IP.",
            it: "La pagina si preconnette ad Adobe Fonts. Nessun font è stato scaricato, ma il browser apre comunque una connessione e trasmette l'indirizzo IP.",
            es: 'La página hace preconnect a Adobe Fonts. No se descargó ninguna fuente, pero el navegador abre igualmente una conexión y transmite la dirección IP.',
            pl: 'Strona nawiązuje wstępne połączenie (preconnect) z Adobe Fonts. Nie pobrano żadnej czcionki, ale przeglądarka i tak otwiera połączenie i przesyła adres IP.',
          }),
          pageUrl: page.finalUrl,
          evidence: hints.map((hint) => `<link rel="${hint.rel}" href="${hint.href}">`),
          fix: say(lang, {
            en: 'Remove the leftover <link> tags pointing to Adobe Fonts.',
            de: 'Die übrig gebliebenen <link>-Tags zu Adobe Fonts entfernen.',
            hu: 'Távolítsa el az Adobe Fonts felé mutató megmaradt <link> elemeket.',
            fr: 'Supprimez les balises <link> restantes qui pointent vers Adobe Fonts.',
            it: 'Rimuovi i tag <link> rimasti che puntano ad Adobe Fonts.',
            es: 'Elimina las etiquetas <link> sobrantes que apuntan a Adobe Fonts.',
            pl: 'Usuń pozostałe znaczniki <link> wskazujące na Adobe Fonts.',
          }),
        } satisfies Finding,
      ];
    }

    return [];
  },
};
