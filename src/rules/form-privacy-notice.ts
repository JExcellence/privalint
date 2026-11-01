import { say } from '../i18n.js';
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
        ? say(lang, { en: 'login', de: 'Login' })
        : say(lang, { en: 'contact or sign-up', de: 'Kontakt oder Anmeldung' }),
    );
    return [
      {
        ruleId: ID,
        severity: 'info',
        message: say(lang, {
          en: `${bare.length} form(s) collecting personal data (${kinds.join(', ')}) have no link to the privacy policy next to them.`,
          de: `${bare.length} Formular(e), die personenbezogene Daten erheben (${kinds.join(', ')}), haben keinen Link zur Datenschutzerklärung in der Nähe.`,
        }),
        pageUrl: page.finalUrl,
        evidence: [
          say(lang, {
            en: `${page.forms?.length ?? 0} forms with email, phone or password fields checked`,
            de: `${page.forms?.length ?? 0} Formulare mit E-Mail-, Telefon- oder Passwortfeld geprüft`,
          }),
        ],
        fix: say(lang, {
          en: 'Add a short line under the form, e.g. "We use your data to answer your request. Details: Privacy policy", with the link.',
          de: 'Unter dem Formular eine kurze Zeile ergänzen, z. B. „Wir verwenden Ihre Angaben, um Ihre Anfrage zu beantworten. Details: Datenschutzerklärung“, mit Link.',
        }),
      },
    ];
  },
};
