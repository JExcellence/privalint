import type { ScanResult, Severity } from '../types.js';
import { countBySeverity, groupByPage, plural } from './shared.js';

const ICONS: Record<Severity, string> = { error: '🔴', warning: '🟡', info: '🔵' };

/** Compact report for GitHub job summaries and PR comments. */
export function formatMarkdown(result: ScanResult): string {
  const counts = countBySeverity(result.findings);
  const lines = [
    `### privalint: ${result.siteUrl}`,
    '',
    `${plural(counts.error, 'error')} · ${plural(counts.warning, 'warning')} · ${plural(result.pages.length, 'page')} scanned`,
  ];

  for (const [pageUrl, findings] of groupByPage(result.findings)) {
    lines.push('', `#### ${pageUrl}`, '', '| | Rule | Finding |', '|---|---|---|');
    for (const finding of findings) {
      lines.push(
        `| ${ICONS[finding.severity]} | \`${finding.ruleId}\` | ${escapeCell(finding.message)} |`,
      );
    }
  }

  const fixes = new Map(
    result.findings.filter((f) => f.fix !== undefined).map((f) => [f.ruleId, f.fix]),
  );
  if (fixes.size > 0) {
    lines.push('', '<details><summary>How to fix</summary>', '');
    for (const [ruleId, fix] of fixes) {
      lines.push(`- **${ruleId}**: ${fix}`);
    }
    lines.push('', '</details>');
  }

  lines.push(
    '',
    '<sub>Automated checks only. A clean result is not proof of GDPR compliance.</sub>',
  );
  return `${lines.join('\n')}\n`;
}

const escapeCell = (text: string) => text.replaceAll('|', '\\|').replaceAll('\n', ' ');
