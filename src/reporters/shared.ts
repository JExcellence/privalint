import type { Finding, Severity } from '../types.js';

export function groupByPage(findings: readonly Finding[]): Map<string, Finding[]> {
  const pages = new Map<string, Finding[]>();
  for (const finding of findings) {
    const list = pages.get(finding.pageUrl) ?? [];
    list.push(finding);
    pages.set(finding.pageUrl, list);
  }
  return pages;
}

export function countBySeverity(findings: readonly Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  for (const finding of findings) {
    counts[finding.severity]++;
  }
  return counts;
}
