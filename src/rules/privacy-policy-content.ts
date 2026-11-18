import { type Lang, say } from '../i18n.js';
import type { Finding, LinkedPageText, Rule } from '../types.js';
import { hasAddress, hasEmail } from './contact-details.js';

const ID = 'privacy-policy-content';

/**
 * Text left over from a privacy policy template: bracketed fields, sample names and addresses,
 * filler text. "example.com" counts only as part of an e-mail address or URL.
 */
const PLACEHOLDERS: readonly RegExp[] = [
  /\[\s*(?:name|vorname|nachname|firma|firmenname|unternehmen|company(?:\s+name)?|your\s+(?:name|company|address|e-?mail)|ihr(?:e)?\s+(?:name|firma|adresse|anschrift|e-?mail)|adresse|address|anschrift|stra(?:ß|ss)e|street|plz|ort|city|e-?mail|telefon|phone|datum|date|cégnév|név|cím|székhely)[^\]]{0,30}\]/iu,
  /\bMusterstra(?:ß|ss)e\b/iu,
  /\b(?:Max|Erika)\s+Muster(?:mann|frau)\b/u,
  /\bMusterfirma\b|\bMuster\s?GmbH\b/u,
  /\blorem\s+ipsum\b/i,
  /[@/.]example\.(?:com|org|net)\b/i,
];

/** A data protection officer, in the languages privalint reads. */
const DPO =
  /datenschutzbeauftragte|data\s+protection\s+officer|\bDPO\b|adatvédelmi\s+tisztviselő/iu;

/** "We have not appointed a data protection officer": nothing to reach. */
const NO_DPO =
  /\b(?:kein(?:en|e)?|nicht|not|no|none)\b|\bnincs\b|nem\s+(?:jelöl|kötelez|nevez)|nem\s+rendelkez/iu;

const PHONE = /(?:tel(?:efon)?|phone|fon)\.?\s*:?\s*\+?[\d\s/()-]{6,}/i;

/** Lines searched for the officer's contact details, from the line that names them. */
const DPO_WINDOW = 6;

export const privacyPolicyContent: Rule = {
  id: ID,
  title: 'The privacy policy names no controller contact',
  description:
    'A privacy policy has to name the controller with contact details and, where one is ' +
    'appointed, how to reach the data protection officer. privalint reads the privacy policy ' +
    'linked from the start page and looks for contact details and leftover template text.',
  references: ['Art. 13(1)(a) GDPR', 'Art. 13(1)(b) GDPR'],
  check({ page, lang }) {
    const policy = page.privacyPolicy;
    if (policy === undefined) return [];
    const text = policy.text;
    const findings: Finding[] = [];
    const finding = (
      severity: Finding['severity'],
      subject: string,
      message: string,
      fix: string,
      extra: string[] = [],
    ): Finding => ({
      ruleId: ID,
      severity,
      subject,
      message,
      pageUrl: page.finalUrl,
      evidence: [policyEvidence(lang, policy), ...extra],
      fix,
    });

    if (!hasEmail(text, policy.mailto) && !hasAddress(text)) {
      // An overview page that links the actual notices, or a linked cookie policy that could not
      // be read, may name the controller there.
      const further = [...(policy.linkedDocuments ?? []), ...(policy.unread ?? [])];
      const notRead = further.map((url) =>
        say(lang, {
          en: `not read: ${url}`,
          de: `nicht gelesen: ${url}`,
          hu: `nem olvasva: ${url}`,
          fr: `non lu : ${url}`,
          it: `non letto: ${url}`,
          es: `no leída: ${url}`,
          pl: `nie przeczytano: ${url}`,
        }),
      );
      findings.push(
        finding(
          further.length > 0 ? 'info' : 'warning',
          'contact',
          further.length > 0
            ? say(lang, {
                en: 'The privacy policy page gives no e-mail address and no postal address of the controller. It links further privacy documents, which may name them.',
                de: 'Die Datenschutz-Seite nennt weder eine E-Mail-Adresse noch eine Postanschrift des Verantwortlichen. Sie verlinkt weitere Datenschutzdokumente, die sie nennen können.',
                hu: 'Az adatvédelmi oldal nem ad meg sem e-mail-címet, sem postai címet az adatkezelőről. További adatvédelmi dokumentumokra hivatkozik, amelyek tartalmazhatják.',
                fr: "La page de confidentialité n'indique ni adresse e-mail ni adresse postale du responsable du traitement. Elle renvoie vers d'autres documents de confidentialité qui peuvent les indiquer.",
                it: "La pagina dell'informativa sulla privacy non indica né un indirizzo e-mail né un indirizzo postale del titolare. Rimanda ad altri documenti sulla privacy, che potrebbero indicarli.",
                es: 'La página de la política de privacidad no indica ni una dirección de correo electrónico ni una dirección postal del responsable. Enlaza otros documentos de privacidad, que pueden indicarlas.',
                pl: 'Strona polityki prywatności nie podaje ani adresu e-mail, ani adresu pocztowego administratora. Zawiera linki do dalszych dokumentów o prywatności, które mogą je podawać.',
              })
            : say(lang, {
                en: 'The privacy policy gives no e-mail address and no postal address of the controller.',
                de: 'Die Datenschutzerklärung nennt weder eine E-Mail-Adresse noch eine Postanschrift des Verantwortlichen.',
                hu: 'Az adatvédelmi tájékoztató nem ad meg sem e-mail-címet, sem postai címet az adatkezelőről.',
                fr: "La politique de confidentialité n'indique ni adresse e-mail ni adresse postale du responsable du traitement.",
                it: "L'informativa sulla privacy non indica né un indirizzo e-mail né un indirizzo postale del titolare.",
                es: 'La política de privacidad no indica ni una dirección de correo electrónico ni una dirección postal del responsable.',
                pl: 'Polityka prywatności nie podaje ani adresu e-mail, ani adresu pocztowego administratora.',
              }),
          say(lang, {
            en: 'Name the controller (the company or person running the site) with a postal address and an e-mail address in the privacy policy.',
            de: 'Den Verantwortlichen (Unternehmen oder Person hinter der Website) mit Postanschrift und E-Mail-Adresse in der Datenschutzerklärung nennen.',
            hu: 'Nevezze meg az adatvédelmi tájékoztatóban az adatkezelőt (a webhelyet üzemeltető céget vagy személyt) postai címmel és e-mail-címmel.',
            fr: "Nommez dans la politique de confidentialité le responsable du traitement (l'entreprise ou la personne qui exploite le site) avec une adresse postale et une adresse e-mail.",
            it: "Indica nell'informativa sulla privacy il titolare (l'azienda o la persona che gestisce il sito) con un indirizzo postale e un indirizzo e-mail.",
            es: 'Indica en la política de privacidad al responsable (la empresa o persona que gestiona el sitio) con una dirección postal y una dirección de correo electrónico.',
            pl: 'Wskaż w polityce prywatności administratora (firmę lub osobę prowadzącą witrynę) wraz z adresem pocztowym i adresem e-mail.',
          }),
          notRead,
        ),
      );
    }

    const placeholders = templateText(text);
    if (placeholders.length > 0) {
      findings.push(
        finding(
          'warning',
          'placeholder',
          say(lang, {
            en: `The privacy policy still contains template text: ${placeholders.join(', ')}.`,
            de: `Die Datenschutzerklärung enthält noch Vorlagentext: ${placeholders.join(', ')}.`,
            hu: `Az adatvédelmi tájékoztató még sablonszöveget tartalmaz: ${placeholders.join(', ')}.`,
            fr: `La politique de confidentialité contient encore du texte de modèle : ${placeholders.map((placeholder) => `« ${placeholder} »`).join(', ')}.`,
            it: `L'informativa sulla privacy contiene ancora testo di modello: ${placeholders.map((placeholder) => `«${placeholder}»`).join(', ')}.`,
            es: `La política de privacidad todavía contiene texto de plantilla: ${placeholders.map((placeholder) => `«${placeholder}»`).join(', ')}.`,
            pl: `Polityka prywatności nadal zawiera tekst szablonu: ${placeholders.map((placeholder) => `„${placeholder}”`).join(', ')}.`,
          }),
          say(lang, {
            en: 'Replace the placeholders with the real name, address and contact details, and remove sample text.',
            de: 'Die Platzhalter durch den echten Namen, die Anschrift und die Kontaktdaten ersetzen und Beispieltext entfernen.',
            hu: 'Cserélje a helyőrzőket a valódi névre, címre és elérhetőségre, és távolítsa el a mintaszöveget.',
            fr: "Remplacez les espaces réservés par le vrai nom, l'adresse et les coordonnées, et supprimez le texte d'exemple.",
            it: "Sostituisci i segnaposto con il nome, l'indirizzo e i dati di contatto reali, e rimuovi il testo di esempio.",
            es: 'Sustituye los marcadores de posición por el nombre, la dirección y los datos de contacto reales, y elimina el texto de ejemplo.',
            pl: 'Zastąp symbole zastępcze prawdziwą nazwą, adresem i danymi kontaktowymi oraz usuń przykładowy tekst.',
          }),
        ),
      );
    }

    if (dpoWithoutContact(text)) {
      findings.push(
        finding(
          'info',
          'dpo',
          say(lang, {
            en: 'The privacy policy mentions a data protection officer but no way to reach them.',
            de: 'Die Datenschutzerklärung erwähnt einen Datenschutzbeauftragten, aber keinen Weg, ihn zu erreichen.',
            hu: 'Az adatvédelmi tájékoztató említ adatvédelmi tisztviselőt, de elérhetőséget nem ad meg hozzá.',
            fr: 'La politique de confidentialité mentionne un délégué à la protection des données, mais aucun moyen de le joindre.',
            it: "L'informativa sulla privacy menziona un responsabile della protezione dei dati, ma non come contattarlo.",
            es: 'La política de privacidad menciona un delegado de protección de datos, pero no cómo contactarlo.',
            pl: 'Polityka prywatności wspomina o inspektorze ochrony danych, ale nie podaje, jak się z nim skontaktować.',
          }),
          say(lang, {
            en: 'Give an e-mail address, postal address or phone number for the data protection officer next to where they are named (Art. 13(1)(b) GDPR).',
            de: 'Neben der Nennung des Datenschutzbeauftragten eine E-Mail-Adresse, Postanschrift oder Telefonnummer angeben (Art. 13 Abs. 1 lit. b DSGVO).',
            hu: 'Adjon meg e-mail-címet, postai címet vagy telefonszámot az adatvédelmi tisztviselőhöz ott, ahol megnevezi (GDPR 13. cikk (1) b)).',
            fr: 'Indiquez une adresse e-mail, une adresse postale ou un numéro de téléphone du délégué à la protection des données là où il est nommé (art. 13, par. 1, b) du RGPD).',
            it: 'Indica un indirizzo e-mail, un indirizzo postale o un numero di telefono del responsabile della protezione dei dati accanto al punto in cui è nominato (art. 13, par. 1, lett. b, GDPR).',
            es: 'Indica una dirección de correo electrónico, una dirección postal o un teléfono del delegado de protección de datos junto al lugar donde se le nombra (art. 13.1.b RGPD).',
            pl: 'Podaj adres e-mail, adres pocztowy lub numer telefonu inspektora ochrony danych obok miejsca, w którym jest wymieniony (art. 13 ust. 1 lit. b RODO).',
          }),
        ),
      );
    }
    return findings;
  },
};

/** The template fragments found, each once, at most three. */
function templateText(text: string): string[] {
  const found = new Set<string>();
  for (const pattern of PLACEHOLDERS) {
    const match = pattern.exec(text)?.[0];
    if (match !== undefined) found.add(`"${match.replace(/^[@/.]/, '').trim()}"`);
  }
  return [...found].slice(0, 3);
}

/**
 * A line naming a data protection officer, without a statement that there is none, and no e-mail,
 * address or phone number in that line or the few lines after it.
 */
function dpoWithoutContact(text: string): boolean {
  const lines = text.split('\n').filter((line) => line.trim() !== '');
  let named = false;
  for (const [index, line] of lines.entries()) {
    if (!DPO.test(line) || NO_DPO.test(line)) continue;
    named = true;
    const window = lines.slice(index, index + DPO_WINDOW).join('\n');
    if (hasEmail(window, false) || hasAddress(window) || PHONE.test(window)) return false;
  }
  return named;
}

function policyEvidence(lang: Lang, policy: LinkedPageText): string {
  return say(lang, {
    en: `privacy policy: ${policy.url}`,
    de: `Datenschutzerklärung: ${policy.url}`,
    hu: `adatvédelmi tájékoztató: ${policy.url}`,
    fr: `politique de confidentialité : ${policy.url}`,
    it: `informativa sulla privacy: ${policy.url}`,
    es: `política de privacidad: ${policy.url}`,
    pl: `polityka prywatności: ${policy.url}`,
  });
}
