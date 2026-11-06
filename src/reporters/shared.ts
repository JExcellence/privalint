import type { Finding, Severity } from '../types.js';

/** How a page is named in reports: its URL, with the page ID when there is one. */
export const pageLabel = (finding: Finding): string =>
  finding.pageId === undefined ? finding.pageUrl : `${finding.pageUrl} [${finding.pageId}]`;

export function groupByPage(findings: readonly Finding[]): Map<string, Finding[]> {
  const pages = new Map<string, Finding[]>();
  for (const finding of findings) {
    const key = pageLabel(finding);
    const list = pages.get(key) ?? [];
    list.push(finding);
    pages.set(key, list);
  }
  return pages;
}

/**
 * Rules about something every page should have, such as the footer links. The same finding on
 * several pages has the same cause, usually one layout, so reports show it once.
 */
const SITE_WIDE = new Set(['impressum-link', 'privacy-policy-link']);

export interface SiteWideFinding {
  /** The first page's finding. */
  finding: Finding;
  pages: string[];
}

/**
 * Splits findings into those that repeat across pages (same rule, severity and fix) and the rest.
 * Reports only: the JSON and SARIF keep one finding per page.
 */
export function splitSiteWide(findings: readonly Finding[]): {
  siteWide: SiteWideFinding[];
  perPage: Finding[];
} {
  const groups = new Map<string, Finding[]>();
  for (const finding of findings) {
    if (!SITE_WIDE.has(finding.ruleId)) continue;
    const key = `${finding.ruleId}
${finding.severity}
${finding.fix ?? ''}`;
    groups.set(key, [...(groups.get(key) ?? []), finding]);
  }
  const repeated = [...groups.values()].filter((group) => group.length > 1);
  const grouped = new Set(repeated.flat());
  return {
    siteWide: repeated.map((group) => ({
      finding: group[0] as Finding,
      pages: group.map(pageLabel),
    })),
    perPage: findings.filter((finding) => !grouped.has(finding)),
  };
}

export function countBySeverity(findings: readonly Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  for (const finding of findings) {
    counts[finding.severity]++;
  }
  return counts;
}
