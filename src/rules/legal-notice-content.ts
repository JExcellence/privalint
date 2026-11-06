import { huArticle, type Lang, say } from '../i18n.js';
import type { Finding, Rule } from '../types.js';

const ID = 'legal-notice-content';

/**
 * Postcode and place: five digits in Germany, four in Austria, Switzerland and Hungary, optionally
 * with a country prefix ("D-", "A-", "CH-", "H-"), and the Hungarian order "Budapest, 1061". Every
 * format counts in every region: a Hungarian site may well be run from Germany.
 */
const POSTCODE =
  /\b(?:[A-Z]{1,2}-?\s?)?\d{4,5}\s+\p{Lu}|\p{Lu}\p{Ll}+,?\s+\d{4}\b|\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b|\b[AC-FHKNPRTV-Y]\d[\dW]\s?[AC-FHKNPRTV-Y\d]{4}\b/u;
// The last two: UK postcodes ("SW1A 2AA") and Irish Eircodes ("D04 E5W5").

/** A street with a house number, such as "Musterstraße 12", "Váci út 1." or "12 Main Street". */
const STREET =
  /\p{L}[\p{L}.'-]*(?:straße|strasse|str\.|weg|gasse|platz|allee|ring|damm|ufer|utca|út|tér|körút|street|road|avenue|lane|rue|via)?\s+\d+\s?[a-z]?\b|\b\d+[a-z]?,?\s+\p{L}+\s+(?:street|road|avenue|lane|st\.|rd\.)/iu;

/**
 * Numbers that look like a postcode or a house number but aren't: phone and fax numbers, tax and
 * register numbers, a copyright year. Removed before looking for the address.
 */
const NOT_ADDRESS =
  /\b(?:tel(?:efon)?|fax|phone|mobil(?:e)?|ust-?id\w*|vat|steuer\w*|adószám|hr[ab]|cg|fn|iban|bic)\b\.?:?\s*[^\n,;]*|(?:©|\bcopyright\b)[^\n]*/giu;

/** "(at)" and "[dot]" spellings count; a dot needs a letter right after it, as in a domain. */
const EMAIL =
  /[\w.+-]+\s?(?:@|\(at\)|\[at\]|\{at\}|\s(?:at|kukac)\s)\s?[\w-]+(?:(?:\.(?=\w)|\s?\(dot\)\s?|\s?\[dot\]\s?|\s(?:dot|pont)\s)[\w-]+)+/i;

/**
 * Legal forms that are entered in a commercial or association register. Not right after a number,
 * where "OG" and "UG" are floors ("12/3. OG").
 */
const REGISTERED_FORM =
  /(?<!\d[.,/]?\s?)\b(?:GmbH|gGmbH|UG|AG|KG|OHG|OG|e\.\s?K\.|e\.\s?Kfr\.|e\.\s?V\.|SE|PartG|KGaA|Kft\.?|Zrt\.?|Nyrt\.?|Bt\.?|Kkt\.?|Ltd\.?|Limited|S\.?à\s?r\.?l\.?|SARL)(?=[\s,.)]|$)/u;

/** Lines about other companies: the host, the web designer, image credits. */
const THIRD_PARTY_LINE =
  /hosting|hoster|webdesign|design|realisierung|umsetzung|programmierung|entwicklung|developed|foto|bild|photo|image|credits|icons?|google|tárhely|kivitelez/i;

/** The provider's legal form: the first one named outside lines about other companies. */
function legalForm(text: string): string | undefined {
  for (const line of text.split('\n')) {
    if (THIRD_PARTY_LINE.test(line)) continue;
    const form = REGISTERED_FORM.exec(line)?.[0];
    if (form !== undefined) return form;
  }
  return undefined;
}

const REGISTER =
  /handelsregister|registergericht|amtsgericht|vereinsregister|firmenbuch|\bHR[AB]\s?\d|\bVR\s?\d|\bFN\s?\d+\s?[a-z]\b|cégjegyzék|\bCg\.\s?\d|company\s+(?:number|no\.?|registration)|registration\s+number|registered\s+in|\bCHE-?\d{3}\.?\d{3}\.?\d{3}|handelsregisteramt/iu;

export const legalNoticeContent: Rule = {
  id: ID,
  title: 'The legal notice is missing required details',
  description:
    'A legal notice has to name the provider with a postal address and a way to reach them ' +
    'quickly by e-mail, and a register entry where the legal form has one. privalint reads the ' +
    'legal notice page linked from the start page and looks for these details.',
  references: ['§ 5 DDG', '§ 5 ECG', 'Ekertv. 4. §', 'Art. 5 Directive 2000/31/EC'],
  check({ page, lang }) {
    const notice = page.legalNotice;
    if (notice === undefined) return [];
    const text = notice.text;
    const findings: Finding[] = [];

    const missing: string[] = [];
    const addressText = text.replace(NOT_ADDRESS, ' ');
    if (!(POSTCODE.test(addressText) && STREET.test(addressText))) {
      missing.push(
        say(lang, { en: 'postal address', de: 'keine Postanschrift', hu: 'postai címet' }),
      );
    }
    if (!(notice.mailto || EMAIL.test(text))) {
      missing.push(
        say(lang, { en: 'e-mail address', de: 'keine E-Mail-Adresse', hu: 'e-mail-címet' }),
      );
    }
    if (missing.length > 0) {
      findings.push({
        ruleId: ID,
        severity: 'warning',
        subject: 'contact',
        message: say(lang, {
          en: `The legal notice gives no ${missing.join(' and no ')}.`,
          de: `Das Impressum nennt ${missing.join(' und ')}.`,
          hu: `Az impresszum nem ad meg ${missing.join(' és ')}.`,
        }),
        pageUrl: page.finalUrl,
        evidence: evidence(lang, notice.url, text),
        fix: say(lang, {
          en: 'Give the full name of the provider, a postal address that can receive mail (no P.O. box) and an e-mail address, as text on the legal notice page. A contact form alone is not enough.',
          de: 'Den vollständigen Namen des Anbieters, eine ladungsfähige Anschrift (kein Postfach) und eine E-Mail-Adresse als Text im Impressum angeben. Ein Kontaktformular allein reicht nicht.',
          hu: 'Adja meg szövegként az impresszumban a szolgáltató teljes nevét, egy kézbesítésre alkalmas postai címet (nem postafiókot) és egy e-mail-címet. Egy kapcsolatfelvételi űrlap önmagában nem elég.',
        }),
      });
    }

    const form = legalForm(text);
    if (form !== undefined && !REGISTER.test(text)) {
      findings.push({
        ruleId: ID,
        severity: 'info',
        subject: 'register',
        message: say(lang, {
          en: `The legal notice names the legal form ${form} but no register entry.`,
          de: `Das Impressum nennt die Rechtsform ${form}, aber keinen Registereintrag.`,
          hu: `Az impresszum megnevezi ${huArticle(form)} ${form} cégformát, de cégjegyzékszámot vagy más nyilvántartási adatot nem.`,
        }),
        pageUrl: page.finalUrl,
        evidence: [
          say(lang, {
            en: `legal notice: ${notice.url}`,
            de: `Impressum: ${notice.url}`,
            hu: `impresszum: ${notice.url}`,
          }),
          say(lang, {
            en: `legal form: ${form}`,
            de: `Rechtsform: ${form}`,
            hu: `cégforma: ${form}`,
          }),
        ],
        fix: say(lang, {
          en: 'Add the register, the register court or authority and the registration number, for example "Amtsgericht Berlin, HRB 12345" or "Cg. 01-09-123456".',
          de: 'Register, Registergericht und Registernummer ergänzen, etwa „Amtsgericht Berlin, HRB 12345“.',
          hu: 'Adja meg a nyilvántartást, a nyilvántartó bíróságot vagy hatóságot és a nyilvántartási számot, például „Fővárosi Törvényszék Cégbírósága, Cg. 01-09-123456”.',
        }),
      });
    }
    return findings;
  },
};

function evidence(lang: Lang, url: string, text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return [
    say(lang, { en: `legal notice: ${url}`, de: `Impressum: ${url}`, hu: `impresszum: ${url}` }),
    say(lang, {
      en: `legal notice text: ${words} words`,
      de: `Text des Impressums: ${words} Wörter`,
      hu: `az impresszum szövege: ${words} szó`,
    }),
  ];
}
