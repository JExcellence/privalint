import { huArticle, type Lang, plPlural, say, type Text } from '../i18n.js';
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
        say(lang, {
          en: 'postal address',
          de: 'keine Postanschrift',
          hu: 'postai címet',
          fr: 'aucune adresse postale',
          it: 'un indirizzo postale',
          es: 'una dirección postal',
          pl: 'adresu pocztowego',
        }),
      );
    }
    if (!hasEmail(text, notice.mailto)) {
      missing.push(
        say(lang, {
          en: 'e-mail address',
          de: 'keine E-Mail-Adresse',
          hu: 'e-mail-címet',
          fr: 'aucune adresse e-mail',
          it: 'un indirizzo e-mail',
          es: 'una dirección de correo electrónico',
          pl: 'adresu e-mail',
        }),
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
          fr: `${name.fr} n'indique ${missing.join(' ni ')}.`,
          it: `${name.it} non indica ${missing.join(' né ')}.`,
          es: `${name.es} no indica ${missing.join(' ni ')}.`,
          pl: `${name.pl} nie podaje ${missing.join(' ani ')}.`,
        }),
        pageUrl: page.finalUrl,
        evidence: evidence(lang, notice),
        fix: say(lang, {
          en: 'Give the full name of the provider, a postal address that can receive mail (no P.O. box) and an e-mail address, as text on the legal notice page. A contact form alone is not enough.',
          de: 'Den vollständigen Namen des Anbieters, eine ladungsfähige Anschrift (kein Postfach) und eine E-Mail-Adresse als Text im Impressum angeben. Ein Kontaktformular allein reicht nicht.',
          hu: 'Adja meg szövegként az impresszumban a szolgáltató teljes nevét, egy kézbesítésre alkalmas postai címet (nem postafiókot) és egy e-mail-címet. Egy kapcsolatfelvételi űrlap önmagában nem elég.',
          fr: "Indiquez sous forme de texte, sur la page des mentions légales, le nom complet de l'éditeur, une adresse postale où il peut recevoir du courrier (pas de boîte postale) et une adresse e-mail. Un formulaire de contact seul ne suffit pas.",
          it: 'Indica il nome completo del fornitore, un indirizzo postale in grado di ricevere posta (non una casella postale) e un indirizzo e-mail, come testo nella pagina delle note legali. Un modulo di contatto da solo non basta.',
          es: 'Indica el nombre completo del prestador, una dirección postal que pueda recibir correo (no un apartado de correos) y una dirección de correo electrónico, como texto en la página del aviso legal. Un formulario de contacto por sí solo no basta.',
          pl: 'Podaj pełną nazwę usługodawcy, adres pocztowy, pod który można doręczać korespondencję (nie skrytkę pocztową), oraz adres e-mail, jako tekst na stronie noty prawnej. Sam formularz kontaktowy nie wystarczy.',
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
          fr: `${name.fr} indique la forme juridique ${form}, mais aucune immatriculation au registre.`,
          it: `${name.it} indica la forma giuridica ${form}, ma nessuna iscrizione al registro.`,
          es: `${name.es} indica la forma jurídica ${form}, pero ninguna inscripción registral.`,
          pl: `${name.pl} podaje formę prawną ${form}, ale nie podaje wpisu do rejestru.`,
        }),
        pageUrl: page.finalUrl,
        evidence: [
          noticeEvidence(lang, notice),
          say(lang, {
            en: `legal form: ${form}`,
            de: `Rechtsform: ${form}`,
            hu: `cégforma: ${form}`,
            fr: `forme juridique : ${form}`,
            it: `forma giuridica: ${form}`,
            es: `forma jurídica: ${form}`,
            pl: `forma prawna: ${form}`,
          }),
        ],
        fix: say(lang, {
          en: 'Add the register, the register court or authority and the registration number, for example "Amtsgericht Berlin, HRB 12345" or "Cg. 01-09-123456".',
          de: 'Register, Registergericht und Registernummer ergänzen, etwa „Amtsgericht Berlin, HRB 12345“.',
          hu: 'Adja meg a nyilvántartást, a nyilvántartó bíróságot vagy hatóságot és a nyilvántartási számot, például „Fővárosi Törvényszék Cégbírósága, Cg. 01-09-123456”.',
          fr: "Ajoutez le registre, le tribunal ou l'autorité qui le tient et le numéro d'immatriculation, par exemple « RCS Paris 123 456 789 » ou « Amtsgericht Berlin, HRB 12345 ».",
          it: "Aggiungi il registro, il tribunale o l'autorità del registro e il numero di iscrizione, ad esempio «Amtsgericht Berlin, HRB 12345» o «Cg. 01-09-123456».",
          es: 'Añade el registro, el juzgado o la autoridad registral y el número de inscripción, por ejemplo «Amtsgericht Berlin, HRB 12345» o «Cg. 01-09-123456».',
          pl: 'Dodaj rejestr, sąd lub organ rejestrowy oraz numer wpisu, na przykład „Amtsgericht Berlin, HRB 12345” lub „Cg. 01-09-123456”.',
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
  {
    pattern: KRS_NUMBER,
    label: {
      en: 'KRS number',
      de: 'KRS-Nummer',
      hu: 'KRS-számot',
      fr: 'numéro KRS',
      it: 'numero KRS',
      es: 'número KRS',
      pl: 'numeru KRS',
    },
  },
  {
    pattern: /\bNIP\b/,
    label: { en: 'NIP', de: 'NIP', hu: 'NIP-számot', fr: 'NIP', it: 'NIP', es: 'NIP', pl: 'NIP' },
  },
  {
    pattern: /kapita[łl]\S*\s+zak[łl]adow|share\s+capital/i,
    label: {
      en: 'share capital',
      de: 'Stammkapital',
      hu: 'jegyzett tőkét',
      fr: 'capital social',
      it: 'capitale sociale',
      es: 'capital social',
      pl: 'kapitału zakładowego',
    },
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
          fr: `${name.fr} indique la forme juridique ${form}, mais aucun numéro fiscal.`,
          it: `${name.it} indica la forma giuridica ${form}, ma nessun numero fiscale.`,
          es: `${name.es} indica la forma jurídica ${form}, pero ningún número fiscal.`,
          pl: `${name.pl} podaje formę prawną ${form}, ale nie podaje numeru podatkowego.`,
        },
        {
          en: 'Add the tax number (adószám) of the business, as Ekertv. 4. § asks for it.',
          de: 'Die Steuernummer (adószám) des Unternehmens ergänzen, wie es Ekertv. 4. § verlangt.',
          hu: 'Adja meg a vállalkozás adószámát, ahogy az Ekertv. 4. §-a előírja.',
          fr: "Ajoutez le numéro fiscal (adószám) de l'entreprise, comme l'exige l'Ekertv. 4. §.",
          it: "Aggiungi il numero fiscale (adószám) dell'impresa, come richiede l'Ekertv. 4. §.",
          es: 'Añade el número fiscal (adószám) de la empresa, como exige la Ekertv. 4. §.',
          pl: 'Dodaj numer podatkowy (adószám) przedsiębiorstwa, jak wymaga tego Ekertv. 4. §.',
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
          fr: `${name.fr} ne contient pas de déclaration au titre de la loi sur les médias (Offenlegung).`,
          it: `${name.it} non contiene l'informativa sui media (Offenlegung).`,
          es: `${name.es} no contiene la declaración de medios (Offenlegung).`,
          pl: `${name.pl} nie zawiera ujawnienia medialnego (Offenlegung).`,
        },
        {
          en: 'Add a disclosure under § 25 MedienG: owner, purpose of the site and its basic direction. Most Austrian websites need one.',
          de: 'Eine Offenlegung nach § 25 MedienG ergänzen: Medieninhaber, Unternehmensgegenstand und grundlegende Richtung. Die meisten österreichischen Websites brauchen sie.',
          hu: 'Egészítse ki a § 25 MedienG szerinti közzététellel: médiatulajdonos, tevékenység és alapvető irány. A legtöbb osztrák webhelynek szüksége van rá.',
          fr: 'Ajoutez une déclaration selon le § 25 MedienG : propriétaire, objet du site et ligne éditoriale. La plupart des sites autrichiens en ont besoin.',
          it: "Aggiungi un'informativa ai sensi del § 25 MedienG: proprietario, scopo del sito e sua linea di fondo. La maggior parte dei siti austriaci ne ha bisogno.",
          es: 'Añade una declaración conforme al § 25 MedienG: propietario, finalidad del sitio y su orientación básica. La mayoría de los sitios web austriacos la necesitan.',
          pl: 'Dodaj ujawnienie zgodnie z § 25 MedienG: właściciel, cel witryny i jej podstawowy kierunek. Potrzebuje go większość austriackich witryn.',
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
              fr: "l'hébergeur",
              it: "l'hosting provider (hébergeur)",
              es: 'el proveedor de alojamiento (hébergeur)',
              pl: 'dostawcy hostingu (hébergeur)',
            },
          ]
        : []),
      ...(directorMissing
        ? [
            {
              en: 'the publication director',
              de: 'den Verantwortlichen für die Veröffentlichung',
              hu: 'a kiadásért felelős személyt',
              fr: 'le directeur de la publication',
              it: 'il direttore della pubblicazione',
              es: 'el director de la publicación',
              pl: 'dyrektora publikacji',
            },
          ]
        : []),
    ];
    return [
      finding(
        'publisher-details',
        {
          en: `${name.en} does not name ${joinList(missing, 'en', 'or')}.`,
          de: `${name.de} nennt nicht ${joinList(missing, 'de', 'und nicht')}.`,
          hu: `${name.hu} nem nevezi meg ${joinList(missing, 'hu', 'és')}.`,
          fr: `${name.fr} ne nomme pas ${joinList(missing, 'fr', 'ni')}.`,
          it: `${name.it} non nomina ${joinList(missing, 'it', 'né')}.`,
          es: `${name.es} no indica ${joinList(missing, 'es', 'ni')}.`,
          pl: `${name.pl} nie wskazuje ${joinList(missing, 'pl', 'ani')}.`,
        },
        {
          en: 'Name the publication director (directeur de la publication) and the host with its name, address and phone number, as the LCEN asks of French sites.',
          de: 'Den Verantwortlichen für die Veröffentlichung (directeur de la publication) und den Hoster mit Name, Anschrift und Telefonnummer nennen, wie es das LCEN für französische Websites verlangt.',
          hu: 'Nevezze meg a kiadásért felelős személyt (directeur de la publication) és a tárhelyszolgáltatót névvel, címmel és telefonszámmal, ahogy azt az LCEN a francia webhelyektől elvárja.',
          fr: "Nommez le directeur de la publication et l'hébergeur avec son nom, son adresse et son numéro de téléphone, comme l'exige la LCEN pour les sites français.",
          it: "Indica il direttore della pubblicazione (directeur de la publication) e l'hosting provider con nome, indirizzo e numero di telefono, come la LCEN richiede ai siti francesi.",
          es: 'Indica el director de la publicación (directeur de la publication) y el proveedor de alojamiento con su nombre, dirección y teléfono, como exige la LCEN a los sitios franceses.',
          pl: 'Wskaż dyrektora publikacji (directeur de la publication) i dostawcę hostingu wraz z nazwą, adresem i numerem telefonu, jak LCEN wymaga od francuskich witryn.',
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
          fr: `${name.fr} indique la forme juridique ${form}, mais aucun numéro de TVA (partita IVA).`,
          it: `${name.it} indica la forma giuridica ${form}, ma nessuna partita IVA.`,
          es: `${name.es} indica la forma jurídica ${form}, pero ningún número de IVA (partita IVA).`,
          pl: `${name.pl} podaje formę prawną ${form}, ale nie podaje numeru VAT (partita IVA).`,
        },
        {
          en: 'Add the partita IVA on the site, as Art. 35 DPR 633/1972 asks of businesses with a VAT number.',
          de: 'Die partita IVA auf der Website angeben, wie es Art. 35 DPR 633/1972 von Unternehmen mit Umsatzsteuernummer verlangt.',
          hu: 'Tüntesse fel a webhelyen a partita IVA-t, ahogy azt a DPR 633/1972 35. cikke az adószámmal rendelkező vállalkozásoktól elvárja.',
          fr: "Indiquez la partita IVA sur le site, comme l'exige l'art. 35 du DPR 633/1972 pour les entreprises disposant d'un numéro de TVA.",
          it: "Indica la partita IVA sul sito, come l'art. 35 DPR 633/1972 richiede alle imprese titolari di partita IVA.",
          es: 'Añade la partita IVA en el sitio, como exige el art. 35 DPR 633/1972 a las empresas con número de IVA.',
          pl: 'Podaj partita IVA na stronie, jak art. 35 DPR 633/1972 wymaga od przedsiębiorstw z numerem VAT.',
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
          fr: `${name.fr} indique la forme juridique ${form}, mais aucun numéro fiscal (NIF).`,
          it: `${name.it} indica la forma giuridica ${form}, ma nessun numero fiscale (NIF).`,
          es: `${name.es} indica la forma jurídica ${form}, pero ningún número de identificación fiscal (NIF).`,
          pl: `${name.pl} podaje formę prawną ${form}, ale nie podaje numeru podatkowego (NIF).`,
        },
        {
          en: 'Add the NIF of the business, as Art. 10.1 e) LSSI asks for it.',
          de: 'Die Steuernummer (NIF) des Unternehmens ergänzen, wie es Art. 10.1 e) LSSI verlangt.',
          hu: 'Adja meg a vállalkozás adószámát (NIF), ahogy azt az LSSI 10.1. cikk e) pontja előírja.',
          fr: "Ajoutez le NIF de l'entreprise, comme l'exige l'art. 10.1 e) de la LSSI.",
          it: "Aggiungi il NIF dell'impresa, come richiede l'art. 10.1 e) LSSI.",
          es: 'Añade el NIF de la empresa, como exige el art. 10.1 e) LSSI.',
          pl: 'Dodaj NIF przedsiębiorstwa, jak wymaga tego art. 10.1 e) LSSI.',
        },
      ),
    ];
  }
  if (region === 'pl' && form !== undefined && PL_COMPANY.test(form)) {
    const absent = PL_DETAILS.filter(({ pattern }) => !pattern.test(text));
    if (absent.length === 0) return [];
    const labels = absent.map(({ label }) => label);
    return [
      finding(
        'company-details',
        {
          en: `${name.en} names the legal form ${form} but no ${joinList(labels, 'en', 'or')}.`,
          de: `${name.de} nennt die Rechtsform ${form}, gibt aber nicht an: ${joinList(labels, 'de', 'und')}.`,
          hu: `${name.hu} megnevezi ${huArticle(form)} ${form} cégformát, de nem adja meg: ${joinList(labels, 'hu', 'és')}.`,
          fr: `${name.fr} indique la forme juridique ${form}, mais pas les éléments suivants : ${joinList(labels, 'fr', 'et')}.`,
          it: `${name.it} indica la forma giuridica ${form}, ma non i seguenti dati: ${joinList(labels, 'it', 'e')}.`,
          es: `${name.es} indica la forma jurídica ${form}, pero no los siguientes datos: ${joinList(labels, 'es', 'y')}.`,
          pl: `${name.pl} podaje formę prawną ${form}, ale nie podaje ${joinList(labels, 'pl', 'ani')}.`,
        },
        {
          en: 'Add the register court, the KRS number, the NIP and the share capital, as Art. 206 § 1 KSH (Art. 374 § 1 for an S.A.) asks of a company website.',
          de: 'Registergericht, KRS-Nummer, NIP und Stammkapital ergänzen, wie es Art. 206 § 1 KSH (Art. 374 § 1 für eine S.A.) für die Website einer Gesellschaft verlangt.',
          hu: 'Adja meg a cégbíróságot, a KRS-számot, a NIP-számot és a jegyzett tőkét, ahogy azt a KSH 206. cikk 1. §-a (S.A. esetén 374. cikk 1. §) a társaság webhelyétől elvárja.',
          fr: "Ajoutez le tribunal d'immatriculation, le numéro KRS, le NIP et le capital social, comme l'exige l'art. 206 § 1 KSH (art. 374 § 1 pour une S.A.) pour le site d'une société.",
          it: "Aggiungi il tribunale del registro, il numero KRS, il NIP e il capitale sociale, come l'art. 206 § 1 KSH (art. 374 § 1 per una S.A.) richiede al sito di una società.",
          es: 'Añade el juzgado del registro, el número KRS, el NIP y el capital social, como exige el art. 206 § 1 KSH (art. 374 § 1 para una S.A.) a la web de una sociedad.',
          pl: 'Dodaj sąd rejestrowy, numer KRS, NIP i wysokość kapitału zakładowego, jak art. 206 § 1 KSH (art. 374 § 1 dla S.A.) wymaga od strony internetowej spółki.',
        },
      ),
    ];
  }
  return [];
}

/** The texts in one language as "a", "a or b", "a, b or c". */
function joinList(texts: readonly Text[], lang: Lang, conjunction: string): string {
  const items = texts.map((text) => text[lang]);
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${conjunction} ${items.at(-1)}`;
}

/** What the read page is called in messages: the legal notice, or what was read in its place. */
function noticeName(notice: LinkedPageText): Text {
  const readAs = notice.readAs;
  if (readAs === undefined) {
    return {
      en: 'The legal notice',
      de: 'Das Impressum',
      hu: 'Az impresszum',
      fr: 'La page des mentions légales',
      it: 'La pagina delle note legali',
      es: 'La página del aviso legal',
      pl: 'Nota prawna',
    };
  }
  if (readAs.source === 'privacy-policy') {
    return {
      en: 'The privacy policy, read because no legal notice is linked,',
      de: 'Die Datenschutzerklärung (gelesen, weil kein Impressum verlinkt ist)',
      hu: 'Az adatvédelmi tájékoztató (impresszum-hivatkozás hiányában olvasva)',
      fr: 'La politique de confidentialité, lue faute de mentions légales liées,',
      it: "L'informativa sulla privacy, letta perché non sono collegate note legali,",
      es: 'La política de privacidad, leída porque no hay aviso legal enlazado,',
      pl: 'Polityka prywatności, przeczytana, bo nie podlinkowano noty prawnej,',
    };
  }
  const label = readAs.label.trim() || '…';
  return {
    en: `The page "${label}", read because no legal notice is linked,`,
    de: `Die Seite „${label}“ (gelesen, weil kein Impressum verlinkt ist)`,
    hu: `${huArticle(label, true)} „${label}” oldal (impresszum-hivatkozás hiányában olvasva)`,
    fr: `La page « ${label} », lue faute de mentions légales liées,`,
    it: `La pagina «${label}», letta perché non sono collegate note legali,`,
    es: `La página «${label}», leída porque no hay aviso legal enlazado,`,
    pl: `Strona „${label}”, przeczytana, bo nie podlinkowano noty prawnej,`,
  };
}

function noticeEvidence(lang: Lang, notice: LinkedPageText): string {
  const url = notice.url;
  if (notice.readAs?.source === 'privacy-policy') {
    return say(lang, {
      en: `privacy policy, read instead: ${url}`,
      de: `Datenschutzerklärung, ersatzweise gelesen: ${url}`,
      hu: `adatvédelmi tájékoztató, helyette olvasva: ${url}`,
      fr: `politique de confidentialité, lue à la place : ${url}`,
      it: `informativa sulla privacy, letta al suo posto: ${url}`,
      es: `política de privacidad, leída en su lugar: ${url}`,
      pl: `polityka prywatności, przeczytana zamiast niej: ${url}`,
    });
  }
  if (notice.readAs?.source === 'legal-link') {
    return say(lang, {
      en: `legal page, read instead: ${url}`,
      de: `Rechtsseite, ersatzweise gelesen: ${url}`,
      hu: `jogi oldal, helyette olvasva: ${url}`,
      fr: `page juridique, lue à la place : ${url}`,
      it: `pagina legale, letta al suo posto: ${url}`,
      es: `página legal, leída en su lugar: ${url}`,
      pl: `strona prawna, przeczytana zamiast niej: ${url}`,
    });
  }
  return say(lang, {
    en: `legal notice: ${url}`,
    de: `Impressum: ${url}`,
    hu: `impresszum: ${url}`,
    fr: `mentions légales : ${url}`,
    it: `note legali: ${url}`,
    es: `aviso legal: ${url}`,
    pl: `nota prawna: ${url}`,
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
      fr: `texte des mentions légales : ${words} mots`,
      it: `testo delle note legali: ${words} parole`,
      es: `texto del aviso legal: ${words} palabras`,
      pl: `tekst noty prawnej: ${words} ${plPlural(words, 'słowo', 'słowa', 'słów')}`,
    }),
  ];
}
