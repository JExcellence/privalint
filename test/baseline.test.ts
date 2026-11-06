import { describe, expect, it } from 'vitest';
import { applyBaseline, findingFingerprint, readBaseline } from '../src/baseline.js';
import { formatMarkdown } from '../src/reporters/markdown.js';
import { formatSarif } from '../src/reporters/sarif.js';
import { formatText } from '../src/reporters/text.js';
import type { Finding, ScanResult } from '../src/types.js';

const finding = (ruleId: string, subject?: string, message = 'Something'): Finding => ({
  ruleId,
  severity: 'error',
  message,
  pageUrl: 'https://example.de/',
  evidence: [],
  ...(subject === undefined ? {} : { subject }),
});

const result = (findings: Finding[]): ScanResult => ({
  schemaVersion: '1.5.0',
  siteUrl: 'https://example.de/',
  lang: 'en',
  region: 'de',
  scannedAt: '2026-11-06T00:00:00.000Z',
  durationMs: 1000,
  pages: [],
  findings,
  rules: [],
});

describe('findingFingerprint', () => {
  it('ignores message and evidence, but not rule, page or subject', () => {
    const base = finding('pre-consent-trackers', 'Google Analytics');
    const reworded: Finding = { ...base, message: 'Other text', evidence: ['x'] };
    expect(findingFingerprint(reworded)).toBe(findingFingerprint(base));
    expect(findingFingerprint({ ...base, subject: 'Hotjar' })).not.toBe(findingFingerprint(base));
    expect(findingFingerprint({ ...base, pageUrl: 'https://example.de/a' })).not.toBe(
      findingFingerprint(base),
    );
    expect(findingFingerprint(base)).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('readBaseline', () => {
  it('reads the findings of a JSON report', () => {
    const report = result([finding('google-fonts')]);
    expect(readBaseline(JSON.stringify(report))).toEqual(report.findings);
  });

  it('rejects other files and schema versions', () => {
    expect(() => readBaseline('<sarif>')).toThrow('not a JSON report');
    expect(() => readBaseline(JSON.stringify({ findings: [] }))).toThrow('no schemaVersion');
    expect(() => readBaseline(JSON.stringify({ schemaVersion: '2.0.0', findings: [] }))).toThrow(
      'schema 2.0.0',
    );
    expect(() => readBaseline(JSON.stringify({ schemaVersion: '1.5.0' }))).toThrow(
      'no findings list',
    );
  });
});

describe('applyBaseline', () => {
  const kept = finding('pre-consent-trackers', 'Google Analytics', 'Reworded');
  const added = finding('google-fonts');
  const gone = finding('pre-consent-trackers', 'Hotjar');
  const compared = applyBaseline(result([kept, added]), [
    finding('pre-consent-trackers', 'Google Analytics'),
    gone,
    gone,
  ]);

  it('marks findings as new or existing and lists fixed ones once', () => {
    expect(compared.findings.map((f) => f.baseline)).toEqual(['existing', 'new']);
    expect(compared.baseline).toEqual({
      new: 1,
      existing: 1,
      fixed: [
        { ruleId: 'pre-consent-trackers', pageUrl: 'https://example.de/', subject: 'Hotjar' },
      ],
    });
  });

  it('shows the comparison in text, Markdown and SARIF', () => {
    const counts = 'Compared with the baseline: 1 new, 1 existing, 1 fixed';
    expect(formatText(compared)).toContain(counts);
    expect(formatText(compared)).toContain('google-fonts [new]');
    expect(formatMarkdown(compared)).toContain(counts);
    const results = JSON.parse(formatSarif(compared)).runs[0].results;
    expect(results.map((r: { baselineState: string }) => r.baselineState)).toEqual([
      'unchanged',
      'new',
    ]);
  });

  it('leaves reports without a baseline unmarked', () => {
    expect(formatText(result([added]))).not.toContain('[new]');
    expect(JSON.parse(formatSarif(result([added]))).runs[0].results[0].baselineState).toBe(
      undefined,
    );
  });
});
