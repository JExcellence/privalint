import type { ScanResult } from '../types.js';

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
          `${data.failed} ${german ? 'fehlgeschlagen' : 'failed'} (${data.blocked} ${german ? 'Sicherheitsblockaden' : 'security blocks'}), ` +
          `${data.httpErrors} HTTP ${german ? 'Fehlerantworten' : 'errors'}.`,
      );
      for (const issue of data.issues) {
        lines.push(
          `  ${issue.phase}: ${issue.kind}${issue.limit ? ` (${issue.limit})` : ''}${issue.status ? ` HTTP ${issue.status}` : ''} ${issue.url}`,
        );
      }
      if (data.dropped)
        lines.push(
          `  ${data.dropped} ${german ? 'weitere Diagnosen nicht gespeichert' : 'additional issue details omitted'}.`,
        );
    }
    for (const evaluation of page.ruleEvaluations ?? []) {
      lines.push(
        `  ${evaluation.ruleId}: ${evaluation.status}${evaluation.reason ? ` (${evaluation.reason})` : ''}${evaluation.partial ? ' [partial]' : ''}`,
      );
    }
  }
  return lines;
}
