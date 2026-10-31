import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { assessCoverage } from '../src/coverage.js';
import type { ScanResult } from '../src/types.js';

async function report(name = 'complete'): Promise<ScanResult> {
  return JSON.parse(
    await readFile(new URL(`./fixtures/reports/${name}.json`, import.meta.url), 'utf8'),
  );
}

describe('required observation coverage', () => {
  it('rejects inconsistent counters even if the capture flag claims completion', async () => {
    const value = await report();
    const capture = value.pages[0]?.capture;
    if (!capture) throw new Error('Missing fixture capture');
    capture.diagnostics.requests++;
    expect(assessCoverage(value).issues).toContainEqual(
      expect.objectContaining({ reason: 'inconsistent-counters' }),
    );
  });
  it('passes complete observations with or without retained policy findings', async () => {
    expect(assessCoverage(await report()).complete).toBe(true);
    const allowed = await report('policy-overridden');
    expect(allowed.findings.length).toBeGreaterThan(0);
    expect(assessCoverage(allowed).complete).toBe(true);
  });
  it.each([
    ['an omitted beacon', { kind: 'skipped', skippedReason: 'beacon' }],
    ['a request the page cancelled', { kind: 'skipped', skippedReason: 'cancelled-by-page' }],
  ] as const)('passes a complete capture that only recorded %s', async (_, issue) => {
    const value = await report();
    const capture = value.pages[0]?.capture;
    if (!capture) throw new Error('Missing fixture capture');
    const data = capture.diagnostics;
    data.issues.push({ ...issue, phase: 'before-consent', url: 'https://example.org/[redacted]' });
    data.issueCount++;
    data.requests++;
    data.failed++;
    data.skippedRequests = (data.skippedRequests ?? 0) + 1;
    expect(capture.complete).toBe(true);
    expect(assessCoverage(value)).toEqual({ complete: true, issues: [] });
  });
  it.each(['partial', 'skipped'])(
    'does not treat %s observations as passing coverage',
    async (name) => {
      const assessment = assessCoverage(await report(name));
      expect(assessment.complete).toBe(false);
      expect(assessment.issues).toContainEqual(
        expect.objectContaining({ reason: 'incomplete-capture' }),
      );
    },
  );
  it('ignores intentional disabled/consent-disabled/non-start-page exclusions', async () => {
    const value = await report();
    value.coverage = 'partial'; // The broader observation report may still mention untested consent.
    const page = value.pages[0];
    if (!page) throw new Error('Missing fixture page');
    if (!page.ruleEvaluations) throw new Error('Missing fixture evaluations');
    page.ruleEvaluations = page.ruleEvaluations.map((evaluation, index) =>
      index > 2
        ? evaluation
        : {
            ...evaluation,
            status: 'skipped',
            reason:
              (['disabled', 'consent-disabled', 'not-start-page'] as const)[index] ?? 'disabled',
            outcome: 'not-evaluable',
            findingCount: 0,
            partial: false,
          },
    );
    expect(assessCoverage(value).complete).toBe(true);
  });
  it('rejects missing checks, incomplete positive evidence and unobserved reject paths', async () => {
    const value = await report();
    const evaluations = value.pages[0]?.ruleEvaluations;
    if (!evaluations) throw new Error('Missing fixture evaluations');
    evaluations.pop();
    Object.assign(evaluations[0] ?? {}, { partial: true, outcome: 'finding-detected' });
    Object.assign(evaluations[1] ?? {}, { outcome: 'not-evaluable' });
    const assessment = assessCoverage(value);
    expect(assessment.complete).toBe(false);
    expect(assessment.issues.map((issue) => issue.reason)).toEqual(
      expect.arrayContaining(['missing-evaluation', 'partial-evaluation', 'not-evaluable']),
    );
  });
  it('does not accept unsupported or empty reports and redacts all diagnostic locations', async () => {
    const value = await report();
    value.schemaVersion = '2.0.0';
    expect(assessCoverage(value)).toEqual({
      complete: false,
      issues: [{ reason: 'unsupported-schema' }],
    });
    value.schemaVersion = '1.1.0';
    value.pages = [];
    expect(assessCoverage(value).issues).toEqual([{ reason: 'missing-pages' }]);
    const partial = await report('partial');
    const page = partial.pages[0];
    if (page) page.url = 'https://user:SECRET@example.org/reset/SECRET?token=SECRET#SECRET';
    expect(JSON.stringify(assessCoverage(partial))).not.toContain('SECRET');
  });
});
