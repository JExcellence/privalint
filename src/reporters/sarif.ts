import { createHash } from 'node:crypto';
import { REPOSITORY_URL, ruleDocsUrl, VERSION } from '../meta.js';
import type { Finding, ScanResult, Severity } from '../types.js';

const LEVELS: Record<Severity, 'error' | 'warning' | 'note'> = {
  error: 'error',
  warning: 'warning',
  info: 'note',
};

/**
 * SARIF 2.1.0 for GitHub code scanning.
 *
 * Code scanning expects every result to point at a file in the repository,
 * which a live website does not have. Each page is mapped to a stable
 * pseudo path (`privalint/<host>/<path>`) so alerts stay grouped per page
 * and keep their identity between runs.
 */
export function formatSarif(result: ScanResult): string {
  const sarif = {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'privalint',
            semanticVersion: VERSION,
            informationUri: REPOSITORY_URL,
            rules: result.rules.map((rule) => ({
              id: rule.id,
              name: rule.id,
              shortDescription: { text: rule.title },
              fullDescription: { text: rule.description },
              help: {
                text: `${rule.description}\n\nReferences: ${rule.references.join('; ')}`,
                markdown: `${rule.description}\n\n**References:** ${rule.references.join('; ')}`,
              },
              helpUri: ruleDocsUrl(rule.id),
              properties: { tags: ['privacy', 'gdpr'], precision: 'high' },
            })),
          },
        },
        results: result.findings.map(toResult),
      },
    ],
  };
  return `${JSON.stringify(sarif, null, 2)}\n`;
}

function toResult(finding: Finding) {
  const evidence = finding.evidence.map((item) => `- ${item}`).join('\n');
  return {
    ruleId: finding.ruleId,
    level: LEVELS[finding.severity],
    message: {
      text: [finding.message, `Page: ${finding.pageUrl}`, evidence, finding.fix]
        .filter(Boolean)
        .join('\n\n'),
    },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: pseudoPath(finding.pageUrl) },
          region: { startLine: 1 },
        },
      },
    ],
    partialFingerprints: {
      primaryLocationLineHash: createHash('sha256')
        .update(`${finding.ruleId}\n${finding.pageUrl}\n${finding.subject ?? ''}`)
        .digest('hex')
        .slice(0, 32),
    },
  };
}

function pseudoPath(pageUrl: string): string {
  const url = new URL(pageUrl);
  const path = url.pathname.endsWith('/') ? `${url.pathname}index` : url.pathname;
  return `privalint/${url.host}${path}`.replace(/[^\w./-]/g, '_');
}
