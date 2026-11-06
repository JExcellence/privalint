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
  offSite(count: number): string;
  severalPages: string;
  onPages(count: number, total: number): string;
  fix: string;
  legalBasis: string;
  rule: string;
  finding: string;
  howToFix: string;
  disclaimer: string;
  policy(allowed: boolean, originalSeverity: string): string;
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
  severalPages: 'On several pages',
  onPages: (n, total) => `on ${n} of ${count(total, 'page', 'pages')}:`,
  offSite: (n) =>
    `Not scanned, ${n === 1 ? 'this link redirects' : 'these links redirect'} to another site:`,
  fix: 'fix:',
  legalBasis: 'legal basis:',
  rule: 'Rule',
  finding: 'Finding',
  howToFix: 'How to fix',
  disclaimer: 'Automated checks only. A clean result is not proof of GDPR compliance.',
  policy: (allowed, severity) =>
    allowed
      ? 'Local policy: vendor allowed; retained as info. Not legal approval.'
      : `Local policy: severity override (original: ${severity}).`,
  consent(consent) {
    if (consent.state === 'interaction-failed') {
      return `Consent check: interaction failed (${consent.error ?? 'browser-failure'}); reject path untested`;
    }
    if (!consent.bannerFound) {
      return 'Consent banner: none detected; reject path untested (not a privacy finding)';
    }
    const vendor = consent.cmp === undefined ? '' : ` (${consent.cmp})`;
    if (consent.error !== undefined) {
      return `Consent banner${vendor}: found, but rejecting failed: ${consent.error}`;
    }
    if (consent.rejected) {
      return `Consent banner${vendor}: clicked "${consent.rejectLabel}" and reloaded${consent.afterRejectComplete === false ? '; observation incomplete' : ''}`;
    }
    return `Consent banner${vendor}: found, no supported reject option; reject path untested`;
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
  severalPages: 'Auf mehreren Seiten',
  onPages: (n, total) => `auf ${n} von ${count(total, 'Seite', 'Seiten')}:`,
  offSite: (n) =>
    `Nicht geprüft, ${n === 1 ? 'dieser Link leitet' : 'diese Links leiten'} auf eine andere Website um:`,
  fix: 'Lösung:',
  legalBasis: 'Rechtsgrundlage:',
  rule: 'Regel',
  finding: 'Befund',
  howToFix: 'So beheben Sie es',
  disclaimer:
    'Nur automatisierte Prüfungen. Ein sauberes Ergebnis ist kein Nachweis der DSGVO-Konformität.',
  policy: (allowed, severity) =>
    allowed
      ? 'Lokale Policy: Anbieter freigegeben; als Hinweis beibehalten. Keine rechtliche Freigabe.'
      : `Lokale Policy: Schweregrad angepasst (ursprünglich: ${severity}).`,
  consent(consent) {
    if (consent.state === 'interaction-failed') {
      return `Consent-Prüfung: Interaktion fehlgeschlagen (${consent.error ?? 'browser-failure'}); Ablehnen-Pfad ungeprüft`;
    }
    if (!consent.bannerFound) {
      return 'Cookie-Banner: keines erkannt; Ablehnen-Pfad ungeprüft (kein Datenschutzbefund)';
    }
    const vendor = consent.cmp === undefined ? '' : ` (${consent.cmp})`;
    if (consent.error !== undefined) {
      return `Cookie-Banner${vendor}: gefunden, aber Ablehnen ist fehlgeschlagen: ${consent.error}`;
    }
    if (consent.rejected) {
      return `Cookie-Banner${vendor}: „${consent.rejectLabel}“ geklickt und neu geladen${consent.afterRejectComplete === false ? '; Erfassung unvollständig' : ''}`;
    }
    return `Cookie-Banner${vendor}: gefunden, keine unterstützte Ablehnen-Möglichkeit; Ablehnen-Pfad ungeprüft`;
  },
};

// Hungarian keeps the noun singular after a number: "3 hiba", "2 oldal".
const hu: ReportMessages = {
  errors: (n) => `${n} hiba`,
  warnings: (n) => `${n} figyelmeztetés`,
  pages: (n) => `${n} oldal`,
  duration: (ms) => `${(ms / 1000).toFixed(1).replace('.', ',')} mp`,
  noProblems: (pages, duration) => `Nem található probléma (${pages}, ${duration}).`,
  on: '·',
  scanned: (pages) => `${pages} ellenőrizve`,
  couldNotScan: (n) => `${n} oldalt nem sikerült ellenőrizni:`,
  severalPages: 'Több oldalon',
  onPages: (n, total) => `${total} oldalból ${n} oldalon:`,
  offSite: (n) =>
    `Nincs ellenőrizve, ${n === 1 ? 'ez a hivatkozás másik webhelyre irányít' : 'ezek a hivatkozások másik webhelyre irányítanak'}:`,
  fix: 'megoldás:',
  legalBasis: 'jogalap:',
  rule: 'Szabály',
  finding: 'Megállapítás',
  howToFix: 'Javítás módja',
  disclaimer:
    'Csak automatikus ellenőrzés. A hibátlan eredmény nem bizonyítja a GDPR-nak való megfelelést.',
  policy: (allowed, severity) =>
    allowed
      ? 'Helyi szabályzat: a szolgáltató engedélyezve; tájékoztatásként megtartva. Nem jogi jóváhagyás.'
      : `Helyi szabályzat: módosított súlyosság (eredetileg: ${severity}).`,
  consent(consent) {
    if (consent.state === 'interaction-failed') {
      return `Hozzájárulás-ellenőrzés: a művelet sikertelen (${consent.error ?? 'browser-failure'}); az elutasítás nincs ellenőrizve`;
    }
    if (!consent.bannerFound) {
      return 'Sütibanner: nem található; az elutasítás nincs ellenőrizve (nem adatvédelmi megállapítás)';
    }
    const vendor = consent.cmp === undefined ? '' : ` (${consent.cmp})`;
    if (consent.error !== undefined) {
      return `Sütibanner${vendor}: megtalálva, de az elutasítás sikertelen: ${consent.error}`;
    }
    if (consent.rejected) {
      return `Sütibanner${vendor}: kattintás erre: „${consent.rejectLabel}”, majd újratöltés${consent.afterRejectComplete === false ? '; a megfigyelés hiányos' : ''}`;
    }
    return `Sütibanner${vendor}: megtalálva, de nincs támogatott elutasítási lehetőség; az elutasítás nincs ellenőrizve`;
  },
};

const MESSAGES: Record<Lang, ReportMessages> = { en, de, hu };

export const messagesFor = (lang: Lang): ReportMessages => MESSAGES[lang];
