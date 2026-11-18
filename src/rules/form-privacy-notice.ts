import { plPlural, say } from '../i18n.js';
import type { Rule } from '../types.js';
import { linkMatches } from './links.js';
import { PRIVACY_POLICY } from './privacy-policy-link.js';

const ID = 'form-privacy-notice';

export const formPrivacyNotice: Rule = {
  id: ID,
  title: 'A form collects personal data without a privacy notice next to it',
  description:
    'Contact, sign-up and login forms collect personal data, and Art. 13 GDPR asks for the ' +
    'information at the time of collection. privalint notes forms with an email, phone or ' +
    'password field that have no link to the privacy policy in or right around them. Only info: ' +
    'whether the footer link is enough is not settled.',
  references: ['Art. 13 DSGVO'],
  check({ page, lang }) {
    const bare = (page.forms ?? []).filter((form) => !form.privacyNearby);
    // Without any privacy link on the page, privacy-policy-link already warns.
    if (bare.length === 0 || !page.links.some(linkMatches(PRIVACY_POLICY))) return [];
    const kinds = [...new Set(bare.map((form) => form.kind))].map((kind) =>
      kind === 'login'
        ? say(lang, {
            en: 'login',
            de: 'Login',
            hu: 'bejelentkezés',
            fr: 'connexion',
            it: 'accesso',
            es: 'inicio de sesión',
            pl: 'logowanie',
          })
        : say(lang, {
            en: 'contact or sign-up',
            de: 'Kontakt oder Anmeldung',
            hu: 'kapcsolatfelvétel vagy regisztráció',
            fr: 'contact ou inscription',
            it: 'contatto o registrazione',
            es: 'contacto o registro',
            pl: 'kontakt lub rejestracja',
          }),
    );
    return [
      {
        ruleId: ID,
        severity: 'info',
        message: say(lang, {
          en: `${bare.length} form(s) collecting personal data (${kinds.join(', ')}) have no link to the privacy policy next to them.`,
          de: `${bare.length} Formular(e), die personenbezogene Daten erheben (${kinds.join(', ')}), haben keinen Link zur Datenschutzerklärung in der Nähe.`,
          hu: `${bare.length} személyes adatokat gyűjtő űrlap (${kinds.join(', ')}) mellett nincs hivatkozás az adatkezelési tájékoztatóra.`,
          fr: `${bare.length} ${bare.length <= 1 ? 'formulaire' : 'formulaires'} collectant des données personnelles (${kinds.join(', ')}) ${bare.length <= 1 ? "n'a" : "n'ont"} pas de lien vers la politique de confidentialité à proximité.`,
          it: `${bare.length} ${bare.length === 1 ? 'modulo che raccoglie' : 'moduli che raccolgono'} dati personali (${kinds.join(', ')}) ${bare.length === 1 ? 'non ha' : 'non hanno'} accanto un link all'informativa sulla privacy.`,
          es: `${bare.length} ${bare.length === 1 ? 'formulario que recoge' : 'formularios que recogen'} datos personales (${kinds.join(', ')}) no ${bare.length === 1 ? 'tiene' : 'tienen'} al lado un enlace a la política de privacidad.`,
          pl: `${bare.length} ${plPlural(bare.length, 'formularz zbierający', 'formularze zbierające', 'formularzy zbierających')} dane osobowe (${kinds.join(', ')}) nie ${plPlural(bare.length, 'ma', 'mają', 'ma')} obok linku do polityki prywatności.`,
        }),
        pageUrl: page.finalUrl,
        evidence: [
          say(lang, {
            en: `${page.forms?.length ?? 0} forms with email, phone or password fields checked`,
            de: `${page.forms?.length ?? 0} Formulare mit E-Mail-, Telefon- oder Passwortfeld geprüft`,
            hu: `${page.forms?.length ?? 0} e-mail-, telefon- vagy jelszómezőt tartalmazó űrlap ellenőrizve`,
            fr: `${page.forms?.length ?? 0} formulaires avec champs e-mail, téléphone ou mot de passe vérifiés`,
            it: `${page.forms?.length ?? 0} moduli con campi e-mail, telefono o password verificati`,
            es: `${page.forms?.length ?? 0} formularios con campos de correo electrónico, teléfono o contraseña comprobados`,
            pl: `Sprawdzone formularze z polami e-mail, telefonu lub hasła: ${page.forms?.length ?? 0}`,
          }),
        ],
        fix: say(lang, {
          en: 'Add a short line under the form, e.g. "We use your data to answer your request. Details: Privacy policy", with the link.',
          de: 'Unter dem Formular eine kurze Zeile ergänzen, z. B. „Wir verwenden Ihre Angaben, um Ihre Anfrage zu beantworten. Details: Datenschutzerklärung“, mit Link.',
          hu: 'Helyezzen el egy rövid sort az űrlap alatt, pl. „Adatait a megkeresés megválaszolásához használjuk. Részletek: Adatkezelési tájékoztató”, hivatkozással.',
          fr: 'Ajoutez une courte ligne sous le formulaire, par exemple « Nous utilisons vos données pour répondre à votre demande. Détails : Politique de confidentialité », avec le lien.',
          it: 'Aggiungi una breve riga sotto il modulo, ad es. «Usiamo i tuoi dati per rispondere alla tua richiesta. Dettagli: Informativa sulla privacy», con il link.',
          es: 'Añade una línea breve bajo el formulario, p. ej. «Usamos tus datos para responder a tu solicitud. Más información: Política de privacidad», con el enlace.',
          pl: 'Dodaj pod formularzem krótką linijkę, np. „Używamy Twoich danych, aby odpowiedzieć na zapytanie. Szczegóły: Polityka prywatności”, z linkiem.',
        }),
      },
    ];
  },
};
