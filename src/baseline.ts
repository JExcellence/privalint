import { createHash } from 'node:crypto';
import { identifyReportSchema } from './report-contract.js';
import type { BaselineFixed, BaselineSummary, Finding, ScanResult } from './types.js';

/**
 * A stable identity for a finding across runs: its rule, page and subject (such as a vendor). The
 * message and evidence may change between runs; these three don't. SARIF uses the same value as
 * `partialFingerprints.primaryLocationLineHash`.
 */
export function findingFingerprint(finding: Pick<Finding, 'ruleId' | 'pageUrl' | 'subject'>) {
  return createHash('sha256')
    .update(`${finding.ruleId}\n${finding.pageUrl}\n${finding.subject ?? ''}`)
    .digest('hex')
    .slice(0, 32);
}

/** The schema major version the scanner writes; a baseline must have the same. */
const CURRENT_MAJOR = '1';

/**
 * Reads the findings of an earlier JSON report. Throws for anything else: a SARIF or Markdown
 * file, a report without a schema version, or one with another schema major version.
 */
export function readBaseline(text: string): Finding[] {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('the baseline is not a JSON report (privalint --format json)');
  }
  const identity = identifyReportSchema(value);
  if (identity.kind === 'legacy') {
    throw new Error('the baseline has no schemaVersion; create it again with this privalint');
  }
  const major = identity.version?.split('.')[0];
  if (identity.kind !== 'supported' || major !== CURRENT_MAJOR) {
    throw new Error(
      `the baseline has schema ${identity.version ?? 'unknown'}; only ${CURRENT_MAJOR}.x reports can be compared`,
    );
  }
  const findings = Reflect.get(value as object, 'findings');
  if (!Array.isArray(findings)) throw new Error('the baseline has no findings list');
  return findings.filter(
    (finding): finding is Finding =>
      typeof finding === 'object' &&
      finding !== null &&
      typeof finding.ruleId === 'string' &&
      typeof finding.pageUrl === 'string',
  );
}

/**
 * Marks each finding as new or existing against the baseline's findings, and lists the baseline
 * findings that are gone as fixed.
 */
export function applyBaseline(result: ScanResult, baseline: readonly Finding[]): ScanResult {
  const known = new Set(baseline.map(findingFingerprint));
  const findings = result.findings.map(
    (finding): Finding => ({
      ...finding,
      baseline: known.has(findingFingerprint(finding)) ? 'existing' : 'new',
    }),
  );
  const current = new Set(result.findings.map(findingFingerprint));
  // Gone only counts as fixed where this scan checked again: the page was scanned and the rule
  // ran on it completely. An opt-in check left off this time, or a page the crawl didn't reach,
  // says nothing about the finding.
  const checkedAgain = (finding: Finding): boolean => {
    const page = result.pages.find(
      (candidate) => candidate.finalUrl === finding.pageUrl || candidate.url === finding.pageUrl,
    );
    if (page === undefined) return false;
    if (page.ruleEvaluations === undefined) return true;
    const evaluation = page.ruleEvaluations.find((entry) => entry.ruleId === finding.ruleId);
    return evaluation?.status === 'executed' && !evaluation.partial;
  };
  const fixed: BaselineFixed[] = [];
  const listed = new Set<string>();
  for (const finding of baseline) {
    const key = findingFingerprint(finding);
    if (current.has(key) || listed.has(key) || !checkedAgain(finding)) continue;
    listed.add(key);
    fixed.push({
      ruleId: finding.ruleId,
      pageUrl: finding.pageUrl,
      ...(typeof finding.subject === 'string' ? { subject: finding.subject } : {}),
    });
  }
  const summary: BaselineSummary = {
    new: findings.filter((finding) => finding.baseline === 'new').length,
    existing: findings.filter((finding) => finding.baseline === 'existing').length,
    fixed,
  };
  return { ...result, findings, baseline: summary };
}
