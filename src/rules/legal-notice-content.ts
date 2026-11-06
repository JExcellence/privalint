import { huArticle, type Lang, say } from '../i18n.js';
import type { Finding, Rule } from '../types.js';

const ID = 'legal-notice-content';

/**
 * Postcode and place: five digits in Germany, four in Austria, Switzerland and Hungary, optionally
 * with a country prefix ("D-", "A-", "CH-", "H-"), and the Hungarian order "Budapest, 1061". Every
 * format counts in every region: a Hungarian site may well be run from Germany.
 */
const POSTCODE = /\b(?:[A-Z]{1,2}-?\s?)?\d{4,5}\s+\p{Lu}|\p{Lu}\p{Ll}+,?\s+\d{4}\b/u;

/** A street with a house number, such as "Musterstraße 12", "Váci út 1." or "12 Main Street". */
const STREET =
  /\p{L}[\p{L}.'-]*(?:straße|strasse|str\.|weg|gasse|platz|allee|ring|damm|ufer|utca|út|tér|körút|street|road|avenue|lane|rue|via)?\s+\d+\s?[a-z]?\b|\b\d+[a-z]?,?\s+\p{L}+\s+(?:street|road|avenue|lane|st\.|rd\.)/iu;

const EMAIL =
  /[\w.+-]+\s?(?:@|\(at\)|\[at\]|\{at\}|\s(?:at|kukac)\s)\s?[\w-]+(?:\s?(?:\.|\(dot\)|\[dot\]|\s(?:dot|pont)\s)\s?[\w-]+)+/i;

/** Legal forms that are entered in a commercial or association register. */
const REGISTERED_FORM =
  /\b(?:GmbH|gGmbH|UG|AG|KG|OHG|OG|e\.\s?K\.|e\.\s?Kfr\.|e\.\s?V\.|SE|PartG|KGaA|Kft\.?|Zrt\.?|Nyrt\.?|Bt\.?|Kkt\.?|Ltd\.?|Limited|S\.?à\s?r\.?l\.?|SARL)(?=[\s,.)]|$)/u;

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
    if (!(POSTCODE.test(text) && STREET.test(text))) {
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

    const form = REGISTERED_FORM.exec(text)?.[0];
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
