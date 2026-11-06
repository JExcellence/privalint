import type { PageSummary, RuleEvaluation, RuleSummary, ScanResult } from './types.js';

/**
 * One line per rule across all pages: how many pages had a finding, were checked without one,
 * were not evaluable or were skipped, and which pages need a look.
 */
export function summarizeRules(
  pages: readonly PageSummary[],
  ruleIds: readonly string[],
): RuleSummary[] {
  return ruleIds.map((ruleId) => {
    const summary: RuleSummary = {
      ruleId,
      findingDetected: 0,
      checkedNoFinding: 0,
      notEvaluable: 0,
      skipped: {},
      findingPages: [],
      notEvaluablePages: [],
      partialPages: [],
    };
    for (const page of pages) {
      const evaluation = page.ruleEvaluations?.find((entry) => entry.ruleId === ruleId);
      if (evaluation !== undefined) add(summary, evaluation, page.pageId ?? page.url);
    }
    return summary;
  });
}

function add(summary: RuleSummary, evaluation: RuleEvaluation, page: string): void {
  if (evaluation.status === 'skipped') {
    const reason = evaluation.reason ?? 'disabled';
    summary.skipped[reason] = (summary.skipped[reason] ?? 0) + 1;
    return;
  }
  if (evaluation.partial) summary.partialPages.push(page);
  if (evaluation.outcome === 'finding-detected') {
    summary.findingDetected++;
    summary.findingPages.push(page);
  } else if (evaluation.outcome === 'checked-no-finding') {
    summary.checkedNoFinding++;
  } else {
    summary.notEvaluable++;
    summary.notEvaluablePages.push(page);
  }
}

/**
 * The report with per-page rule evaluations left out, for people reading or pasting it. The
 * per-rule summary stays and the coverage gate reads it instead.
 */
export function withSummaryOnly(result: ScanResult): ScanResult {
  return {
    ...result,
    evaluations: 'summary',
    pages: result.pages.map((page) => ({ ...page, ruleEvaluations: [] })),
  };
}
