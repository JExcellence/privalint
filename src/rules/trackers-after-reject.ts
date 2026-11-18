import { huArticle, say } from '../i18n.js';
import type { Finding, Rule } from '../types.js';
import { tcfFindings } from './tcf-findings.js';
import { categoryLabel, findTrackerHits, trackerFinding } from './tracker-hits.js';

const ID = 'trackers-after-reject';

export const trackersAfterReject: Rule = {
  id: ID,
  title: 'Trackers run after the visitor rejected them',
  description:
    'privalint clicks the reject button of the consent banner on the start page, reloads the ' +
    'page and records what still loads. Anything on the tracker list that loads or sets new ' +
    'cookies after that ignores the visitor’s explicit refusal.',
  references: ['§ 25 Abs. 1 TDDDG', 'Art. 6(1)(a) GDPR'],
  check({ page, lang }) {
    const after = page.consent?.afterReject;
    if (after === undefined) {
      return [];
    }
    const button =
      page.consent?.rejectLabel ??
      say(lang, {
        en: 'reject',
        de: 'Ablehnen',
        hu: 'elutasítás',
        fr: 'Refuser',
        it: 'Rifiuta',
        es: 'Rechazar',
        pl: 'Odrzuć',
      });
    const tcf =
      page.consent?.tcf === undefined
        ? []
        : tcfFindings({
            tcf: page.consent.tcf,
            ruleId: ID,
            pageUrl: page.finalUrl,
            lang,
            action: {
              en: `clicking "${button}"`,
              de: `„${button}“ geklickt wurde`,
              hu: `${huArticle(button)} „${button}” gombra kattintás után`,
              fr: `le clic sur « ${button} »`,
              it: `il clic su «${button}»`,
              es: `hacer clic en «${button}»`,
              pl: `kliknięciu „${button}”`,
            },
          });
    const trackerFindings = findTrackerHits(
      after.requests,
      after.cookies,
      lang,
      after.storage,
      page.cnameCloaks,
    ).map((hit): Finding => {
      const { vendor } = hit.tracker;
      const category = categoryLabel(hit.tracker.category, lang);
      return {
        ruleId: ID,
        ...trackerFinding(hit, lang, {
          message: {
            en: `${vendor} (${category}) still runs after clicking "${button}".`,
            de: `${vendor} (${category}) läuft weiter, obwohl „${button}“ geklickt wurde.`,
            hu: `${huArticle(vendor, true)} ${vendor} (${category}) ${huArticle(button)} „${button}” gombra kattintás után is tovább fut.`,
            fr: `${vendor} (${category}) s'exécute encore après un clic sur « ${button} ».`,
            it: `${vendor} (${category}) viene ancora eseguito dopo il clic su «${button}».`,
            es: `${vendor} (${category}) se sigue ejecutando después de hacer clic en «${button}».`,
            pl: `${vendor} (${category}) nadal działa po kliknięciu „${button}”.`,
          },
          deniedMessage: {
            en: `${vendor} (${category}) still sends Google Consent Mode pings after clicking "${button}".`,
            de: `${vendor} (${category}) sendet weiter Google-Consent-Mode-Pings, obwohl „${button}“ geklickt wurde.`,
            hu: `${huArticle(vendor, true)} ${vendor} (${category}) ${huArticle(button)} „${button}” gombra kattintás után is Google Consent Mode pingeket küld.`,
            fr: `${vendor} (${category}) envoie encore des pings Google Consent Mode après un clic sur « ${button} ».`,
            it: `${vendor} (${category}) invia ancora ping di Google Consent Mode dopo il clic su «${button}».`,
            es: `${vendor} (${category}) sigue enviando pings de Google Consent Mode después de hacer clic en «${button}».`,
            pl: `${vendor} (${category}) nadal wysyła pingi Google Consent Mode po kliknięciu „${button}”.`,
          },
          grantedMessage: {
            en: `${vendor} tells Google that consent was granted, although the visitor clicked "${button}" (Google Consent Mode).`,
            de: `${vendor} meldet Google eine erteilte Einwilligung, obwohl „${button}“ geklickt wurde (Google Consent Mode).`,
            hu: `${huArticle(vendor, true)} ${vendor} megadott hozzájárulást jelez a Google-nek, pedig a látogató ${huArticle(button)} „${button}” gombra kattintott (Google Consent Mode).`,
            fr: `${vendor} indique à Google que le consentement a été accordé, alors que le visiteur a cliqué sur « ${button} » (Google Consent Mode).`,
            it: `${vendor} comunica a Google che il consenso è stato concesso, anche se il visitatore ha cliccato su «${button}» (Google Consent Mode).`,
            es: `${vendor} indica a Google que se concedió el consentimiento, aunque el visitante hizo clic en «${button}» (Google Consent Mode).`,
            pl: `${vendor} informuje Google o udzieleniu zgody, choć odwiedzający kliknął „${button}” (Google Consent Mode).`,
          },
          fix: {
            en: `Check that ${vendor} is assigned to a consent category in your consent manager and that the category is blocked when the visitor rejects.`,
            de: `Prüfen, ob ${vendor} im Consent-Tool einer Kategorie zugeordnet ist und diese Kategorie beim Ablehnen blockiert wird.`,
            hu: `Ellenőrizze, hogy ${huArticle(vendor)} ${vendor} a hozzájárulás-kezelőben hozzá van-e rendelve egy hozzájárulási kategóriához, és hogy ez a kategória blokkolva van-e, amikor a látogató elutasít.`,
            fr: `Vérifiez que ${vendor} est rattaché à une catégorie de consentement dans votre gestionnaire de consentement et que cette catégorie est bloquée quand le visiteur refuse.`,
            it: `Verifica che ${vendor} sia assegnato a una categoria di consenso nel tuo gestore del consenso e che la categoria venga bloccata quando il visitatore rifiuta.`,
            es: `Comprueba que ${vendor} esté asignado a una categoría de consentimiento en tu gestor de consentimiento y que la categoría se bloquee cuando el visitante rechaza.`,
            pl: `Sprawdź, czy ${vendor} jest przypisany do kategorii zgody w menedżerze zgód i czy ta kategoria jest blokowana, gdy odwiedzający odmawia.`,
          },
          grantedFix: {
            en: 'Make the consent manager update Google Consent Mode to "denied" for every storage type when the visitor rejects, and check that no tag sets it to "granted" on its own.',
            de: 'Das Consent-Tool so einstellen, dass es Google Consent Mode beim Ablehnen für alle Speicherarten auf „denied“ setzt, und prüfen, dass kein Tag ihn selbst auf „granted“ setzt.',
            hu: 'Állítsa be a hozzájárulás-kezelőt úgy, hogy elutasításkor minden tárolási típusnál „denied” értékre frissítse a Google Consent Mode-ot, és ellenőrizze, hogy egyetlen címke se állítsa magától „granted” értékre.',
            fr: "Faites passer Google Consent Mode à « denied » pour chaque type de stockage par le gestionnaire de consentement quand le visiteur refuse, et vérifiez qu'aucune balise ne le passe à « granted » d'elle-même.",
            it: 'Fai in modo che il gestore del consenso aggiorni Google Consent Mode a «denied» per ogni tipo di archiviazione quando il visitatore rifiuta, e verifica che nessun tag lo imposti da solo su «granted».',
            es: 'Haz que el gestor de consentimiento cambie Google Consent Mode a «denied» para cada tipo de almacenamiento cuando el visitante rechace, y comprueba que ninguna etiqueta lo cambie a «granted» por su cuenta.',
            pl: 'Spraw, by menedżer zgód przy odmowie zmieniał Google Consent Mode na „denied” dla każdego typu przechowywania, i sprawdź, czy żaden tag nie ustawia „granted” samodzielnie.',
          },
        }),
        pageUrl: page.finalUrl,
        subject: vendor,
        evidence: hit.evidence,
      };
    });
    return [...trackerFindings, ...tcf];
  },
};
