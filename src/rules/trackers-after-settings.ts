import { huArticle, say } from '../i18n.js';
import type { Finding, Rule } from '../types.js';
import { tcfFindings } from './tcf-findings.js';
import { categoryLabel, findTrackerHits, trackerFinding } from './tracker-hits.js';

const ID = 'trackers-after-settings';

export const trackersAfterSettings: Rule = {
  id: ID,
  title: 'Trackers run after the visitor switched everything off in the settings',
  description:
    'Opt-in check. privalint opens the settings layer of the consent banner on the start page ' +
    'in a fresh browser, switches off every optional category, saves, reloads the page and ' +
    'records what still loads. Anything on the tracker list that loads or sets new cookies ' +
    'after that ignores the visitor’s choice.',
  references: ['§ 25 Abs. 1 TDDDG', 'Art. 6(1)(a) GDPR'],
  requires: ['after-settings'],
  check({ page, lang }) {
    const settings = page.consent?.settings;
    const after = settings?.afterSave;
    if (after === undefined) {
      return [];
    }
    const button =
      settings?.saveLabel ??
      say(lang, {
        en: 'save',
        de: 'Speichern',
        hu: 'mentés',
        fr: 'Enregistrer',
        it: 'Salva',
        es: 'Guardar',
        pl: 'Zapisz',
      });
    const tcf =
      settings?.tcf === undefined
        ? []
        : tcfFindings({
            tcf: settings.tcf,
            ruleId: ID,
            pageUrl: page.finalUrl,
            lang,
            action: {
              en: `switching off all categories and clicking "${button}"`,
              de: `alle Kategorien abgewählt und „${button}“ geklickt wurde`,
              hu: `az összes kategória kikapcsolása és ${huArticle(button)} „${button}” gombra kattintás után`,
              fr: `la désactivation de toutes les catégories et le clic sur « ${button} »`,
              it: `la disattivazione di tutte le categorie e il clic su «${button}»`,
              es: `desactivar todas las categorías y hacer clic en «${button}»`,
              pl: `wyłączeniu wszystkich kategorii i kliknięciu „${button}”`,
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
            en: `${vendor} (${category}) still runs after switching off all categories and clicking "${button}".`,
            de: `${vendor} (${category}) läuft weiter, obwohl alle Kategorien abgewählt und „${button}“ geklickt wurde.`,
            hu: `${huArticle(vendor, true)} ${vendor} (${category}) az összes kategória kikapcsolása és ${huArticle(button)} „${button}” gombra kattintás után is tovább fut.`,
            fr: `${vendor} (${category}) s'exécute encore après la désactivation de toutes les catégories et un clic sur « ${button} ».`,
            it: `${vendor} (${category}) viene ancora eseguito dopo la disattivazione di tutte le categorie e il clic su «${button}».`,
            es: `${vendor} (${category}) se sigue ejecutando después de desactivar todas las categorías y hacer clic en «${button}».`,
            pl: `${vendor} (${category}) nadal działa po wyłączeniu wszystkich kategorii i kliknięciu „${button}”.`,
          },
          grantedMessage: {
            en: `${vendor} tells Google that consent was granted, although all categories were switched off and "${button}" was clicked (Google Consent Mode).`,
            de: `${vendor} meldet Google eine erteilte Einwilligung, obwohl alle Kategorien abgewählt und „${button}“ geklickt wurde (Google Consent Mode).`,
            hu: `${huArticle(vendor, true)} ${vendor} megadott hozzájárulást jelez a Google-nek, pedig az összes kategóriát kikapcsolták és ${huArticle(button)} „${button}” gombra kattintottak (Google Consent Mode).`,
            fr: `${vendor} indique à Google que le consentement a été accordé, alors que toutes les catégories ont été désactivées et que « ${button} » a été cliqué (Google Consent Mode).`,
            it: `${vendor} comunica a Google che il consenso è stato concesso, anche se tutte le categorie sono state disattivate ed è stato cliccato «${button}» (Google Consent Mode).`,
            es: `${vendor} indica a Google que se concedió el consentimiento, aunque se desactivaron todas las categorías y se hizo clic en «${button}» (Google Consent Mode).`,
            pl: `${vendor} informuje Google o udzieleniu zgody, choć wszystkie kategorie zostały wyłączone i kliknięto „${button}” (Google Consent Mode).`,
          },
          fix: {
            en: `Check that ${vendor} belongs to a category the visitor can switch off in your consent manager, and that saving the settings blocks it the same way rejecting does.`,
            de: `Prüfen, ob ${vendor} im Consent-Tool einer abwählbaren Kategorie zugeordnet ist und das Speichern der Einstellungen es genauso blockiert wie das Ablehnen.`,
            hu: `Ellenőrizze, hogy ${huArticle(vendor)} ${vendor} a hozzájárulás-kezelőben olyan kategóriába tartozik-e, amelyet a látogató kikapcsolhat, és hogy a beállítások mentése ugyanúgy blokkolja-e, mint az elutasítás.`,
            fr: `Vérifiez que ${vendor} appartient à une catégorie que le visiteur peut désactiver dans votre gestionnaire de consentement, et que l'enregistrement des paramètres le bloque comme le fait le refus.`,
            it: `Verifica che ${vendor} appartenga a una categoria che il visitatore può disattivare nel tuo gestore del consenso, e che il salvataggio delle impostazioni lo blocchi come il rifiuto.`,
            es: `Comprueba que ${vendor} pertenezca a una categoría que el visitante pueda desactivar en tu gestor de consentimiento, y que guardar la configuración lo bloquee igual que el rechazo.`,
            pl: `Sprawdź, czy ${vendor} należy do kategorii, którą odwiedzający może wyłączyć w menedżerze zgód, i czy zapisanie ustawień blokuje go tak samo jak odmowa.`,
          },
          grantedFix: {
            en: 'Make the consent manager update Google Consent Mode to "denied" for every switched-off category when the settings are saved, and check that no tag sets it to "granted" on its own.',
            de: 'Das Consent-Tool so einstellen, dass es Google Consent Mode beim Speichern für jede abgewählte Kategorie auf „denied“ setzt, und prüfen, dass kein Tag ihn selbst auf „granted“ setzt.',
            hu: 'Állítsa be a hozzájárulás-kezelőt úgy, hogy a beállítások mentésekor minden kikapcsolt kategóriánál „denied” értékre frissítse a Google Consent Mode-ot, és ellenőrizze, hogy egyetlen címke se állítsa magától „granted” értékre.',
            fr: "Faites passer Google Consent Mode à « denied » pour chaque catégorie désactivée lors de l'enregistrement des paramètres, et vérifiez qu'aucune balise ne le passe à « granted » d'elle-même.",
            it: 'Fai in modo che il gestore del consenso aggiorni Google Consent Mode a «denied» per ogni categoria disattivata quando le impostazioni vengono salvate, e verifica che nessun tag lo imposti da solo su «granted».',
            es: 'Haz que el gestor de consentimiento cambie Google Consent Mode a «denied» para cada categoría desactivada al guardar la configuración, y comprueba que ninguna etiqueta lo cambie a «granted» por su cuenta.',
            pl: 'Spraw, by menedżer zgód przy zapisywaniu ustawień zmieniał Google Consent Mode na „denied” dla każdej wyłączonej kategorii, i sprawdź, czy żaden tag nie ustawia „granted” samodzielnie.',
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
