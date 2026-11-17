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
    expect(applyRegion([finding('impressum-link')], 'hu')[0]?.references).toEqual(['Ekertv. 4. §']);
    expect(applyRegion([finding('pre-consent-trackers')], 'hu')[0]?.references).toContain(
      'Eht. 155. § (4)',
    );
    expect(applyRegion([finding('pre-consent-trackers')], 'fr')[0]?.references).toContain(
      'Art. 82 loi n° 78-17 du 6 janvier 1978',
    );
    expect(applyRegion([finding('impressum-link')], 'fr')[0]?.references?.[0]).toMatch(/LCEN/);
    expect(applyRegion([finding('pre-consent-trackers')], 'uk')[0]?.references).toContain(
      'PECR reg. 6(1), Sch. A1 para. 2',
    );
    expect(
      applyRegion([finding('third-country-providers')], 'uk')[0]?.references?.join(' '),
    ).toContain('Arts. 44A, 45A');
    expect(applyRegion([finding('pre-consent-trackers')], 'it')[0]?.references?.[0]).toMatch(
      /Art\. 122.*Codice privacy/,
    );
    expect(applyRegion([finding('pre-consent-trackers')], 'es')[0]?.references).toContain(
      'Art. 22.2 LSSI',
    );
    expect(applyRegion([finding('pre-consent-trackers')], 'nl')[0]?.references).toContain(
      'Art. 11.7a lid 1 Tw',
    );
    expect(applyRegion([finding('pre-consent-trackers')], 'pl')[0]?.references).toContain(
      'art. 399 ust. 1 PKE',
    );
  });

  it('leave findings of custom rules alone', () => {
    const [result] = applyRegion([finding('my-rule', 'warning')], 'ch');
    expect(result).toEqual(finding('my-rule', 'warning'));
  });
});

describe('withdrawal versus refusal', () => {
  // Art. 7(3) GDPR is about withdrawing consent that was given. A refusal leaves the processing
  // without a legal basis, so refusal rules cite Art. 6(1)(a) instead.
  const withdrawal =
    /7\. cikk \(3\)|Art\. 7 Abs\. 3|Art\. 7\(3\)|Art\. 7\.3|Art\. 7, par\. 3|Art\. 7 lid 3|art\. 7 ust\. 3/;

  it.each(['trackers-after-reject', 'trackers-after-settings', 'reject-option'])(
    '%s does not cite the withdrawal provision',
    (ruleId) => {
      for (const region of REGIONS) {
        expect(legalReferences(ruleId, region)?.join(' ')).not.toMatch(withdrawal);
      }
    },
  );

  it('keeps the withdrawal provision for reopening the settings', () => {
    for (const region of REGIONS.filter((region) => region !== 'ch')) {
      expect(legalReferences('consent-settings-link', region)?.join(' ')).toMatch(withdrawal);
    }
  });
});

describe('severity per country', () => {
  const severity = (ruleId: string, region: (typeof REGIONS)[number], start: Finding['severity']) =>
    applyRegion([finding(ruleId, start)], region)[0]?.severity;

  it('keeps trackers before consent an error everywhere but Switzerland', () => {
    for (const region of ['de', 'at', 'hu', 'fr', 'it', 'es', 'nl', 'pl', 'uk', 'eu'] as const) {
      expect(severity('pre-consent-trackers', region, 'error')).toBe('error');
    }
  });

  it('softens opt-in findings and the imprint in Switzerland', () => {
    expect(severity('pre-consent-trackers', 'ch', 'error')).toBe('warning');
    expect(severity('pre-consent-trackers', 'ch', 'warning')).toBe('info');
    expect(severity('third-party-embeds', 'ch', 'warning')).toBe('info');
    expect(severity('impressum-link', 'ch', 'warning')).toBe('info');
    expect(severity('consent-banner-missing', 'ch', 'warning')).toBe('info');
  });

  it('treats fonts in Switzerland like the other third-party requests', () => {
    expect(severity('google-fonts', 'ch', 'error')).toBe('warning');
    expect(severity('adobe-fonts', 'ch', 'error')).toBe('warning');
    expect(severity('google-fonts', 'de', 'error')).toBe('error');
  });

  it('softens what UK law does not ask for, and nothing else', () => {
    expect(severity('withdrawal-button', 'uk', 'warning')).toBe('info');
    expect(severity('accessibility-statement', 'uk', 'info')).toBe('info');
    expect(severity('impressum-link', 'uk', 'warning')).toBe('info');
    expect(severity('legal-notice-content', 'uk', 'warning')).toBe('warning');
    expect(severity('trackers-after-reject', 'uk', 'error')).toBe('error');
    expect(severity('withdrawal-button', 'fr', 'warning')).toBe('warning');
  });

  it('softens the withdrawal button where it is not transposed and the notice link where no page name is fixed', () => {
    expect(severity('withdrawal-button', 'es', 'warning')).toBe('info');
    expect(severity('withdrawal-button', 'pl', 'warning')).toBe('info');
    expect(severity('withdrawal-button', 'it', 'warning')).toBe('warning');
    expect(severity('withdrawal-button', 'nl', 'warning')).toBe('warning');
    for (const region of ['it', 'nl', 'pl'] as const) {
      expect(severity('impressum-link', region, 'warning')).toBe('info');
      expect(severity('legal-notice-content', region, 'warning')).toBe('warning');
    }
    expect(severity('impressum-link', 'es', 'warning')).toBe('warning');
  });

  it('never goes below info and keeps an ignored refusal serious', () => {
    expect(severity('impressum-link', 'ch', 'info')).toBe('info');
    expect(severity('trackers-after-reject', 'ch', 'error')).toBe('error');
  });
});
