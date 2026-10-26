import type { Lang } from '../i18n.js';
import type { ConsentSummary } from '../types.js';

/** Fixed wording of the text and Markdown reports. */
export interface ReportMessages {
  errors(count: number): string;
  warnings(count: number): string;
  pages(count: number): string;
  duration(ms: number): string;
  noProblems(pages: string, duration: string): string;
  on: string;
  scanned(pages: string): string;
  couldNotScan(count: number): string;
  fix: string;
  legalBasis: string;
  rule: string;
  finding: string;
  howToFix: string;
  disclaimer: string;
  consent(consent: ConsentSummary): string;
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const en: ReportMessages = {
  errors: (n) => count(n, 'error', 'errors'),
  warnings: (n) => count(n, 'warning', 'warnings'),
  pages: (n) => count(n, 'page', 'pages'),
  duration: (ms) => `${(ms / 1000).toFixed(1)}s`,
  noProblems: (pages, duration) => `No problems found on ${pages} (${duration}).`,
  on: 'on',
  scanned: (pages) => `${pages} scanned`,
  couldNotScan: (n) => `Could not scan ${count(n, 'page', 'pages')}:`,
  fix: 'fix:',
  legalBasis: 'legal basis:',
  rule: 'Rule',
  finding: 'Finding',
  howToFix: 'How to fix',
  disclaimer: 'Automated checks only. A clean result is not proof of GDPR compliance.',
  consent(consent) {
    if (!consent.bannerFound) {
      return 'Consent banner: none found';
    }
    const vendor = consent.cmp === undefined ? '' : ` (${consent.cmp})`;
    if (consent.error !== undefined) {
      return `Consent banner${vendor}: found, but rejecting failed: ${consent.error}`;
    }
    if (consent.rejected) {
      return `Consent banner${vendor}: clicked "${consent.rejectLabel}" and reloaded`;
    }
    return `Consent banner${vendor}: found, no reject button`;
  },
};

const de: ReportMessages = {
  errors: (n) => count(n, 'Fehler', 'Fehler'),
  warnings: (n) => count(n, 'Warnung', 'Warnungen'),
  pages: (n) => count(n, 'Seite', 'Seiten'),
  duration: (ms) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`,
  noProblems: (pages, duration) => `Keine Probleme auf ${pages} gefunden (${duration}).`,
  on: 'auf',
  scanned: (pages) => `${pages} geprüft`,
  couldNotScan: (n) =>
    `${count(n, 'Seite', 'Seiten')} ${n === 1 ? 'konnte' : 'konnten'} nicht geprüft werden:`,
  fix: 'Lösung:',
  legalBasis: 'Rechtsgrundlage:',
  rule: 'Regel',
  finding: 'Befund',
  howToFix: 'So beheben Sie es',
  disclaimer:
    'Nur automatisierte Prüfungen. Ein sauberes Ergebnis ist kein Nachweis der DSGVO-Konformität.',
  consent(consent) {
    if (!consent.bannerFound) {
      return 'Cookie-Banner: keines gefunden';
    }
    const vendor = consent.cmp === undefined ? '' : ` (${consent.cmp})`;
    if (consent.error !== undefined) {
      return `Cookie-Banner${vendor}: gefunden, aber Ablehnen ist fehlgeschlagen: ${consent.error}`;
    }
    if (consent.rejected) {
      return `Cookie-Banner${vendor}: „${consent.rejectLabel}“ geklickt und neu geladen`;
    }
    return `Cookie-Banner${vendor}: gefunden, kein Ablehnen-Button`;
  },
};

const MESSAGES: Record<Lang, ReportMessages> = { en, de };

export const messagesFor = (lang: Lang): ReportMessages => MESSAGES[lang];
