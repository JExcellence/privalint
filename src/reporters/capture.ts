import type { RuleExplanation, ScanResult } from '../types.js';

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
  return result.lang === 'de'
    ? 'Erfassung unvollständig. Keine Befunde bedeutet hier keine vollständige Prüfung; der Ablehnen-Pfad kann ungeprüft sein.'
    : 'Observation incomplete. No findings does not mean a complete check; the reject path may be untested.';
}

/** Technical observations are reported separately from privacy findings. */
export function captureLines(result: ScanResult): string[] {
  const german = result.lang === 'de';
  const lines: string[] = [];
  for (const page of result.pages) {
    const data = page.capture?.diagnostics;
    if (data !== undefined) {
      lines.push(
        `${german ? 'Erfassung' : 'Capture'} ${page.url}: ` +
          `${data.requests} ${german ? 'Anfragen' : 'requests'}, ${data.responses} ${german ? 'Antworten' : 'responses'}, ` +
          `${data.failedRequests ?? data.failed} ${german ? 'Ladefehler' : 'load failures'}, ` +
          `${data.skippedRequests ?? 0} ${german ? 'ausgelassen' : 'skipped'}, ` +
          `${data.securityBlockedRequests ?? data.blocked} ${german ? 'Sicherheitsblockaden' : 'security blocks'}, ` +
          `${data.httpErrors} HTTP ${german ? 'Fehlerantworten' : 'errors'}.`,
      );
      for (const issue of data.issues) {
        lines.push(
          `  ${issue.phase}: ${issue.kind}${issue.skippedReason ? ` (${issue.skippedReason})` : ''}${issue.limit ? ` (${issue.limit})` : ''}${issue.status ? ` HTTP ${issue.status}` : ''} ${issue.url}`,
        );
      }
      if (data.dropped)
        lines.push(
          `  ${data.dropped} ${german ? 'weitere Diagnosen nicht gespeichert' : 'additional issue details omitted'}.`,
        );
    }
    for (const evaluation of page.ruleEvaluations ?? []) {
      lines.push(
        `  ${evaluation.ruleId}: ${evaluation.outcome ? outcomeLabel(evaluation.outcome, german) : evaluation.status} (${evaluation.explanation ? explanationLabel(evaluation.explanation, german) : (evaluation.reason ?? 'legacy-report')})${evaluation.partial ? (german ? ' [eingeschränkt]' : ' [partial]') : ''}`,
      );
    }
  }
  return lines;
}

function outcomeLabel(outcome: string, german: boolean): string {
  if (outcome === 'finding-detected') return german ? 'Befund erkannt' : 'Finding detected';
  if (outcome === 'checked-no-finding')
    return german ? 'Geprüft, kein Befund' : 'Checked, no finding';
  return german ? 'Nicht prüfbar' : 'Not evaluable';
}

const EXPLANATIONS: Record<RuleExplanation, [string, string]> = {
  'unsupported-banner-markup': [
    'Consent UI detected, controls unsupported',
    'Consent-Oberfläche erkannt, Steuerung nicht unterstützt',
  ],
  disabled: ['Rule disabled', 'Regel deaktiviert'],
  'not-start-page': [
    'Consent tested only on the start page',
    'Consent wird nur auf der Startseite geprüft',
  ],
  'consent-disabled': ['Consent check disabled', 'Consent-Prüfung ausgeschaltet'],
  'missing-reject-observation': ['Reject path not observed', 'Ablehnen-Pfad nicht beobachtet'],
  'missing-consent-observation': ['Consent not observed', 'Consent nicht beobachtet'],
  'incomplete-document': [
    'Document observation incomplete',
    'Dokument nicht vollständig beobachtet',
  ],
  'positive-evidence': ['Positive evidence observed', 'Positive Evidenz beobachtet'],
  'incomplete-observation': [
    'Observation incomplete; absence cannot be established',
    'Beobachtung unvollständig; Abwesenheit nicht feststellbar',
  ],
  'required-observations-available': [
    'Required observations available',
    'Erforderliche Beobachtungen vorhanden',
  ],
  'no-supported-banner': ['No banner detected', 'Kein Banner erkannt'],
  'no-supported-reject-control': [
    'No supported reject control detected',
    'Keine unterstützte Ablehnen-Steuerung erkannt',
  ],
  'browser-interaction-failed': [
    'Consent interaction failed',
    'Consent-Interaktion fehlgeschlagen',
  ],
  'reject-clicked-and-reloaded': [
    'Reject clicked and page reloaded',
    'Ablehnen geklickt und Seite neu geladen',
  ],
};

function explanationLabel(reason: RuleExplanation, german: boolean): string {
  return EXPLANATIONS[reason][german ? 1 : 0];
}
