import { huArticle } from '../i18n.js';
import type { Finding, Rule } from '../types.js';
import { categoryLabel, findTrackerHits, trackerFinding } from './tracker-hits.js';

const ID = 'trackers-after-close';

export const trackersAfterClose: Rule = {
  id: ID,
  title: 'Closing the banner counts as consent',
  description:
    'Opt-in check. privalint closes the consent banner on the start page with its close button ' +
    '("×", "Schließen") in a fresh browser, reloads the page and records what loads. Closing a ' +
    'banner is no choice, so trackers that run afterwards treat it as consent.',
  references: ['Art. 4(11) GDPR', '§ 25 Abs. 1 TDDDG'],
  requires: ['after-close'],
  check({ page, lang, region }) {
    const close = page.consent?.close;
    const after = close?.afterClose;
    if (after === undefined) return [];
    const button = close?.closeLabel ?? '×';
    return findTrackerHits(
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
        ...trackerFinding(
          hit,
          lang,
          {
            message: {
              en: `${vendor} (${category}) runs after closing the banner with "${button}".`,
              de: `${vendor} (${category}) läuft, nachdem das Banner mit „${button}“ geschlossen wurde.`,
              hu: `${huArticle(vendor, true)} ${vendor} (${category}) fut, miután a bannert ${huArticle(button)} „${button}” gombbal bezárták.`,
              fr: `${vendor} (${category}) s'exécute après la fermeture du bandeau avec « ${button} ».`,
              it: `${vendor} (${category}) viene eseguito dopo la chiusura del banner con «${button}».`,
              es: `${vendor} (${category}) se ejecuta después de cerrar el banner con «${button}».`,
              pl: `${vendor} (${category}) działa po zamknięciu banera przyciskiem „${button}”.`,
            },
            grantedMessage: {
              en: `${vendor} tells Google that consent was granted after the banner was only closed with "${button}" (Google Consent Mode).`,
              de: `${vendor} meldet Google eine erteilte Einwilligung, nachdem das Banner nur mit „${button}“ geschlossen wurde (Google Consent Mode).`,
              hu: `${huArticle(vendor, true)} ${vendor} megadott hozzájárulást jelez a Google-nek, miután a bannert csak bezárták ${huArticle(button)} „${button}” gombbal (Google Consent Mode).`,
              fr: `${vendor} indique à Google que le consentement a été accordé alors que le bandeau a seulement été fermé avec « ${button} » (Google Consent Mode).`,
              it: `${vendor} comunica a Google che il consenso è stato concesso, anche se il banner è stato solo chiuso con «${button}» (Google Consent Mode).`,
              es: `${vendor} indica a Google que se concedió el consentimiento, aunque el banner solo se cerró con «${button}» (Google Consent Mode).`,
              pl: `${vendor} informuje Google o udzieleniu zgody, choć baner został tylko zamknięty przyciskiem „${button}” (Google Consent Mode).`,
            },
            fix: {
              en: `Treat closing the banner like no choice: keep ${vendor} blocked until the visitor accepts, or remove the close button.`,
              de: `Das Schließen des Banners wie keine Entscheidung behandeln: ${vendor} blockiert lassen, bis der Besucher zustimmt, oder die Schließen-Schaltfläche entfernen.`,
              hu: `A banner bezárását kezelje döntés hiányaként: ${huArticle(vendor)} ${vendor} maradjon blokkolva, amíg a látogató el nem fogadja, vagy távolítsa el a bezárás gombot.`,
              fr: `Traitez la fermeture du bandeau comme une absence de choix : gardez ${vendor} bloqué jusqu'à l'acceptation du visiteur, ou retirez le bouton de fermeture.`,
              it: `Tratta la chiusura del banner come nessuna scelta: mantieni ${vendor} bloccato finché il visitatore non accetta, oppure rimuovi il pulsante di chiusura.`,
              es: `Trata el cierre del banner como ausencia de elección: mantén ${vendor} bloqueado hasta que el visitante acepte, o elimina el botón de cierre.`,
              pl: `Traktuj zamknięcie banera jak brak wyboru: blokuj ${vendor}, dopóki odwiedzający nie zaakceptuje, albo usuń przycisk zamknięcia.`,
            },
            grantedFix: {
              en: 'Keep Google Consent Mode on "denied" until the visitor accepts: closing the banner must not update it to "granted". Check that no tag sets it to "granted" on its own.',
              de: 'Google Consent Mode auf „denied“ lassen, bis der Besucher zustimmt: Das Schließen des Banners darf ihn nicht auf „granted“ setzen. Prüfen, dass kein Tag ihn selbst auf „granted“ setzt.',
              hu: 'Tartsa a Google Consent Mode-ot „denied” értéken, amíg a látogató el nem fogadja: a banner bezárása nem frissítheti „granted” értékre. Ellenőrizze, hogy egyetlen címke se állítsa magától „granted” értékre.',
              fr: "Laissez Google Consent Mode sur « denied » jusqu'à l'acceptation du visiteur : fermer le bandeau ne doit pas le passer à « granted ». Vérifiez qu'aucune balise ne le passe à « granted » d'elle-même.",
              it: 'Mantieni Google Consent Mode su «denied» finché il visitatore non accetta: la chiusura del banner non deve aggiornarlo a «granted». Verifica che nessun tag lo imposti da solo su «granted».',
              es: 'Mantén Google Consent Mode en «denied» hasta que el visitante acepte: cerrar el banner no debe cambiarlo a «granted». Comprueba que ninguna etiqueta lo cambie a «granted» por su cuenta.',
              pl: 'Utrzymuj Google Consent Mode na „denied”, dopóki odwiedzający nie zaakceptuje: zamknięcie banera nie może zmienić go na „granted”. Sprawdź, czy żaden tag nie ustawia „granted” samodzielnie.',
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
