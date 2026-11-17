import { huArticle, type Lang, say, type Text } from '../i18n.js';
import type { Region } from '../legal.js';
import type { Finding, LinkedPageText, Rule } from '../types.js';
import { hasAddress, hasEmail } from './contact-details.js';

const ID = 'legal-notice-content';

/**
 * Legal forms that are entered in a commercial or association register. Not right after a number,
 * where "OG" and "UG" are floors ("12/3. OG").
 */
const REGISTERED_FORM =
  /(?<!\d[.,/]?\s?)\b(?:GmbH|gGmbH|UG|AG|KG|OHG|OG|e\.\s?K\.|e\.\s?Kfr\.|e\.\s?V\.|SE|PartG|KGaA|Kft\.?|Zrt\.?|Nyrt\.?|Bt\.?|Kkt\.?|Ltd\.?|Limited|PLC|LLP|S\.?à\s?r\.?l\.?|SARL|SASU?|EURL|SNC|S\.?r\.?l\.?(?:s\.?)?|S\.?a\.?p\.?A\.?|S\.?p\.?A\.?|S\.L\.(?:U\.)?|S\.A\.(?:U\.)?|[BN]\.V\.|(?:SLU?|SAU?|[BN]V)(?![\s,]*\d)|[Ss]p\.\s?z\s?o\.\s?o\.)(?=[\s,.)]|$)/u;

/** Lines about other companies: the host, the web designer, image credits. */
const THIRD_PARTY_WORD = String.raw`(?:hosting|hoster|h[ée]berg\p{L}*|software|logiciel|web\s?design|design|gestaltung|konzeption|realisier\p{L}*|r[ée]alis\p{L}*|cr[ée]ation|umsetzung|umgesetzt|programmierung|entwicklung|entwickelt|developed|built|website|fotos?|bild(?:er|nachweis\p{L}*|quellen?|rechte)?|photos?|images?|credits|icons?|tárhely\p{L}*|kivitelez\p{L}*)(?!\p{L})`;
/**
 * A mention of another company: one of the words above used as a label, that is after a
 * separator, before a colon or "by", or after "by"; and any mention of Google. "Muster Software
 * GmbH", "Design Müller GmbH" or "Fotostudio Müller GmbH" is the provider itself.
 */
const THIRD_PARTY_LINE = new RegExp(
  [
    String.raw`(?:\s[-–|•·]|[,;(/])\s*${THIRD_PARTY_WORD}`,
    String.raw`${THIRD_PARTY_WORD}(?=\s*:|\s+(?:by|von|durch|par|bei)\b)`,
    String.raw`\b(?:by|von|durch|par|bei)\s+${THIRD_PARTY_WORD}`,
    String.raw`\bgoogle\b`,
  ].join('|'),
  'iu',
);

/**
 * The provider's legal form: the first one named outside mentions of other companies. A line such
 * as "Éditeur : X SARL - Hébergeur : OVH SAS" counts up to the mention of the host.
 */
function legalForm(text: string): string | undefined {
  for (const line of text.split('\n')) {
    const other = THIRD_PARTY_LINE.exec(line);
    const own = other === null ? line : line.slice(0, other.index);
    const form = REGISTERED_FORM.exec(own)?.[0];
    if (form !== undefined) return form;
  }
  return undefined;
}

const REGISTER =
  /handelsregister|registergericht|amtsgericht|vereinsregister|firmenbuch|\bHR[AB]\s?\d|\bVR\s?\d|\bFN\s?\d+\s?[a-z]\b|cégjegyzék|\bCg\.\s?\d|company\s+(?:number|no\.?|registration)|registration\s+number|registered\s+in|\bCHE-?\d{3}\.?\d{3}\.?\d{3}|handelsregisteramt|\bRCS\b|\bSIRE[NT]\b|registre\s+du\s+commerce|registro\s+(?:delle\s+)?imprese|registro\s+mercantil|kamer\s+van\s+koophandel/iu;
/** Register acronyms, case-sensitive so that names such as "Rea" don't count. */
const KRS_NUMBER = /\bKRS\b/u;
const REGISTER_CODE = new RegExp(String.raw`\bR\.?E\.?A\b|\bKvK\b|${KRS_NUMBER.source}`, 'u');

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
    if (form !== undefined && !REGISTER.test(text) && !REGISTER_CODE.test(text)) {
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
/** The host (hébergeur) and the publication director a French legal notice names (LCEN). */
const FR_HOST = /h[ée]bergeur|h[ée]berg[ée]e?\s+par|h[ée]bergement|\bhost(?:ed|ing)?\b|\bhoster\b/i;
const FR_DIRECTOR =
  /direct(?:eur|rice)\s+de\s+(?:la\s+)?publication|responsable\s+de\s+(?:la\s+)?publication/i;
/** The Italian VAT number (partita IVA, "IT" and 11 digits); Art. 35 DPR 633/1972. */
const IT_VAT_NUMBER =
  /partita\s+i\.?v\.?a|\bp\.\s?i\.?\s?v\.?a\b|\bIT\s?\d{11}\b|\bVAT\b[^\n\d]{0,20}\d{11}\b/i;
/** The Spanish tax number (NIF, formerly CIF) the LSSI asks for (Art. 10.1 e LSSI). */
const ES_TAX_NUMBER = /\bN\.?I\.?F\b|\bC\.?I\.?F\b|\b(?:ES)?[A-HJNP-SUVW]-?\d{7}[0-9A-J]\b/;
/** The Polish companies whose website must show the KSH details (Art. 206 § 1 and 374 § 1 KSH). */
const PL_COMPANY = /^(?:[Ss]p\.\s?z\s?o\.\s?o\.|S\.?A\.?)$/;
const PL_DETAILS: { pattern: RegExp; label: Text }[] = [
  { pattern: KRS_NUMBER, label: { en: 'KRS number', de: 'KRS-Nummer', hu: 'KRS-számot' } },
  { pattern: /\bNIP\b/, label: { en: 'NIP', de: 'NIP', hu: 'NIP-számot' } },
  {
    pattern: /kapita[łl]\S*\s+zak[łl]adow|share\s+capital/i,
    label: { en: 'share capital', de: 'Stammkapital', hu: 'jegyzett tőkét' },
  },
];

/**
 * Details only some regions ask for: the tax number of a Hungarian business (Ekertv. 4. §), the
 * Austrian media disclosure (§ 25 MedienG), the host and publication director of a French site
 * (LCEN), the Italian partita IVA, the Spanish NIF and the KRS, NIP and share capital of a Polish
 * company. Noted as info.
 */
function regionDetails(
  region: Region | undefined,
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
  if (region === 'fr') {
    const hostMissing = !FR_HOST.test(text);
    const directorMissing = !FR_DIRECTOR.test(text);
    if (!hostMissing && !directorMissing) return [];
    const missing: Text[] = [
      ...(hostMissing
        ? [
            {
              en: 'the host (hébergeur)',
              de: 'den Hoster (hébergeur)',
              hu: 'a tárhelyszolgáltatót (hébergeur)',
            },
          ]
        : []),
      ...(directorMissing
        ? [
            {
              en: 'the publication director',
              de: 'den Verantwortlichen für die Veröffentlichung',
              hu: 'a kiadásért felelős személyt',
            },
          ]
        : []),
    ];
    const list = (key: Lang, conjunction: string): string =>
      joinList(
        missing.map((item) => item[key]),
        conjunction,
      );
    return [
      finding(
        'publisher-details',
        {
          en: `${name.en} does not name ${list('en', 'or')}.`,
          de: `${name.de} nennt nicht ${list('de', 'und nicht')}.`,
          hu: `${name.hu} nem nevezi meg ${list('hu', 'és')}.`,
        },
        {
          en: 'Name the publication director (directeur de la publication) and the host with its name, address and phone number, as the LCEN asks of French sites.',
          de: 'Den Verantwortlichen für die Veröffentlichung (directeur de la publication) und den Hoster mit Name, Anschrift und Telefonnummer nennen, wie es das LCEN für französische Websites verlangt.',
          hu: 'Nevezze meg a kiadásért felelős személyt (directeur de la publication) és a tárhelyszolgáltatót névvel, címmel és telefonszámmal, ahogy azt az LCEN a francia webhelyektől elvárja.',
        },
      ),
    ];
  }
  if (region === 'it' && form !== undefined && !IT_VAT_NUMBER.test(text)) {
    return [
      finding(
        'tax-number',
        {
          en: `${name.en} names the legal form ${form} but no VAT number (partita IVA).`,
          de: `${name.de} nennt die Rechtsform ${form}, aber keine Umsatzsteuernummer (partita IVA).`,
          hu: `${name.hu} megnevezi ${huArticle(form)} ${form} cégformát, de adószámot (partita IVA) nem.`,
        },
        {
          en: 'Add the partita IVA on the site, as Art. 35 DPR 633/1972 asks of businesses with a VAT number.',
          de: 'Die partita IVA auf der Website angeben, wie es Art. 35 DPR 633/1972 von Unternehmen mit Umsatzsteuernummer verlangt.',
          hu: 'Tüntesse fel a webhelyen a partita IVA-t, ahogy azt a DPR 633/1972 35. cikke az adószámmal rendelkező vállalkozásoktól elvárja.',
        },
      ),
    ];
  }
  if (region === 'es' && form !== undefined && !ES_TAX_NUMBER.test(text)) {
    return [
      finding(
        'tax-number',
        {
          en: `${name.en} names the legal form ${form} but no tax number (NIF).`,
          de: `${name.de} nennt die Rechtsform ${form}, aber keine Steuernummer (NIF).`,
          hu: `${name.hu} megnevezi ${huArticle(form)} ${form} cégformát, de adószámot (NIF) nem.`,
        },
        {
          en: 'Add the NIF of the business, as Art. 10.1 e) LSSI asks for it.',
          de: 'Die Steuernummer (NIF) des Unternehmens ergänzen, wie es Art. 10.1 e) LSSI verlangt.',
          hu: 'Adja meg a vállalkozás adószámát (NIF), ahogy azt az LSSI 10.1. cikk e) pontja előírja.',
        },
      ),
    ];
  }
  if (region === 'pl' && form !== undefined && PL_COMPANY.test(form)) {
    const absent = PL_DETAILS.filter(({ pattern }) => !pattern.test(text));
    if (absent.length === 0) return [];
    const list = (key: Lang, conjunction: string): string =>
      joinList(
        absent.map(({ label }) => label[key]),
        conjunction,
      );
    return [
      finding(
        'company-details',
        {
          en: `${name.en} names the legal form ${form} but no ${list('en', 'or')}.`,
          de: `${name.de} nennt die Rechtsform ${form}, gibt aber nicht an: ${list('de', 'und')}.`,
          hu: `${name.hu} megnevezi ${huArticle(form)} ${form} cégformát, de nem adja meg: ${list('hu', 'és')}.`,
        },
        {
          en: 'Add the register court, the KRS number, the NIP and the share capital, as Art. 206 § 1 KSH (Art. 374 § 1 for an S.A.) asks of a company website.',
          de: 'Registergericht, KRS-Nummer, NIP und Stammkapital ergänzen, wie es Art. 206 § 1 KSH (Art. 374 § 1 für eine S.A.) für die Website einer Gesellschaft verlangt.',
          hu: 'Adja meg a cégbíróságot, a KRS-számot, a NIP-számot és a jegyzett tőkét, ahogy azt a KSH 206. cikk 1. §-a (S.A. esetén 374. cikk 1. §) a társaság webhelyétől elvárja.',
        },
      ),
    ];
  }
  return [];
}

/** "a", "a or b", "a, b or c". */
function joinList(items: readonly string[], conjunction: string): string {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${conjunction} ${items.at(-1)}`;
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
