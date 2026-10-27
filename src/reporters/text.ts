import { styleText } from 'node:util';
import type { Finding, ScanResult, Severity } from '../types.js';
import { captureLines, coverageMessage, isPartial } from './capture.js';
import { messagesFor, type ReportMessages } from './messages.js';
import { countBySeverity, groupByPage } from './shared.js';

type Style = Parameters<typeof styleText>[0];

const MARKS: Record<Severity, [string, Style]> = {
  error: ['✖', 'red'],
  warning: ['▲', 'yellow'],
  info: ['ℹ', 'blue'],
};

export function formatText(result: ScanResult, color = false): string {
  const paint = (style: Style, text: string) => (color ? styleText(style, text) : text);
  const m = messagesFor(result.lang);
  const lines: string[] = [];

  for (const [pageUrl, findings] of groupByPage(result.findings)) {
    lines.push('', paint('underline', pageUrl));
    for (const finding of findings) {
      lines.push(...formatFinding(finding, paint, m));
    }
  }

  const failed = result.pages.filter((page) => page.error !== undefined);
  if (failed.length > 0) {
    lines.push('', paint('yellow', m.couldNotScan(failed.length)));
    for (const page of failed) {
      lines.push(`  ${page.url} ${paint('dim', page.error ?? '')}`);
    }
  }

  const counts = countBySeverity(result.findings);
  const pages = m.pages(result.pages.length);
  const duration = m.duration(result.durationMs);

  lines.push('');
  lines.push(...captureLines(result));
  if (isPartial(result)) lines.push(paint('yellow', coverageMessage(result)));
  if (result.consent !== undefined) {
    lines.push(paint('dim', m.consent(result.consent)));
  }
  if (result.findings.length === 0 && !isPartial(result)) {
    lines.push(paint('green', `✔ ${m.noProblems(pages, duration)}`));
  } else if (result.findings.length > 0) {
    lines.push(
      `${paint('red', m.errors(counts.error))}, ${paint('yellow', m.warnings(counts.warning))} ${m.on} ${pages} (${duration}).`,
    );
  }
  lines.push(paint('dim', m.disclaimer));

  return lines.join('\n');
}

function formatFinding(
  finding: Finding,
  paint: (style: Style, text: string) => string,
  m: ReportMessages,
): string[] {
  const [mark, style] = MARKS[finding.severity];
  const lines = [`  ${paint(style, mark)} ${finding.message} ${paint('dim', finding.ruleId)}`];
  for (const item of finding.evidence) {
    lines.push(paint('dim', `      ${item}`));
  }
  if (finding.fix) {
    lines.push(`      ${paint('cyan', m.fix)} ${finding.fix}`);
  }
  if (finding.references !== undefined && finding.references.length > 0) {
    lines.push(paint('dim', `      ${m.legalBasis} ${finding.references.join('; ')}`));
  }
  return lines;
}
