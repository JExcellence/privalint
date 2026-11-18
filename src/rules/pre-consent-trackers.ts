import { huArticle } from '../i18n.js';
import type { Finding, Rule } from '../types.js';
import { categoryLabel, findTrackerHits, trackerFinding } from './tracker-hits.js';

const ID = 'pre-consent-trackers';

export const preConsentTrackers: Rule = {
  id: ID,
  title: 'Trackers run before consent',
  description:
    'Analytics, advertising and session-replay tools must not load or set cookies until the ' +
    'visitor has opted in. The page is loaded without interacting with any consent banner, so ' +
    'everything reported here happened before consent.',
  references: [
    '§ 25 Abs. 1 TDDDG',
    'Art. 5(3) ePrivacy Directive',
    'Art. 6(1)(a) GDPR',
    'CJEU, 01.10.2019, C-673/17 (Planet49)',
  ],
  check({ page, lang, region }) {
    const hits = findTrackerHits(page.requests, page.cookies, lang, page.storage, page.cnameCloaks);
    return hits.map((hit): Finding => {
      const { vendor } = hit.tracker;
      const category = categoryLabel(hit.tracker.category, lang);
      const isTagManager = hit.tracker.category === 'tag-manager';
      return {
        ruleId: ID,
        ...trackerFinding(
          hit,
          lang,
          {
            message: isTagManager
              ? {
                  en: `${vendor} loads before consent and sends the visitor's IP address to a third party.`,
                  de: `${vendor} wird vor der Einwilligung geladen und überträgt die IP-Adresse an einen Dritten.`,
                  hu: `${huArticle(vendor, true)} ${vendor} a hozzájárulás előtt betöltődik, és harmadik félnek továbbítja a látogató IP-címét.`,
                  fr: `${vendor} se charge avant le consentement et envoie l'adresse IP du visiteur à un tiers.`,
                  it: `${vendor} viene caricato prima del consenso e invia l'indirizzo IP del visitatore a terzi.`,
                  es: `${vendor} se carga antes del consentimiento y envía la dirección IP del visitante a un tercero.`,
                  pl: `${vendor} ładuje się przed wyrażeniem zgody i przesyła adres IP odwiedzającego podmiotowi trzeciemu.`,
                }
              : {
                  en: `${vendor} (${category}) runs before the visitor has given consent.`,
                  de: `${vendor} (${category}) läuft, bevor eine Einwilligung vorliegt.`,
                  hu: `${huArticle(vendor, true)} ${vendor} (${category}) fut, mielőtt a látogató hozzájárult volna.`,
                  fr: `${vendor} (${category}) s'exécute avant que le visiteur ait donné son consentement.`,
                  it: `${vendor} (${category}) viene eseguito prima che il visitatore abbia dato il consenso.`,
                  es: `${vendor} (${category}) se ejecuta antes de que el visitante haya dado su consentimiento.`,
                  pl: `${vendor} (${category}) działa, zanim odwiedzający wyrazi zgodę.`,
                },
            ...(isTagManager
              ? {}
              : {
                  deniedMessage: {
                    en: `${vendor} (${category}) sends Google Consent Mode pings before the visitor has given consent.`,
                    de: `${vendor} (${category}) sendet Google-Consent-Mode-Pings, bevor eine Einwilligung vorliegt.`,
                    hu: `${huArticle(vendor, true)} ${vendor} (${category}) Google Consent Mode pingeket küld, mielőtt a látogató hozzájárult volna.`,
                    fr: `${vendor} (${category}) envoie des pings Google Consent Mode avant que le visiteur ait donné son consentement.`,
                    it: `${vendor} (${category}) invia ping di Google Consent Mode prima che il visitatore abbia dato il consenso.`,
                    es: `${vendor} (${category}) envía pings de Google Consent Mode antes de que el visitante haya dado su consentimiento.`,
                    pl: `${vendor} (${category}) wysyła pingi Google Consent Mode, zanim odwiedzający wyrazi zgodę.`,
                  },
                }),
            grantedMessage: {
              en: `${vendor} tells Google that consent was granted before the visitor chose anything (Google Consent Mode).`,
              de: `${vendor} meldet Google eine erteilte Einwilligung, bevor der Besucher etwas ausgewählt hat (Google Consent Mode).`,
              hu: `${huArticle(vendor, true)} ${vendor} megadott hozzájárulást jelez a Google-nek, mielőtt a látogató bármit választott volna (Google Consent Mode).`,
              fr: `${vendor} indique à Google que le consentement a été accordé avant que le visiteur ait choisi quoi que ce soit (Google Consent Mode).`,
              it: `${vendor} comunica a Google che il consenso è stato concesso prima che il visitatore scegliesse qualcosa (Google Consent Mode).`,
              es: `${vendor} indica a Google que se concedió el consentimiento antes de que el visitante eligiera nada (Google Consent Mode).`,
              pl: `${vendor} informuje Google o udzieleniu zgody, zanim odwiedzający cokolwiek wybrał (Google Consent Mode).`,
            },
            fix: {
              en: `Only load ${vendor} after opt-in, for example by letting your consent manager inject it or by using it in a consent mode that sends no requests until consent is given.`,
              de: `${vendor} erst nach der Einwilligung laden, zum Beispiel über das Consent-Tool, oder einen Consent-Modus nutzen, der vorher keine Anfragen sendet.`,
              hu: `${huArticle(vendor, true)} ${vendor} csak hozzájárulás után töltődjön be, például úgy, hogy a hozzájárulás-kezelő illeszti be, vagy olyan hozzájárulási módban, amely a hozzájárulásig nem küld kéréseket.`,
              fr: `Ne chargez ${vendor} qu'après le consentement, par exemple en le faisant injecter par votre gestionnaire de consentement ou en l'utilisant dans un mode de consentement qui n'envoie aucune requête avant l'accord.`,
              it: `Carica ${vendor} solo dopo il consenso, ad esempio lasciandolo inserire dal gestore del consenso o usandolo in una modalità di consenso che non invia richieste finché il consenso non è dato.`,
              es: `Carga ${vendor} solo después del consentimiento, por ejemplo dejando que lo inserte tu gestor de consentimiento o usándolo en un modo de consentimiento que no envíe solicitudes hasta que se dé el consentimiento.`,
              pl: `Ładuj ${vendor} dopiero po wyrażeniu zgody, na przykład pozwalając menedżerowi zgód go wstawić lub używając go w trybie zgody, który nie wysyła żądań, dopóki zgoda nie zostanie udzielona.`,
            },
            grantedFix: {
              en: 'Set the Consent Mode defaults for ad_storage, analytics_storage, ad_user_data and ad_personalization to "denied" before any Google tag runs, and update them to "granted" only after the visitor accepts.',
              de: 'Die Consent-Mode-Standardwerte für ad_storage, analytics_storage, ad_user_data und ad_personalization auf „denied“ setzen, bevor ein Google-Tag läuft, und erst nach der Zustimmung auf „granted“ aktualisieren.',
              hu: 'Állítsa a Consent Mode alapértékeit (ad_storage, analytics_storage, ad_user_data, ad_personalization) „denied” értékre, mielőtt bármely Google-címke futna, és csak a látogató elfogadása után frissítse őket „granted” értékre.',
              fr: "Définissez les valeurs par défaut de Consent Mode pour ad_storage, analytics_storage, ad_user_data et ad_personalization sur « denied » avant l'exécution de toute balise Google, et passez-les à « granted » seulement après l'acceptation du visiteur.",
              it: 'Imposta i valori predefiniti di Consent Mode per ad_storage, analytics_storage, ad_user_data e ad_personalization su «denied» prima che venga eseguito qualsiasi tag Google, e aggiornali a «granted» solo dopo che il visitatore ha accettato.',
              es: 'Fija los valores predeterminados de Consent Mode para ad_storage, analytics_storage, ad_user_data y ad_personalization en «denied» antes de que se ejecute cualquier etiqueta de Google, y cámbialos a «granted» solo cuando el visitante acepte.',
              pl: 'Ustaw domyślne wartości Consent Mode dla ad_storage, analytics_storage, ad_user_data i ad_personalization na „denied”, zanim uruchomi się jakikolwiek tag Google, i zmieniaj je na „granted” dopiero po akceptacji przez odwiedzającego.',
            },
          },
          region,
        ),
        pageUrl: page.finalUrl,
        subject: vendor,
        evidence: hit.evidence,
      };
    });
  },
};
