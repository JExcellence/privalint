import { styleText } from 'node:util';
import type { Finding, ScanResult, Severity } from '../types.js';
import { countBySeverity, describeConsent, groupByPage, plural } from './shared.js';

type Style = Parameters<typeof styleText>[0];

const MARKS: Record<Severity, [string, Style]> = {
  error: ['✖', 'red'],
  warning: ['▲', 'yellow'],
  info: ['ℹ', 'blue'],
};

export function formatText(result: ScanResult, color = false): string {
  const paint = (style: Style, text: string) => (color ? styleText(style, text) : text);
  const lines: string[] = [];

  for (const [pageUrl, findings] of groupByPage(result.findings)) {
    lines.push('', paint('underline', pageUrl));
    for (const finding of findings) {
      lines.push(...formatFinding(finding, paint));
    }
  }

  const failed = result.pages.filter((page) => page.error !== undefined);
  if (failed.length > 0) {
    lines.push('', paint('yellow', `Could not scan ${plural(failed.length, 'page')}:`));
    for (const page of failed) {
      lines.push(`  ${page.url} ${paint('dim', page.error ?? '')}`);
    }
  }

  const counts = countBySeverity(result.findings);
  const pages = plural(result.pages.length, 'page');
  const seconds = (result.durationMs / 1000).toFixed(1);

  lines.push('');
  const consent = describeConsent(result.consent);
  if (consent !== undefined) {
    lines.push(paint('dim', consent));
  }
  if (result.findings.length === 0) {
    lines.push(paint('green', `✔ No problems found on ${pages} (${seconds}s).`));
  } else {
    lines.push(
      `${paint('red', plural(counts.error, 'error'))}, ${paint('yellow', plural(counts.warning, 'warning'))} on ${pages} (${seconds}s).`,
    );
  }
  lines.push(
    paint('dim', 'Automated checks only. A clean result is not proof of GDPR compliance.'),
  );

  return lines.join('\n');
}

function formatFinding(finding: Finding, paint: (style: Style, text: string) => string): string[] {
  const [mark, style] = MARKS[finding.severity];
  const lines = [`  ${paint(style, mark)} ${finding.message} ${paint('dim', finding.ruleId)}`];
  for (const item of finding.evidence) {
    lines.push(paint('dim', `      ${item}`));
  }
  if (finding.fix) {
    lines.push(`      ${paint('cyan', 'fix:')} ${finding.fix}`);
  }
  return lines;
}
