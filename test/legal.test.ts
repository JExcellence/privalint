import { describe, expect, it } from 'vitest';
import { applyRegion, legalReferences, REGIONS } from '../src/legal.js';
import { defaultRules } from '../src/rules/index.js';
import type { Finding } from '../src/types.js';

const finding = (ruleId: string, severity: Finding['severity'] = 'error'): Finding => ({
  ruleId,
  severity,
  message: 'm',
  pageUrl: 'https://example.ch/',
  evidence: [],
});

describe('legal references', () => {
  it('cover every built-in rule in every region', () => {
    for (const rule of defaultRules) {
      for (const region of REGIONS) {
        expect(legalReferences(rule.id, region)?.length, `${rule.id}/${region}`).toBeGreaterThan(0);
      }
    }
  });

  it('cite the law of the chosen country', () => {
    expect(applyRegion([finding('impressum-link')], 'at')[0]?.references).toEqual([
      '§ 5 ECG',
      '§ 25 MedienG',
    ]);
    expect(applyRegion([finding('impressum-link')], 'ch')[0]?.references).toEqual([
      'Art. 3 Abs. 1 lit. s UWG',
    ]);
  });

  it('leave findings of custom rules alone', () => {
    const [result] = applyRegion([finding('my-rule', 'warning')], 'ch');
    expect(result).toEqual(finding('my-rule', 'warning'));
  });
});

describe('severity per country', () => {
  const severity = (ruleId: string, region: (typeof REGIONS)[number], start: Finding['severity']) =>
    applyRegion([finding(ruleId, start)], region)[0]?.severity;

  it('keeps the rule defaults in Germany, Austria and the EU', () => {
    for (const region of ['de', 'at', 'eu'] as const) {
      expect(severity('pre-consent-trackers', region, 'error')).toBe('error');
    }
  });

  it('softens opt-in findings and the imprint in Switzerland', () => {
    expect(severity('pre-consent-trackers', 'ch', 'error')).toBe('warning');
    expect(severity('pre-consent-trackers', 'ch', 'warning')).toBe('info');
    expect(severity('third-party-embeds', 'ch', 'warning')).toBe('info');
    expect(severity('impressum-link', 'ch', 'warning')).toBe('info');
  });

  it('never goes below info and keeps an ignored refusal serious', () => {
    expect(severity('impressum-link', 'ch', 'info')).toBe('info');
    expect(severity('trackers-after-reject', 'ch', 'error')).toBe('error');
  });
});
