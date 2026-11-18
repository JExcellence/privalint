import { huArticle, say } from '../i18n.js';
import type { Rule } from '../types.js';

const ID = 'consent-settings-link';

export const consentSettingsLink: Rule = {
  id: ID,
  title: 'No way to reopen the cookie settings',
  description:
    'After the visitor rejected and the page reloaded, privalint looks for a visible link or ' +
    'button that reopens the consent settings, such as a "Cookie-Einstellungen" footer link or ' +
    'the floating button of the consent manager. Without one, a choice cannot be changed or ' +
    'withdrawn as easily as it was made.',
  references: ['Art. 7(3) GDPR'],
  check({ page, lang }) {
    const consent = page.consent;
    if (consent?.rejected !== true || consent.settingsControl?.found !== false) {
      return [];
    }
    const button =
      consent.rejectLabel ??
      say(lang, {
        en: 'reject',
        de: 'Ablehnen',
        hu: 'elutasítás',
        fr: 'Refuser',
        it: 'Rifiuta',
        es: 'Rechazar',
        pl: 'Odrzuć',
      });
    const evidence = [
      say(lang, {
        en: `Checked after clicking "${button}" and reloading`,
        de: `Geprüft nach Klick auf „${button}“ und Neuladen`,
        hu: `Ellenőrizve ${huArticle(button)} „${button}” gombra kattintás és az oldal újratöltése után`,
        fr: `Vérifié après un clic sur « ${button} » et le rechargement`,
        it: `Verificato dopo il clic su «${button}» e il ricaricamento`,
        es: `Comprobado tras pulsar «${button}» y recargar`,
        pl: `Sprawdzono po kliknięciu „${button}” i przeładowaniu`,
      }),
    ];
    if (consent.cmp !== undefined) {
      evidence.push(
        say(lang, {
          en: 'Consent manager: ',
          de: 'Consent-Tool: ',
          hu: 'Hozzájárulás-kezelő: ',
          fr: 'Gestionnaire de consentement : ',
          it: 'Gestore del consenso: ',
          es: 'Gestor de consentimiento: ',
          pl: 'Menedżer zgód: ',
        }) + consent.cmp,
      );
    }
    return [
      {
        ruleId: ID,
        severity: 'warning',
        message: say(lang, {
          en: 'No link or button to reopen the cookie settings was found after rejecting.',
          de: 'Nach dem Ablehnen wurde kein Link und kein Button gefunden, der die Cookie-Einstellungen wieder öffnet.',
          hu: 'Az elutasítás után nem található hivatkozás vagy gomb, amely újra megnyitná a sütibeállításokat.',
          fr: "Aucun lien ni bouton permettant de rouvrir les paramètres des cookies n'a été trouvé après le refus.",
          it: 'Dopo il rifiuto non è stato trovato alcun link o pulsante per riaprire le impostazioni dei cookie.',
          es: 'Después de rechazar no se encontró ningún enlace ni botón para volver a abrir la configuración de cookies.',
          pl: 'Po odrzuceniu nie znaleziono linku ani przycisku do ponownego otwarcia ustawień cookies.',
        }),
        pageUrl: page.finalUrl,
        evidence,
        fix: say(lang, {
          en:
            'Add a "Cookie settings" link to the footer of every page, or enable the floating ' +
            'button of your consent manager. Most offer a call for it, e.g. Cookiebot.renew(), ' +
            'UC_UI.showSecondLayer() (Usercentrics), Didomi.preferences.show() or the ' +
            'ot-sdk-show-settings class (OneTrust).',
          de:
            'Einen Link „Cookie-Einstellungen“ in den Footer jeder Seite setzen oder den ' +
            'schwebenden Button des Consent-Tools aktivieren. Die meisten bieten dafür einen ' +
            'Aufruf, z. B. Cookiebot.renew(), UC_UI.showSecondLayer() (Usercentrics), ' +
            'Didomi.preferences.show() oder die Klasse ot-sdk-show-settings (OneTrust).',
          hu:
            'Helyezzen el minden oldal láblécében egy „Sütibeállítások” hivatkozást, vagy ' +
            'kapcsolja be a hozzájárulás-kezelő lebegő gombját. A legtöbb ehhez hívást is kínál, ' +
            'pl. Cookiebot.renew(), UC_UI.showSecondLayer() (Usercentrics), ' +
            'Didomi.preferences.show() vagy az ot-sdk-show-settings osztály (OneTrust).',
          fr: 'Ajoutez un lien « Paramètres des cookies » dans le pied de chaque page, ou activez le bouton flottant de votre gestionnaire de consentement. La plupart proposent un appel pour cela, par exemple Cookiebot.renew(), UC_UI.showSecondLayer() (Usercentrics), Didomi.preferences.show() ou la classe ot-sdk-show-settings (OneTrust).',
          it: 'Aggiungi un link «Impostazioni cookie» nel piè di pagina di ogni pagina, oppure attiva il pulsante flottante del tuo gestore del consenso. La maggior parte offre una chiamata apposita, ad es. Cookiebot.renew(), UC_UI.showSecondLayer() (Usercentrics), Didomi.preferences.show() o la classe ot-sdk-show-settings (OneTrust).',
          es: 'Añade un enlace «Configuración de cookies» en el pie de cada página, o activa el botón flotante de tu gestor de consentimiento. La mayoría ofrece una llamada para ello, p. ej. Cookiebot.renew(), UC_UI.showSecondLayer() (Usercentrics), Didomi.preferences.show() o la clase ot-sdk-show-settings (OneTrust).',
          pl: 'Dodaj link „Ustawienia cookies” w stopce każdej strony albo włącz pływający przycisk menedżera zgód. Większość oferuje do tego wywołanie, np. Cookiebot.renew(), UC_UI.showSecondLayer() (Usercentrics), Didomi.preferences.show() lub klasę ot-sdk-show-settings (OneTrust).',
        }),
      },
    ];
  },
};
