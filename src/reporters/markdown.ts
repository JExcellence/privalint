import type { ScanResult, Severity } from '../types.js';
import { messagesFor } from './messages.js';
import { countBySeverity, groupByPage } from './shared.js';

const ICONS: Record<Severity, string> = { error: '🔴', warning: '🟡', info: '🔵' };

/**
 * Compact report for GitHub job summaries and PR comments.
 *
 * Page URLs come from the scanned site and may contain Markdown such as
 * `![x](https://evil.example)` in their query string, so they are only ever
 * rendered inside code spans.
 */
export function formatMarkdown(result: ScanResult): string {
  const m = messagesFor(result.lang);
  const counts = countBySeverity(result.findings);
  const lines = [
    `### privalint: ${code(result.siteUrl)}`,
    '',
    `${m.errors(counts.error)} · ${m.warnings(counts.warning)} · ${m.scanned(m.pages(result.pages.length))}`,
  ];
  if (result.consent !== undefined) {
    lines.push('', escapeText(m.consent(result.consent)));
  }

  for (const [pageUrl, findings] of groupByPage(result.findings)) {
    lines.push('', `#### ${code(pageUrl)}`, '', `| | ${m.rule} | ${m.finding} |`, '|---|---|---|');
    for (const finding of findings) {
      lines.push(
        `| ${ICONS[finding.severity]} | \`${finding.ruleId}\` | ${escapeText(finding.message)} |`,
      );
    }
  }

  const failed = result.pages.filter((page) => page.error !== undefined);
  if (failed.length > 0) {
    lines.push('', m.couldNotScan(failed.length), '');
    for (const page of failed) {
      lines.push(`- ${code(page.url)}: ${escapeText(page.error ?? '')}`);
    }
  }

  const fixes = new Map(
    result.findings.filter((f) => f.fix !== undefined).map((f) => [f.ruleId, f.fix ?? '']),
  );
  if (fixes.size > 0) {
    lines.push('', `<details><summary>${m.howToFix}</summary>`, '');
    for (const [ruleId, fix] of fixes) {
      lines.push(`- **${ruleId}**: ${escapeText(fix)}`);
    }
    lines.push('', '</details>');
  }

  lines.push('', `<sub>${m.disclaimer}</sub>`);
  return `${lines.join('\n')}\n`;
}

const code = (text: string) => `\`${text.replaceAll('`', '%60').replaceAll('\n', ' ')}\``;

const escapeText = (text: string) =>
  text.replace(/[\\`*_[\]()!<>|#~]/g, '\\$&').replaceAll('\n', ' ');
