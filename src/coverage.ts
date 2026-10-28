import { diagnosticUrl } from './diagnostics.js';
import { identifyReportSchema } from './report-contract.js';
import type { LoadDiagnostics, ScanResult } from './types.js';

export interface CoverageIssue {
  pageId?: string;
  pageUrl?: string;
  ruleId?: string;
  reason:
    | 'legacy-report'
    | 'unsupported-schema'
    | 'missing-pages'
    | 'incomplete-capture'
    | 'missing-evaluation'
    | 'not-evaluable'
    | 'partial-evaluation'
    | 'inconsistent-counters';
}
export interface CoverageAssessment {
  complete: boolean;
  issues: CoverageIssue[];
}

/** Opt-in observation gate. Intentional exclusions are not privacy or coverage failures. */
export function assessCoverage(result: ScanResult): CoverageAssessment {
  const identity = identifyReportSchema(result);
  if (identity.kind !== 'supported') {
    return {
      complete: false,
      issues: [{ reason: identity.kind === 'legacy' ? 'legacy-report' : 'unsupported-schema' }],
    };
  }
  const issues: CoverageIssue[] = [];
  const selected = result.options?.selectedRules ?? result.rules.map((rule) => rule.id);
  if (result.pages.length === 0) issues.push({ reason: 'missing-pages' });
  for (const page of result.pages) {
    const location = {
      ...(page.pageId === undefined ? {} : { pageId: page.pageId }),
      pageUrl: diagnosticUrl(page.url),
    };
    if (
      !page.capture?.complete ||
      !page.capture.document ||
      page.capture.diagnostics.issueCount > 0 ||
      page.error !== undefined ||
      page.status === null ||
      page.status >= 400
    ) {
      issues.push({ ...location, reason: 'incomplete-capture' });
    }
    if (page.capture && !consistentCounters(page.capture.diagnostics)) {
      issues.push({ ...location, reason: 'inconsistent-counters' });
    }
    const evaluations = new Map(
      (page.ruleEvaluations ?? []).map((evaluation) => [evaluation.ruleId, evaluation]),
    );
    for (const ruleId of selected) {
      const evaluation = evaluations.get(ruleId);
      if (evaluation === undefined) {
        issues.push({ ...location, ruleId, reason: 'missing-evaluation' });
      } else if (
        evaluation.status === 'skipped' &&
        ['disabled', 'consent-disabled', 'not-start-page', 'no-consent-needed'].includes(
          evaluation.reason ?? '',
        )
      ) {
        continue;
      } else if (
        evaluation.status !== 'executed' ||
        !['checked-no-finding', 'finding-detected'].includes(evaluation.outcome ?? '')
      ) {
        issues.push({ ...location, ruleId, reason: 'not-evaluable' });
      } else if (evaluation.partial) {
        issues.push({ ...location, ruleId, reason: 'partial-evaluation' });
      }
    }
  }
  return { complete: issues.length === 0, issues };
}

function consistentCounters(data: LoadDiagnostics): boolean {
  const values = [
    data.requests,
    data.finished,
    data.failed,
    data.blocked,
    data.skippedRequests,
    data.failedRequests,
    data.securityBlockedRequests,
    data.responses,
    data.httpErrors,
    data.omittedRequests,
    data.issueCount,
    data.dropped,
    data.bytes,
  ];
  if (
    !values.every((value) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
  )
    return false;
  return (
    data.requests ===
      data.finished +
        (data.skippedRequests ?? 0) +
        (data.failedRequests ?? 0) +
        (data.securityBlockedRequests ?? 0) &&
    data.failed ===
      (data.skippedRequests ?? 0) +
        (data.failedRequests ?? 0) +
        (data.securityBlockedRequests ?? 0) &&
    data.blocked === data.securityBlockedRequests &&
    data.responses <= data.requests &&
    data.httpErrors <= data.responses &&
    data.omittedRequests <= data.requests &&
    data.issueCount === data.issues.length + data.dropped
  );
}
