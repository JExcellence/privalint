import type { ScanResult, Severity } from '../types.js';
import { captureLines, coverageMessage, isPartial } from './capture.js';
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
  if (result.scannerVersion)
    lines.push('', `privalint ${result.scannerVersion} · schema ${result.schemaVersion}`);
  if (result.consent !== undefined) {
    lines.push('', escapeText(m.consent(result.consent)));
  }
  if (isPartial(result)) lines.push('', escapeText(coverageMessage(result)));
  const observations = captureLines(result);
  if (observations.length > 0) {
    lines.push('', ...observations.map((line) => `- ${escapeText(line)}`));
  }

  for (const [pageUrl, findings] of groupByPage(result.findings)) {
    lines.push('', `#### ${code(pageUrl)}`, '', `| | ${m.rule} | ${m.finding} |`, '|---|---|---|');
    for (const finding of findings) {
      const policy = finding.policy
        ? ` [${m.policy(finding.policy.allowed, finding.policy.originalSeverity)}]`
        : '';
      lines.push(
        `| ${ICONS[finding.severity]} | \`${finding.ruleId}\` | ${escapeText(finding.message + policy)}${evidenceCell(finding.evidence)} |`,
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

  // Keyed by rule and fix text: the tracker rules give each vendor its own fix, and the same
  // fix found on several pages is listed once.
  const fixes = new Map(
    result.findings.filter((f) => f.fix !== undefined).map((f) => [`${f.ruleId}\n${f.fix}`, f]),
  );
  if (fixes.size > 0) {
    lines.push('', `<details><summary>${m.howToFix}</summary>`, '');
    for (const { ruleId, fix, references } of fixes.values()) {
      const legal = references?.length ? ` (${m.legalBasis} ${references.join('; ')})` : '';
      lines.push(`- **${ruleId}**: ${escapeText(`${fix ?? ''}${legal}`)}`);
    }
    lines.push('', '</details>');
  }

  lines.push('', `<sub>${m.disclaimer}</sub>`);
  return `${lines.join('\n')}\n`;
}

const code = (text: string) => `\`${text.replaceAll('`', '%60').replaceAll('\n', ' ')}\``;

const EVIDENCE_SHOWN = 2;
const EVIDENCE_LENGTH = 120;

/**
 * The first evidence items under a finding, so a PR reader sees which request or cookie to fix.
 * GitHub tables end a cell at "|" even inside code spans, unless it is escaped.
 */
function evidenceCell(evidence: readonly string[]): string {
  const shown = evidence.slice(0, EVIDENCE_SHOWN).map((item) => {
    const short = item.length > EVIDENCE_LENGTH ? `${item.slice(0, EVIDENCE_LENGTH - 1)}…` : item;
    return `<br>${code(short).replaceAll('|', '\\|')}`;
  });
  const rest = evidence.length - EVIDENCE_SHOWN;
  return shown.join('') + (rest > 0 ? ` (+${rest})` : '');
}

// "@" is escaped so a page error or vendor name can't mention a GitHub user in a PR comment.
const escapeText = (text: string) =>
  text.replace(/[\\`*_[\]()!<>|#~@]/g, '\\$&').replaceAll('\n', ' ');
