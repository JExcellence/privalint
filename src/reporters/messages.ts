import { decimal, frenchSpacing, huArticle, type Lang, plPlural } from '../i18n.js';
import type { BaselineSummary, ConsentSummary } from '../types.js';

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
  thirdParties(count: number): string;
  thirdPartyColumns: [host: string, vendor: string, requests: string, phases: string];
  disclaimer: string;
  policy(allowed: boolean, originalSeverity: string): string;
  consent(consent: ConsentSummary): string;
  baseline(summary: BaselineSummary): string;
  newFinding: string;
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
  thirdParties: (n) => `Hosts outside the site (${n})`,
  thirdPartyColumns: ['Host', 'Known as', 'Requests', 'When'],
  disclaimer: 'Automated checks only. A clean result is not proof of GDPR compliance.',
  baseline: (b) =>
    `Compared with the baseline: ${b.new} new, ${b.existing} existing, ${b.fixed.length} fixed`,
  newFinding: 'new',
  policy: (allowed, severity) =>
    allowed
      ? 'Local policy: vendor allowed; retained as info. Not legal approval.'
      : `Local policy: severity override (original: ${severity}).`,
  consent(consent) {
    if (consent.state === 'interaction-failed') {
      return `Consent check: interaction failed (${consent.error ?? 'browser-failure'}); reject path untested`;
    }
    if (!consent.bannerFound) {
      return consent.cmp === undefined
        ? 'Consent banner: none detected; reject path untested (not a privacy finding)'
        : `Consent banner: none shown, although ${consent.cmp} loaded (it may hide its banner from automated browsers); reject path untested`;
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
  duration: (ms) => `${decimal(ms / 1000, 'de', 1)} s`,
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
  thirdParties: (n) => `Hosts außerhalb der Website (${n})`,
  thirdPartyColumns: ['Host', 'Bekannt als', 'Anfragen', 'Wann'],
  baseline: (b) =>
    `Verglichen mit der Baseline: ${b.new} neu, ${b.existing} bestehend, ${b.fixed.length} behoben`,
  newFinding: 'neu',
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
      return consent.cmp === undefined
        ? 'Cookie-Banner: keines erkannt; Ablehnen-Pfad ungeprüft (kein Datenschutzbefund)'
        : `Cookie-Banner: keines angezeigt, obwohl ${consent.cmp} geladen wurde (blendet es womöglich für automatisierte Browser aus); Ablehnen-Pfad ungeprüft`;
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
  duration: (ms) => `${decimal(ms / 1000, 'hu', 1)} mp`,
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
  thirdParties: (n) => `A webhelyen kívüli kiszolgálók (${n})`,
  thirdPartyColumns: ['Kiszolgáló', 'Ismert név', 'Kérések', 'Mikor'],
  baseline: (b) =>
    `Összevetés az alapjelentéssel: ${b.new} új, ${b.existing} meglévő, ${b.fixed.length} javítva`,
  newFinding: 'új',
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
      return consent.cmp === undefined
        ? 'Sütibanner: nem található; az elutasítás nincs ellenőrizve (nem adatvédelmi megállapítás)'
        : `Sütibanner: nem jelent meg, pedig ${huArticle(consent.cmp)} ${consent.cmp} betöltődött (lehet, hogy elrejti az automatizált böngészők elől); az elutasítás nincs ellenőrizve`;
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

/** The same messages with French no-break spaces before punctuation (see frenchSpacing). */
function withFrenchSpacing(messages: ReportMessages): ReportMessages {
  const spaced = (value: unknown): unknown => {
    if (typeof value === 'string') return frenchSpacing(value);
    if (Array.isArray(value)) return value.map(spaced);
    if (typeof value === 'function') {
      return (...args: unknown[]) => spaced(value(...args));
    }
    throw new TypeError('Report messages hold strings, string arrays and functions only.');
  };
  return Object.fromEntries(
    Object.entries(messages).map(([key, value]) => [key, spaced(value)]),
  ) as unknown as ReportMessages;
}

// French uses the singular for 0 and 1 ("0 erreur", "1 page") and a space before ":".
const countFr = (n: number, one: string, many: string) => `${n} ${n <= 1 ? one : many}`;

const fr: ReportMessages = withFrenchSpacing({
  errors: (n) => countFr(n, 'erreur', 'erreurs'),
  warnings: (n) => countFr(n, 'avertissement', 'avertissements'),
  pages: (n) => countFr(n, 'page', 'pages'),
  duration: (ms) => `${decimal(ms / 1000, 'fr', 1)} s`,
  noProblems: (pages, duration) => `Aucun problème trouvé sur ${pages} (${duration}).`,
  on: 'sur',
  scanned: (pages) => `analyse : ${pages}`,
  couldNotScan: (n) =>
    `${countFr(n, 'page', 'pages')} ${n <= 1 ? "n'a pas pu être analysée" : "n'ont pas pu être analysées"} :`,
  severalPages: 'Sur plusieurs pages',
  onPages: (n, total) => `sur ${n} des ${countFr(total, 'page', 'pages')} :`,
  offSite: (n) =>
    `Non analysé, ${n === 1 ? 'ce lien redirige' : 'ces liens redirigent'} vers un autre site :`,
  fix: 'correction :',
  legalBasis: 'base légale :',
  rule: 'Règle',
  finding: 'Constat',
  howToFix: 'Comment corriger',
  thirdParties: (n) => `Hôtes extérieurs au site (${n})`,
  thirdPartyColumns: ['Hôte', 'Connu comme', 'Requêtes', 'Quand'],
  baseline: (b) =>
    `Par rapport à la référence : ${countFr(b.new, 'nouveau', 'nouveaux')}, ${countFr(b.existing, 'existant', 'existants')}, ${countFr(b.fixed.length, 'corrigé', 'corrigés')}`,
  newFinding: 'nouveau',
  disclaimer:
    'Contrôles automatisés uniquement. Un résultat sans constat ne prouve pas la conformité au RGPD.',
  policy: (allowed, severity) =>
    allowed
      ? 'Politique locale : fournisseur autorisé ; conservé comme information. Pas une validation juridique.'
      : `Politique locale : gravité modifiée (à l'origine : ${severity}).`,
  consent(consent) {
    if (consent.state === 'interaction-failed') {
      return `Contrôle du consentement : l'interaction a échoué (« ${consent.error ?? 'browser-failure'} ») ; refus non testé`;
    }
    if (!consent.bannerFound) {
      return consent.cmp === undefined
        ? 'Bandeau de consentement : aucun détecté ; refus non testé (pas un constat de confidentialité)'
        : `Bandeau de consentement : aucun affiché, bien que ${consent.cmp} soit chargé (il le masque peut-être aux navigateurs automatisés) ; refus non testé`;
    }
    const vendor = consent.cmp === undefined ? '' : ` (${consent.cmp})`;
    if (consent.error !== undefined) {
      return `Bandeau de consentement${vendor} : trouvé, mais le refus a échoué : « ${consent.error} »`;
    }
    if (consent.rejected) {
      return `Bandeau de consentement${vendor} : clic sur « ${consent.rejectLabel} » puis rechargement${consent.afterRejectComplete === false ? ' ; observation incomplète' : ''}`;
    }
    return `Bandeau de consentement${vendor} : trouvé, aucune option de refus prise en charge ; refus non testé`;
  },
});

const it: ReportMessages = {
  errors: (n) => count(n, 'errore', 'errori'),
  warnings: (n) => count(n, 'avviso', 'avvisi'),
  pages: (n) => count(n, 'pagina', 'pagine'),
  duration: (ms) => `${decimal(ms / 1000, 'it', 1)} s`,
  noProblems: (pages, duration) => `Nessun problema trovato su ${pages} (${duration}).`,
  on: 'su',
  scanned: (pages) => `${pages} ${pages.startsWith('1 ') ? 'analizzata' : 'analizzate'}`,
  couldNotScan: (n) => `Impossibile analizzare ${count(n, 'pagina', 'pagine')}:`,
  severalPages: 'Su più pagine',
  onPages: (n, total) => `su ${n} di ${count(total, 'pagina', 'pagine')}:`,
  offSite: (n) =>
    `Non analizzato, ${n === 1 ? 'questo link reindirizza' : 'questi link reindirizzano'} a un altro sito:`,
  fix: 'correzione:',
  legalBasis: 'base giuridica:',
  rule: 'Regola',
  finding: 'Rilievo',
  howToFix: 'Come correggere',
  thirdParties: (n) => `Host esterni al sito (${n})`,
  thirdPartyColumns: ['Host', 'Noto come', 'Richieste', 'Quando'],
  baseline: (b) =>
    `Rispetto alla baseline: ${count(b.new, 'nuovo', 'nuovi')}, ${count(b.existing, 'esistente', 'esistenti')}, ${count(b.fixed.length, 'corretto', 'corretti')}`,
  newFinding: 'nuovo',
  disclaimer:
    'Solo controlli automatici. Un risultato senza rilievi non prova la conformità al GDPR.',
  policy: (allowed, severity) =>
    allowed
      ? "Policy locale: fornitore consentito; mantenuto come informazione. Non è un'approvazione legale."
      : `Policy locale: gravità modificata (originale: ${severity}).`,
  consent(consent) {
    if (consent.state === 'interaction-failed') {
      return `Controllo del consenso: interazione non riuscita («${consent.error ?? 'browser-failure'}»); rifiuto non testato`;
    }
    if (!consent.bannerFound) {
      return consent.cmp === undefined
        ? 'Banner del consenso: nessuno rilevato; rifiuto non testato (non è un rilievo sulla privacy)'
        : `Banner del consenso: nessuno mostrato, anche se ${consent.cmp} è stato caricato (potrebbe nasconderlo ai browser automatizzati); rifiuto non testato`;
    }
    const vendor = consent.cmp === undefined ? '' : ` (${consent.cmp})`;
    if (consent.error !== undefined) {
      return `Banner del consenso${vendor}: trovato, ma il rifiuto non è riuscito: «${consent.error}»`;
    }
    if (consent.rejected) {
      return `Banner del consenso${vendor}: clic su «${consent.rejectLabel}» e pagina ricaricata${consent.afterRejectComplete === false ? '; osservazione incompleta' : ''}`;
    }
    return `Banner del consenso${vendor}: trovato, nessuna opzione di rifiuto supportata; rifiuto non testato`;
  },
};

const es: ReportMessages = {
  errors: (n) => count(n, 'error', 'errores'),
  warnings: (n) => count(n, 'advertencia', 'advertencias'),
  pages: (n) => count(n, 'página', 'páginas'),
  duration: (ms) => `${decimal(ms / 1000, 'es', 1)} s`,
  noProblems: (pages, duration) => `No se encontraron problemas en ${pages} (${duration}).`,
  on: 'en',
  scanned: (pages) => `${pages} ${pages.startsWith('1 ') ? 'analizada' : 'analizadas'}`,
  couldNotScan: (n) =>
    `No se ${n === 1 ? 'pudo' : 'pudieron'} analizar ${count(n, 'página', 'páginas')}:`,
  severalPages: 'En varias páginas',
  onPages: (n, total) => `en ${n} de ${count(total, 'página', 'páginas')}:`,
  offSite: (n) =>
    `No analizado, ${n === 1 ? 'este enlace redirige' : 'estos enlaces redirigen'} a otro sitio:`,
  fix: 'solución:',
  legalBasis: 'base jurídica:',
  rule: 'Regla',
  finding: 'Hallazgo',
  howToFix: 'Cómo corregirlo',
  thirdParties: (n) => `Hosts fuera del sitio (${n})`,
  thirdPartyColumns: ['Host', 'Conocido como', 'Solicitudes', 'Cuándo'],
  baseline: (b) =>
    `Comparado con la referencia: ${count(b.new, 'nuevo', 'nuevos')}, ${count(b.existing, 'existente', 'existentes')}, ${count(b.fixed.length, 'corregido', 'corregidos')}`,
  newFinding: 'nuevo',
  disclaimer:
    'Solo comprobaciones automáticas. Un resultado sin hallazgos no prueba el cumplimiento del RGPD.',
  policy: (allowed, severity) =>
    allowed
      ? 'Política local: proveedor permitido; se mantiene como información. No es una aprobación jurídica.'
      : `Política local: gravedad modificada (original: ${severity}).`,
  consent(consent) {
    if (consent.state === 'interaction-failed') {
      return `Comprobación del consentimiento: la interacción falló («${consent.error ?? 'browser-failure'}»); rechazo no probado`;
    }
    if (!consent.bannerFound) {
      return consent.cmp === undefined
        ? 'Banner de consentimiento: no se detectó ninguno; rechazo no probado (no es un hallazgo de privacidad)'
        : `Banner de consentimiento: no se mostró ninguno, aunque ${consent.cmp} se cargó (puede ocultarlo a los navegadores automatizados); rechazo no probado`;
    }
    const vendor = consent.cmp === undefined ? '' : ` (${consent.cmp})`;
    if (consent.error !== undefined) {
      return `Banner de consentimiento${vendor}: encontrado, pero el rechazo falló: «${consent.error}»`;
    }
    if (consent.rejected) {
      return `Banner de consentimiento${vendor}: clic en «${consent.rejectLabel}» y página recargada${consent.afterRejectComplete === false ? '; observación incompleta' : ''}`;
    }
    return `Banner de consentimiento${vendor}: encontrado, ninguna opción de rechazo compatible; rechazo no probado`;
  },
};

// Polish has three count forms: "1 błąd", "2 błędy", "5 błędów" (see plPlural).
const countPl = (n: number, one: string, few: string, many: string) =>
  `${n} ${plPlural(n, one, few, many)}`;

const pl: ReportMessages = {
  errors: (n) => countPl(n, 'błąd', 'błędy', 'błędów'),
  warnings: (n) => countPl(n, 'ostrzeżenie', 'ostrzeżenia', 'ostrzeżeń'),
  pages: (n) => countPl(n, 'strona', 'strony', 'stron'),
  duration: (ms) => `${decimal(ms / 1000, 'pl', 1)} s`,
  noProblems: (pages, duration) => `Nie znaleziono problemów (${pages}, ${duration}).`,
  on: '·',
  scanned: (pages) => `sprawdzono: ${pages}`,
  couldNotScan: (n) => `Nie udało się sprawdzić ${countPl(n, 'strony', 'stron', 'stron')}:`,
  severalPages: 'Na kilku stronach',
  onPages: (n, total) => `na ${n} z ${countPl(total, 'strony', 'stron', 'stron')}:`,
  offSite: (n) =>
    `Nie sprawdzono, ${n === 1 ? 'ten link przekierowuje' : 'te linki przekierowują'} do innej witryny:`,
  fix: 'poprawka:',
  legalBasis: 'podstawa prawna:',
  rule: 'Reguła',
  finding: 'Ustalenie',
  howToFix: 'Jak to naprawić',
  thirdParties: (n) => `Hosty spoza witryny (${n})`,
  thirdPartyColumns: ['Host', 'Znany jako', 'Żądania', 'Kiedy'],
  baseline: (b) =>
    `W porównaniu z punktem odniesienia: nowe ${b.new}, istniejące ${b.existing}, naprawione ${b.fixed.length}`,
  newFinding: 'nowe',
  disclaimer: 'Tylko automatyczne kontrole. Wynik bez ustaleń nie dowodzi zgodności z RODO.',
  policy: (allowed, severity) =>
    allowed
      ? 'Lokalna polityka: dostawca dozwolony; zachowany jako informacja. To nie jest akceptacja prawna.'
      : `Lokalna polityka: zmieniona waga (pierwotnie: ${severity}).`,
  consent(consent) {
    if (consent.state === 'interaction-failed') {
      return `Kontrola zgody: interakcja nie powiodła się („${consent.error ?? 'browser-failure'}”); odrzucenie nieprzetestowane`;
    }
    if (!consent.bannerFound) {
      return consent.cmp === undefined
        ? 'Baner zgody: nie wykryto; odrzucenie nieprzetestowane (to nie jest ustalenie dotyczące prywatności)'
        : `Baner zgody: nie pokazano, choć załadowano ${consent.cmp} (może ukrywać baner przed zautomatyzowanymi przeglądarkami); odrzucenie nieprzetestowane`;
    }
    const vendor = consent.cmp === undefined ? '' : ` (${consent.cmp})`;
    if (consent.error !== undefined) {
      return `Baner zgody${vendor}: znaleziony, ale odrzucenie nie powiodło się: „${consent.error}”`;
    }
    if (consent.rejected) {
      return `Baner zgody${vendor}: kliknięto „${consent.rejectLabel}” i przeładowano${consent.afterRejectComplete === false ? '; obserwacja niepełna' : ''}`;
    }
    return `Baner zgody${vendor}: znaleziony, brak obsługiwanej opcji odrzucenia; odrzucenie nieprzetestowane`;
  },
};

const MESSAGES: Record<Lang, ReportMessages> = { en, de, hu, fr, it, es, pl };

export const messagesFor = (lang: Lang): ReportMessages => MESSAGES[lang];
