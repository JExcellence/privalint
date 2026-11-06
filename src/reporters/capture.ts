import { type Lang, say, type Text } from '../i18n.js';
import type { AdapterTiming, RuleExplanation, ScanResult } from '../types.js';

export function isPartial(result: ScanResult): boolean {
  return (
    result.coverage === 'partial' ||
    result.pages.some(
      (page) =>
        page.error !== undefined ||
        page.capture?.complete === false ||
        (page.status !== null && page.status >= 400),
    )
  );
}

export function coverageMessage(result: ScanResult): string {
  return say(result.lang, {
    en: 'Observation incomplete. No findings does not mean a complete check; the reject path may be untested.',
    de: 'Erfassung unvollständig. Keine Befunde bedeutet hier keine vollständige Prüfung; der Ablehnen-Pfad kann ungeprüft sein.',
    hu: 'A megfigyelés hiányos. A megállapítások hiánya itt nem jelent teljes ellenőrzést; az elutasítás ellenőrizetlen lehet.',
  });
}

const LABELS = {
  capture: { en: 'Capture', de: 'Erfassung', hu: 'Rögzítés' },
  requests: { en: 'requests', de: 'Anfragen', hu: 'kérés' },
  responses: { en: 'responses', de: 'Antworten', hu: 'válasz' },
  failures: { en: 'load failures', de: 'Ladefehler', hu: 'betöltési hiba' },
  skipped: { en: 'skipped', de: 'ausgelassen', hu: 'kihagyva' },
  blocks: { en: 'security blocks', de: 'Sicherheitsblockaden', hu: 'biztonsági blokkolás' },
  httpErrors: { en: 'errors', de: 'Fehlerantworten', hu: 'hibaválasz' },
  dropped: {
    en: 'additional issue details omitted',
    de: 'weitere Diagnosen nicht gespeichert',
    hu: 'további diagnosztikai adat nincs eltárolva',
  },
  partial: { en: ' [partial]', de: ' [eingeschränkt]', hu: ' [korlátozott]' },
} satisfies Record<string, Text>;

/** Technical observations are reported separately from privacy findings. */
export function captureLines(result: ScanResult): string[] {
  const lang = result.lang;
  const t = (key: keyof typeof LABELS) => say(lang, LABELS[key]);
  const lines: string[] = [];
  for (const page of result.pages) {
    const data = page.capture?.diagnostics;
    if (data !== undefined) {
      lines.push(
        `${t('capture')} ${page.url}${page.pageId ? ` [${page.pageId}]` : ''}: ` +
          `${data.requests} ${t('requests')}, ${data.responses} ${t('responses')}, ` +
          `${data.failedRequests ?? data.failed} ${t('failures')}, ` +
          `${data.skippedRequests ?? 0} ${t('skipped')}, ` +
          `${data.securityBlockedRequests ?? data.blocked} ${t('blocks')}, ` +
          `${data.httpErrors} HTTP ${t('httpErrors')}.`,
      );
      for (const issue of data.issues) {
        lines.push(
          `  ${issue.phase}: ${issue.kind}${issue.skippedReason ? ` (${issue.skippedReason})` : ''}${issue.limit ? ` (${issue.limit})` : ''}${issue.status ? ` HTTP ${issue.status}` : ''} ${issue.url}`,
        );
      }
      const adapter = data.timing?.adapter;
      if (adapter !== undefined && data.issues.some((issue) => issue.kind === 'timeout')) {
        lines.push(`  ${adapterLine(adapter, lang)}`);
      }
      if (data.dropped) lines.push(`  ${data.dropped} ${t('dropped')}.`);
    }
    for (const evaluation of page.ruleEvaluations ?? []) {
      lines.push(
        `  ${evaluation.ruleId}: ${evaluation.outcome ? outcomeLabel(evaluation.outcome, lang) : evaluation.status} (${evaluation.explanation ? say(lang, EXPLANATIONS[evaluation.explanation]) : (evaluation.reason ?? 'legacy-report')})${evaluation.partial ? t('partial') : ''}`,
      );
    }
  }
  return lines;
}

/** Where the adapter's time went, shown on pages with timeouts so slow adapters stand out. */
function adapterLine(adapter: AdapterTiming, lang: Lang): string {
  const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
  const p50 = seconds(adapter.headersP50Ms ?? 0);
  const p95 = seconds(adapter.headersP95Ms ?? 0);
  const slow = adapter.slowest[0];
  const parts = [
    say(lang, {
      en: `Adapter: ${adapter.requests} requests, headers after ${p50} (median), ${p95} (95th percentile)`,
      de: `Adapter: ${adapter.requests} Anfragen, Antwortkopf nach ${p50} (Median), ${p95} (95 %)`,
      hu: `Adapter: ${adapter.requests} kérés, válaszfejléc ${p50} után (medián), ${p95} (95. percentilis)`,
    }),
  ];
  if (slow !== undefined) {
    const headers =
      slow.headersMs === undefined
        ? say(lang, { en: 'no headers', de: 'kein Antwortkopf', hu: 'nincs válaszfejléc' })
        : `${say(lang, { en: 'headers', de: 'Antwortkopf', hu: 'válaszfejléc' })} ${seconds(slow.headersMs)}`;
    parts.push(
      say(lang, {
        en: `slowest ${slow.url}: queued ${seconds(slow.queuedMs)}, ${headers}`,
        de: `langsamste ${slow.url}: wartete ${seconds(slow.queuedMs)}, ${headers}`,
        hu: `leglassabb ${slow.url}: várakozott ${seconds(slow.queuedMs)}, ${headers}`,
      }),
    );
  }
  return parts.join('; ');
}

function outcomeLabel(outcome: string, lang: Lang): string {
  if (outcome === 'finding-detected') {
    return say(lang, { en: 'Finding detected', de: 'Befund erkannt', hu: 'Megállapítás' });
  }
  if (outcome === 'checked-no-finding') {
    return say(lang, {
      en: 'Checked, no finding',
      de: 'Geprüft, kein Befund',
      hu: 'Ellenőrizve, nincs megállapítás',
    });
  }
  return say(lang, { en: 'Not evaluable', de: 'Nicht prüfbar', hu: 'Nem értékelhető' });
}

const EXPLANATIONS: Record<RuleExplanation, Text> = {
  'unsupported-banner-markup': {
    en: 'Consent UI detected, controls unsupported',
    de: 'Consent-Oberfläche erkannt, Steuerung nicht unterstützt',
    hu: 'Hozzájárulási felület felismerve, a vezérlők nem támogatottak',
  },
  disabled: { en: 'Rule disabled', de: 'Regel deaktiviert', hu: 'Szabály kikapcsolva' },
  'not-start-page': {
    en: 'Consent tested only on the start page',
    de: 'Consent wird nur auf der Startseite geprüft',
    hu: 'A hozzájárulás csak a kezdőlapon van ellenőrizve',
  },
  'consent-disabled': {
    en: 'Consent check disabled',
    de: 'Consent-Prüfung ausgeschaltet',
    hu: 'Hozzájárulás-ellenőrzés kikapcsolva',
  },
  'no-consent-needed': {
    en: 'No banner, and nothing that needs consent loaded',
    de: 'Kein Banner, und nichts Einwilligungspflichtiges geladen',
    hu: 'Nincs banner, és semmi hozzájárulásköteles nem töltődött be',
  },
  'missing-reject-observation': {
    en: 'Reject path not observed',
    de: 'Ablehnen-Pfad nicht beobachtet',
    hu: 'Az elutasítás nincs megfigyelve',
  },
  'settings-check-disabled': {
    en: 'Settings check not enabled (--check-settings)',
    de: 'Einstellungs-Prüfung nicht eingeschaltet (--check-settings)',
    hu: 'A beállítások ellenőrzése nincs bekapcsolva (--check-settings)',
  },
  'transport-not-checked': {
    en: 'Not checked with a network adapter or offline',
    de: 'Mit Netzwerk-Adapter oder offline nicht geprüft',
    hu: 'Hálózati adapterrel vagy offline nincs ellenőrizve',
  },
  'missing-settings-observation': {
    en: 'Settings path not observed',
    de: 'Einstellungs-Pfad nicht beobachtet',
    hu: 'A beállítások útvonala nincs megfigyelve',
  },
  'no-settings-control': {
    en: 'No control found that opens the settings',
    de: 'Kein Bedienelement gefunden, das die Einstellungen öffnet',
    hu: 'Nem található a beállításokat megnyitó vezérlő',
  },
  'no-save-control': {
    en: 'Settings opened, but no save button found',
    de: 'Einstellungen geöffnet, aber keine Speichern-Schaltfläche gefunden',
    hu: 'A beállítások megnyíltak, de nem található mentés gomb',
  },
  'settings-saved-and-reloaded': {
    en: 'Settings saved with everything off and reloaded',
    de: 'Einstellungen ohne Auswahl gespeichert und neu geladen',
    hu: 'Beállítások mindent kikapcsolva mentve, oldal újratöltve',
  },
  'banner-not-shown': {
    en: 'The banner did not appear in the second, fresh browser',
    de: 'Das Banner erschien im zweiten, frischen Browser nicht',
    hu: 'A banner nem jelent meg a második, friss böngészőben',
  },
  'missing-consent-observation': {
    en: 'Consent not observed',
    de: 'Consent nicht beobachtet',
    hu: 'A hozzájárulás nincs megfigyelve',
  },
  'incomplete-document': {
    en: 'Document observation incomplete',
    de: 'Dokument nicht vollständig beobachtet',
    hu: 'A dokumentum megfigyelése hiányos',
  },
  'positive-evidence': {
    en: 'Positive evidence observed',
    de: 'Positive Evidenz beobachtet',
    hu: 'Pozitív bizonyíték megfigyelve',
  },
  'incomplete-observation': {
    en: 'Observation incomplete; absence cannot be established',
    de: 'Beobachtung unvollständig; Abwesenheit nicht feststellbar',
    hu: 'A megfigyelés hiányos; a hiány nem állapítható meg',
  },
  'required-observations-available': {
    en: 'Required observations available',
    de: 'Erforderliche Beobachtungen vorhanden',
    hu: 'A szükséges megfigyelések rendelkezésre állnak',
  },
  'no-supported-banner': {
    en: 'No banner detected',
    de: 'Kein Banner erkannt',
    hu: 'Nem található banner',
  },
  'no-supported-reject-control': {
    en: 'No supported reject control detected',
    de: 'Keine unterstützte Ablehnen-Steuerung erkannt',
    hu: 'Nem található támogatott elutasítási vezérlő',
  },
  'browser-interaction-failed': {
    en: 'Consent interaction failed',
    de: 'Consent-Interaktion fehlgeschlagen',
    hu: 'A hozzájárulási művelet sikertelen',
  },
  'no-linked-page': {
    en: 'The start page links no such page on this site',
    de: 'Die Startseite verlinkt keine solche Seite auf dieser Website',
    hu: 'A kezdőlap nem hivatkozik ilyen oldalra ezen a webhelyen',
  },
  'linked-page-not-loaded': {
    en: 'The linked page could not be loaded',
    de: 'Die verlinkte Seite ließ sich nicht laden',
    hu: 'A hivatkozott oldal nem tölthető be',
  },
  'gpc-check-disabled': {
    en: 'Global Privacy Control check not enabled (--gpc)',
    de: 'Global-Privacy-Control-Prüfung nicht eingeschaltet (--gpc)',
    hu: 'A Global Privacy Control ellenőrzése nincs bekapcsolva (--gpc)',
  },
  'missing-gpc-observation': {
    en: 'Start page not observed with Global Privacy Control',
    de: 'Startseite nicht mit Global Privacy Control beobachtet',
    hu: 'A kezdőlap nem lett Global Privacy Control mellett megfigyelve',
  },
  'gpc-sent': {
    en: 'Start page loaded with Global Privacy Control',
    de: 'Startseite mit Global Privacy Control geladen',
    hu: 'A kezdőlap Global Privacy Control mellett betöltve',
  },
  'close-check-disabled': {
    en: 'Close-button check not enabled (--check-close)',
    de: 'Schließen-Prüfung nicht eingeschaltet (--check-close)',
    hu: 'A bezárásgomb ellenőrzése nincs bekapcsolva (--check-close)',
  },
  'missing-close-observation': {
    en: 'Close path not observed',
    de: 'Schließen-Pfad nicht beobachtet',
    hu: 'A bezárás útvonala nincs megfigyelve',
  },
  'no-close-control': {
    en: 'No close button found in the banner',
    de: 'Keine Schließen-Schaltfläche im Banner gefunden',
    hu: 'Nem található bezárás gomb a bannerben',
  },
  'banner-closed-and-reloaded': {
    en: 'Banner closed and page reloaded',
    de: 'Banner geschlossen und Seite neu geladen',
    hu: 'Banner bezárva, oldal újratöltve',
  },
  'reject-clicked-and-reloaded': {
    en: 'Reject clicked and page reloaded',
    de: 'Ablehnen geklickt und Seite neu geladen',
    hu: 'Elutasítás megnyomva, oldal újratöltve',
  },
};
