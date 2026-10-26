import type { ConsentSummary, Finding, Severity } from '../types.js';

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

export function describeConsent(consent: ConsentSummary | undefined): string | undefined {
  if (consent === undefined) {
    return undefined;
  }
  if (!consent.bannerFound) {
    return 'Consent banner: none found';
  }
  const vendor = consent.cmp === undefined ? '' : ` (${consent.cmp})`;
  if (consent.error !== undefined) {
    return `Consent banner${vendor}: found, but rejecting failed: ${consent.error}`;
  }
  if (consent.rejected) {
    return `Consent banner${vendor}: clicked "${consent.rejectLabel}" and reloaded`;
  }
  return `Consent banner${vendor}: found, no reject button`;
}

export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
