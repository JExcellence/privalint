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
      findings.push(
        finding(
          'warning',
          'contact',
          say(lang, {
            en: 'The privacy policy gives no e-mail address and no postal address of the controller.',
            de: 'Die Datenschutzerklärung nennt weder eine E-Mail-Adresse noch eine Postanschrift des Verantwortlichen.',
            hu: 'Az adatvédelmi tájékoztató nem ad meg sem e-mail-címet, sem postai címet az adatkezelőről.',
          }),
          say(lang, {
            en: 'Name the controller (the company or person running the site) with a postal address and an e-mail address in the privacy policy.',
            de: 'Den Verantwortlichen (Unternehmen oder Person hinter der Website) mit Postanschrift und E-Mail-Adresse in der Datenschutzerklärung nennen.',
            hu: 'Nevezze meg az adatvédelmi tájékoztatóban az adatkezelőt (a webhelyet üzemeltető céget vagy személyt) postai címmel és e-mail-címmel.',
          }),
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
          }),
          say(lang, {
            en: 'Replace the placeholders with the real name, address and contact details, and remove sample text.',
            de: 'Die Platzhalter durch den echten Namen, die Anschrift und die Kontaktdaten ersetzen und Beispieltext entfernen.',
            hu: 'Cserélje a helyőrzőket a valódi névre, címre és elérhetőségre, és távolítsa el a mintaszöveget.',
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
          }),
          say(lang, {
            en: 'Give an e-mail address, postal address or phone number for the data protection officer next to where they are named (Art. 13(1)(b) GDPR).',
            de: 'Neben der Nennung des Datenschutzbeauftragten eine E-Mail-Adresse, Postanschrift oder Telefonnummer angeben (Art. 13 Abs. 1 lit. b DSGVO).',
            hu: 'Adjon meg e-mail-címet, postai címet vagy telefonszámot az adatvédelmi tisztviselőhöz ott, ahol megnevezi (GDPR 13. cikk (1) b)).',
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
  });
}
