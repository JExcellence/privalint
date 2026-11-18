import { huArticle, say } from '../i18n.js';
import type { Finding, Rule } from '../types.js';
import { findTrackerHits } from './tracker-hits.js';

const ID = 'consent-banner-missing';

export const consentBannerMissing: Rule = {
  id: ID,
  title: 'Trackers run and there is no consent banner',
  description:
    'On the start page, trackers run before any interaction and privalint found no consent ' +
    'banner, not even after waiting for a late one. Visitors then have no way to give or refuse ' +
    'consent. pre-consent-trackers reports each tracker as an error; this rule names the cause.',
  references: ['§ 25 Abs. 1 TDDDG', 'Art. 5(3) ePrivacy Directive', 'Art. 6(1)(a) GDPR'],
  requires: ['network', 'banner-search'],
  check({ page, lang }) {
    if (page.consent?.bannerFound !== false || page.consent.state !== 'not-detected') return [];
    // A tag manager on its own can be configured to wait for consent, so it doesn't count here.
    const vendors = findTrackerHits(
      page.requests,
      page.cookies,
      lang,
      page.storage,
      page.cnameCloaks,
    )
      .filter(({ tracker }) => tracker.category !== 'tag-manager')
      .map(({ tracker }) => tracker.vendor);
    if (vendors.length === 0) return [];
    const list = vendors.join(', ');
    // A consent manager that loaded but showed nothing usually hides its banner from automated
    // browsers, so the finding says so instead of claiming the site has none.
    const loaded = page.consent.cmp;
    if (loaded !== undefined) {
      return [
        {
          ruleId: ID,
          severity: 'warning',
          message: say(lang, {
            en: `${loaded} loaded, but showed no banner to privalint's automated browser, and ${list} ran before any interaction. Some consent managers hide their banner from automated browsers, so this may not be what visitors see.`,
            de: `${loaded} wurde geladen, zeigte dem automatisierten Browser von privalint aber kein Banner, und ${list} liefen ohne jede Interaktion. Manche Consent-Tools blenden ihr Banner für automatisierte Browser aus; Besucher sehen womöglich etwas anderes.`,
            hu: `${huArticle(loaded, true)} ${loaded} betöltődött, de a privalint automatizált böngészőjének nem mutatott bannert, és a következők interakció előtt futottak: ${list}. Egyes hozzájárulás-kezelők elrejtik a bannert az automatizált böngészők elől, így a látogatók mást láthatnak.`,
            fr: `${loaded} a été chargé, mais n'a affiché aucun bandeau au navigateur automatisé de privalint, et ${list} ${vendors.length <= 1 ? "s'est exécuté" : 'se sont exécutés'} avant toute interaction. Certains gestionnaires de consentement masquent leur bandeau aux navigateurs automatisés ; les visiteurs voient peut-être autre chose.`,
            it: `${loaded} è stato caricato, ma non ha mostrato alcun banner al browser automatizzato di privalint, e ${list} ${vendors.length === 1 ? 'è stato eseguito' : 'sono stati eseguiti'} prima di qualsiasi interazione. Alcuni gestori del consenso nascondono il banner ai browser automatizzati, quindi i visitatori potrebbero vedere altro.`,
            es: `${loaded} se cargó, pero no mostró ningún banner al navegador automatizado de privalint, y ${list} se ${vendors.length === 1 ? 'ejecutó' : 'ejecutaron'} antes de cualquier interacción. Algunos gestores de consentimiento ocultan su banner a los navegadores automatizados, así que puede que los visitantes vean otra cosa.`,
            pl: `${loaded} został załadowany, ale nie pokazał banera zautomatyzowanej przeglądarce privalint, a ${list} ${vendors.length === 1 ? 'działał' : 'działały'} przed jakąkolwiek interakcją. Niektóre menedżery zgód ukrywają baner przed zautomatyzowanymi przeglądarkami, więc odwiedzający mogą widzieć coś innego.`,
          }),
          pageUrl: page.finalUrl,
          evidence: [
            say(lang, {
              en: `Consent manager loaded: ${loaded}`,
              de: `Geladenes Consent-Tool: ${loaded}`,
              hu: `Betöltött hozzájárulás-kezelő: ${loaded}`,
              fr: `Gestionnaire de consentement chargé : ${loaded}`,
              it: `Gestore del consenso caricato: ${loaded}`,
              es: `Gestor de consentimiento cargado: ${loaded}`,
              pl: `Załadowany menedżer zgód: ${loaded}`,
            }),
            ...vendors.map((vendor) => `Tracker: ${vendor}`),
          ],
          fix: say(lang, {
            en: `Open the page in a normal browser in a private window. If the ${loaded} banner shows there, check its bot detection and geo settings; trackers must still wait for consent for every visitor the banner is shown to. If no banner shows there either, configure ${loaded} to show it before these tools load.`,
            de: `Die Seite in einem normalen Browser im privaten Fenster öffnen. Erscheint das ${loaded}-Banner dort, Bot-Erkennung und Geo-Einstellungen prüfen; für jeden Besucher, dem das Banner gezeigt wird, müssen die Tracker trotzdem auf die Einwilligung warten. Erscheint dort auch keins, ${loaded} so einrichten, dass das Banner vor diesen Diensten erscheint.`,
            hu: `Nyissa meg az oldalt egy normál böngésző privát ablakában. Ha ott megjelenik ${huArticle(loaded)} ${loaded} bannere, ellenőrizze a botfelismerési és földrajzi beállításait; minden látogatónál, akinek a banner megjelenik, a nyomkövetőknek így is meg kell várniuk a hozzájárulást. Ha ott sem jelenik meg banner, állítsa be ${huArticle(loaded)} ${loaded} eszközt úgy, hogy ezek az eszközök előtt megjelenjen.`,
            fr: `Ouvrez la page dans un navigateur normal en fenêtre privée. Si le bandeau ${loaded} s'y affiche, vérifiez sa détection des robots et ses réglages géographiques ; les traceurs doivent tout de même attendre le consentement pour chaque visiteur à qui le bandeau est présenté. Si aucun bandeau ne s'y affiche non plus, configurez ${loaded} pour qu'il s'affiche avant ces outils.`,
            it: `Apri la pagina in un browser normale in una finestra privata. Se lì compare il banner di ${loaded}, controlla il rilevamento dei bot e le impostazioni geografiche; i tracker devono comunque attendere il consenso per ogni visitatore a cui il banner viene mostrato. Se non compare nemmeno lì, configura ${loaded} perché il banner compaia prima di questi strumenti.`,
            es: `Abre la página en un navegador normal en una ventana privada. Si allí aparece el banner de ${loaded}, revisa su detección de bots y sus ajustes geográficos; los rastreadores deben esperar igualmente al consentimiento para cada visitante al que se muestra el banner. Si tampoco aparece allí, configura ${loaded} para que el banner aparezca antes de estas herramientas.`,
            pl: `Otwórz stronę w zwykłej przeglądarce w oknie prywatnym. Jeśli baner ${loaded} się tam pojawia, sprawdź jego wykrywanie botów i ustawienia geograficzne; trackery i tak muszą czekać na zgodę każdego odwiedzającego, któremu baner jest pokazywany. Jeśli i tam baner się nie pojawia, skonfiguruj ${loaded} tak, aby baner pojawiał się przed tymi narzędziami.`,
          }),
        } satisfies Finding,
      ];
    }
    return [
      {
        ruleId: ID,
        // pre-consent-trackers already gives each tracker an error; this explains why.
        severity: 'warning',
        message: say(lang, {
          en: `No consent banner was found, but ${list} run before any interaction. Visitors can't give or refuse consent.`,
          de: `Es wurde kein Cookie-Banner gefunden, aber ${list} laufen ohne jede Interaktion. Besucher können weder einwilligen noch ablehnen.`,
          hu: `Nem található sütibanner, de a következők minden interakció előtt futnak: ${list}. A látogatók nem tudnak hozzájárulni vagy elutasítani.`,
          fr: `Aucun bandeau de consentement n'a été trouvé, mais ${list} ${vendors.length <= 1 ? "s'exécute" : "s'exécutent"} avant toute interaction. Les visiteurs ne peuvent ni donner ni refuser leur consentement.`,
          it: `Non è stato trovato alcun banner del consenso, ma ${list} ${vendors.length === 1 ? 'viene eseguito' : 'vengono eseguiti'} prima di qualsiasi interazione. I visitatori non possono né dare né negare il consenso.`,
          es: `No se encontró ningún banner de consentimiento, pero ${list} se ${vendors.length === 1 ? 'ejecuta' : 'ejecutan'} antes de cualquier interacción. Los visitantes no pueden dar ni negar su consentimiento.`,
          pl: `Nie znaleziono banera zgody, ale ${list} ${vendors.length === 1 ? 'działa' : 'działają'} przed jakąkolwiek interakcją. Odwiedzający nie mogą ani wyrazić zgody, ani jej odmówić.`,
        }),
        pageUrl: page.finalUrl,
        evidence: [
          say(lang, {
            en: `Looked for a banner for ${page.consent.bannerWaitMs ?? 0} ms more after the page settled`,
            de: `Nach dem Laden noch ${page.consent.bannerWaitMs ?? 0} ms nach einem Banner gesucht`,
            hu: `A betöltés után a privalint még ${page.consent.bannerWaitMs ?? 0} ms-ig keresett bannert`,
            fr: `Recherche d'un bandeau pendant ${page.consent.bannerWaitMs ?? 0} ms de plus après la stabilisation de la page`,
            it: `Banner cercato per altri ${page.consent.bannerWaitMs ?? 0} ms dopo che la pagina si è stabilizzata`,
            es: `Se buscó un banner durante ${page.consent.bannerWaitMs ?? 0} ms más después de que la página se estabilizara`,
            pl: `Szukano banera jeszcze przez ${page.consent.bannerWaitMs ?? 0} ms po ustabilizowaniu się strony`,
          }),
          ...vendors.map((vendor) =>
            say(lang, {
              en: `Tracker: ${vendor}`,
              de: `Tracker: ${vendor}`,
              hu: `Nyomkövető: ${vendor}`,
              fr: `Traceur : ${vendor}`,
              it: `Tracker: ${vendor}`,
              es: `Rastreador: ${vendor}`,
              pl: `Tracker: ${vendor}`,
            }),
          ),
        ],
        fix: say(lang, {
          en: 'Add a consent manager that blocks these tools until the visitor opts in, with "accept" and "reject" on its first layer. If a banner exists but privalint missed it, please report the site.',
          de: 'Ein Consent-Tool einbinden, das diese Dienste bis zur Einwilligung blockiert, mit „Akzeptieren“ und „Ablehnen“ auf der ersten Ebene. Gibt es ein Banner, das privalint übersehen hat, bitte die Seite melden.',
          hu: 'Építsen be egy hozzájárulás-kezelőt, amely a hozzájárulásig blokkolja ezeket az eszközöket, és az első szinten „Elfogadom” és „Elutasítom” gombot kínál. Ha van banner, de a privalint nem találta meg, kérjük, jelezze az oldalt.',
          fr: "Ajoutez un gestionnaire de consentement qui bloque ces outils jusqu'à ce que le visiteur les accepte, avec « accepter » et « refuser » au premier niveau. Si un bandeau existe mais que privalint ne l'a pas détecté, merci de signaler le site.",
          it: "Aggiungi un gestore del consenso che blocchi questi strumenti finché il visitatore non acconsente, con «accetta» e «rifiuta» al primo livello. Se un banner esiste ma privalint non l'ha trovato, segnala il sito.",
          es: 'Añade un gestor de consentimiento que bloquee estas herramientas hasta que el visitante dé su consentimiento, con «aceptar» y «rechazar» en la primera capa. Si existe un banner pero privalint no lo detectó, informa del sitio.',
          pl: 'Dodaj menedżer zgód, który blokuje te narzędzia, dopóki odwiedzający nie wyrazi zgody, z opcjami „akceptuj” i „odrzuć” na pierwszej warstwie. Jeśli baner istnieje, a privalint go nie wykrył, zgłoś tę witrynę.',
        }),
      } satisfies Finding,
    ];
  },
};
