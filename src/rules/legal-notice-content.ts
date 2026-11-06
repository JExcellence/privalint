import { huArticle, type Lang, say, type Text } from '../i18n.js';
import type { Finding, LinkedPageText, Rule } from '../types.js';
import { hasAddress, hasEmail } from './contact-details.js';

const ID = 'legal-notice-content';

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
  check({ page, lang, region }) {
    const notice = page.legalNotice;
    if (notice === undefined) return [];
    const text = notice.text;
    const name = noticeName(notice);
    const findings: Finding[] = [];

    const missing: string[] = [];
    if (!hasAddress(text)) {
      missing.push(
        say(lang, { en: 'postal address', de: 'keine Postanschrift', hu: 'postai címet' }),
      );
    }
    if (!hasEmail(text, notice.mailto)) {
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
          en: `${name.en} gives no ${missing.join(' and no ')}.`,
          de: `${name.de} nennt ${missing.join(' und ')}.`,
          hu: `${name.hu} nem ad meg ${missing.join(' és ')}.`,
        }),
        pageUrl: page.finalUrl,
        evidence: evidence(lang, notice),
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
          en: `${name.en} names the legal form ${form} but no register entry.`,
          de: `${name.de} nennt die Rechtsform ${form}, aber keinen Registereintrag.`,
          hu: `${name.hu} megnevezi ${huArticle(form)} ${form} cégformát, de cégjegyzékszámot vagy más nyilvántartási adatot nem.`,
        }),
        pageUrl: page.finalUrl,
        evidence: [
          noticeEvidence(lang, notice),
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
    findings.push(...regionDetails(region, form, notice, name, lang, page.finalUrl));
    // A page read in place of a legal notice may not be meant as one.
    return notice.readAs === undefined
      ? findings
      : findings.map((finding) => ({ ...finding, severity: 'info' }));
  },
};

/** Hungarian tax numbers: 8 digits, the VAT code and the county code ("12345678-2-42"). */
const HU_TAX_NUMBER = /adószám|\b\d{8}-\d-\d{2}\b/i;
const AT_MEDIA_DISCLOSURE = /offenlegung|§\s?25\s?medieng|mediengesetz/i;

/**
 * Details only some regions ask for: the tax number of a Hungarian business (Ekertv. 4. §) and the
 * Austrian media disclosure (§ 25 MedienG). Noted as info.
 */
function regionDetails(
  region: string | undefined,
  form: string | undefined,
  notice: LinkedPageText,
  name: Text,
  lang: Lang,
  pageUrl: string,
): Finding[] {
  const text = notice.text;
  const finding = (subject: string, message: Text, fix: Text): Finding => ({
    ruleId: ID,
    severity: 'info',
    subject,
    message: say(lang, message),
    pageUrl,
    evidence: [noticeEvidence(lang, notice)],
    fix: say(lang, fix),
  });
  if (region === 'hu' && form !== undefined && !HU_TAX_NUMBER.test(text)) {
    return [
      finding(
        'tax-number',
        {
          en: `${name.en} names the legal form ${form} but no tax number.`,
          de: `${name.de} nennt die Rechtsform ${form}, aber keine Steuernummer.`,
          hu: `${name.hu} megnevezi ${huArticle(form)} ${form} cégformát, de adószámot nem.`,
        },
        {
          en: 'Add the tax number (adószám) of the business, as Ekertv. 4. § asks for it.',
          de: 'Die Steuernummer (adószám) des Unternehmens ergänzen, wie es Ekertv. 4. § verlangt.',
          hu: 'Adja meg a vállalkozás adószámát, ahogy az Ekertv. 4. §-a előírja.',
        },
      ),
    ];
  }
  if (region === 'at' && !AT_MEDIA_DISCLOSURE.test(text)) {
    return [
      finding(
        'media-disclosure',
        {
          en: `${name.en} has no media disclosure (Offenlegung).`,
          de: `${name.de} enthält keine Offenlegung nach dem Mediengesetz.`,
          hu: `${name.hu} nem tartalmaz médiatörvény szerinti közzétételt (Offenlegung).`,
        },
        {
          en: 'Add a disclosure under § 25 MedienG: owner, purpose of the site and its basic direction. Most Austrian websites need one.',
          de: 'Eine Offenlegung nach § 25 MedienG ergänzen: Medieninhaber, Unternehmensgegenstand und grundlegende Richtung. Die meisten österreichischen Websites brauchen sie.',
          hu: 'Egészítse ki a § 25 MedienG szerinti közzététellel: médiatulajdonos, tevékenység és alapvető irány. A legtöbb osztrák webhelynek szüksége van rá.',
        },
      ),
    ];
  }
  return [];
}

/** What the read page is called in messages: the legal notice, or what was read in its place. */
function noticeName(notice: LinkedPageText): Text {
  const readAs = notice.readAs;
  if (readAs === undefined) {
    return { en: 'The legal notice', de: 'Das Impressum', hu: 'Az impresszum' };
  }
  if (readAs.source === 'privacy-policy') {
    return {
      en: 'The privacy policy, read because no legal notice is linked,',
      de: 'Die Datenschutzerklärung (gelesen, weil kein Impressum verlinkt ist)',
      hu: 'Az adatvédelmi tájékoztató (impresszum-hivatkozás hiányában olvasva)',
    };
  }
  const label = readAs.label.trim() || '…';
  return {
    en: `The page "${label}", read because no legal notice is linked,`,
    de: `Die Seite „${label}“ (gelesen, weil kein Impressum verlinkt ist)`,
    hu: `${huArticle(label, true)} „${label}” oldal (impresszum-hivatkozás hiányában olvasva)`,
  };
}

function noticeEvidence(lang: Lang, notice: LinkedPageText): string {
  const url = notice.url;
  if (notice.readAs?.source === 'privacy-policy') {
    return say(lang, {
      en: `privacy policy, read instead: ${url}`,
      de: `Datenschutzerklärung, ersatzweise gelesen: ${url}`,
      hu: `adatvédelmi tájékoztató, helyette olvasva: ${url}`,
    });
  }
  if (notice.readAs?.source === 'legal-link') {
    return say(lang, {
      en: `legal page, read instead: ${url}`,
      de: `Rechtsseite, ersatzweise gelesen: ${url}`,
      hu: `jogi oldal, helyette olvasva: ${url}`,
    });
  }
  return say(lang, {
    en: `legal notice: ${url}`,
    de: `Impressum: ${url}`,
    hu: `impresszum: ${url}`,
  });
}

function evidence(lang: Lang, notice: LinkedPageText): string[] {
  const words = notice.text.trim().split(/\s+/).filter(Boolean).length;
  return [
    noticeEvidence(lang, notice),
    say(lang, {
      en: `legal notice text: ${words} words`,
      de: `Text des Impressums: ${words} Wörter`,
      hu: `az impresszum szövege: ${words} szó`,
    }),
  ];
}
