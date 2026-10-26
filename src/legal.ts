import type { Finding, Severity } from './types.js';

export const REGIONS = ['de', 'at', 'ch', 'eu'] as const;
export type Region = (typeof REGIONS)[number];

/**
 * Legal basis per rule and country, cited the way lawyers in that country
 * would cite it. `eu` is for sites outside Germany, Austria and Switzerland
 * and refers to the EU instruments directly.
 */
const LEGAL: Record<string, Record<Region, string[]>> = {
  'pre-consent-trackers': {
    de: ['§ 25 Abs. 1 TDDDG', 'Art. 6 Abs. 1 lit. a DSGVO', 'EuGH C-673/17 (Planet49)'],
    at: ['§ 165 Abs. 3 TKG 2021', 'Art. 6 Abs. 1 lit. a DSGVO', 'EuGH C-673/17 (Planet49)'],
    ch: ['Art. 45c FMG', 'Art. 6 DSG'],
    eu: ['Art. 5(3) ePrivacy Directive', 'Art. 6(1)(a) GDPR', 'CJEU C-673/17 (Planet49)'],
  },
  'trackers-after-reject': {
    de: ['§ 25 Abs. 1 TDDDG', 'Art. 7 Abs. 3 DSGVO'],
    at: ['§ 165 Abs. 3 TKG 2021', 'Art. 7 Abs. 3 DSGVO'],
    ch: ['Art. 45c FMG', 'Art. 30 Abs. 2 lit. b DSG'],
    eu: ['Art. 5(3) ePrivacy Directive', 'Art. 7(3) GDPR'],
  },
  'reject-option': {
    de: [
      '§ 25 Abs. 1 TDDDG',
      'Art. 4 Nr. 11 DSGVO',
      'EDSA Cookie-Banner-Taskforce, 17.01.2023',
      'DSK-Beschluss, 22.03.2023 (Pur-Abo-Modelle)',
    ],
    at: [
      '§ 165 Abs. 3 TKG 2021',
      'Art. 4 Nr. 11 DSGVO',
      'EDSA Cookie-Banner-Taskforce, 17.01.2023',
    ],
    ch: ['Art. 45c FMG', 'EDÖB, Leitfaden zu Cookies (2025)'],
    eu: ['Art. 4(11) GDPR', 'Art. 7(3) GDPR', 'EDPB Cookie Banner Taskforce report, 17.01.2023'],
  },
  'google-fonts': {
    de: ['Art. 6 Abs. 1 DSGVO', 'LG München I, 20.01.2022, Az. 3 O 17493/20'],
    at: ['Art. 6 Abs. 1 DSGVO'],
    ch: ['Art. 6 DSG'],
    eu: ['Art. 6(1) GDPR'],
  },
  'third-party-embeds': {
    de: ['Art. 6 Abs. 1 DSGVO', '§ 25 Abs. 1 TDDDG'],
    at: ['Art. 6 Abs. 1 DSGVO', '§ 165 Abs. 3 TKG 2021'],
    ch: ['Art. 6 DSG', 'Art. 45c FMG'],
    eu: ['Art. 6(1) GDPR', 'Art. 5(3) ePrivacy Directive'],
  },
  'third-party-cdns': {
    de: ['Art. 6 Abs. 1 DSGVO'],
    at: ['Art. 6 Abs. 1 DSGVO'],
    ch: ['Art. 6 DSG'],
    eu: ['Art. 6(1) GDPR'],
  },
  'impressum-link': {
    de: ['§ 5 DDG', 'BGH, 20.07.2006, Az. I ZR 228/03'],
    at: ['§ 5 ECG', '§ 25 MedienG'],
    ch: ['Art. 3 Abs. 1 lit. s UWG'],
    eu: ['Art. 5 Directive 2000/31/EC (e-commerce)'],
  },
  'privacy-policy-link': {
    de: ['Art. 12 DSGVO', 'Art. 13 DSGVO'],
    at: ['Art. 12 DSGVO', 'Art. 13 DSGVO'],
    ch: ['Art. 19 DSG'],
    eu: ['Art. 12 GDPR', 'Art. 13 GDPR'],
  },
};

export const legalReferences = (ruleId: string, region: Region): string[] | undefined =>
  LEGAL[ruleId]?.[region];

/**
 * Attaches the legal basis of the chosen country to each finding and adjusts
 * its severity where that country's law is softer or stricter. Findings of
 * custom rules without an entry above are left as they are.
 */
export function applyRegion(findings: readonly Finding[], region: Region): Finding[] {
  return findings.map((finding) => {
    const references = legalReferences(finding.ruleId, region);
    return {
      ...finding,
      severity: severityFor(finding, region),
      ...(references === undefined ? {} : { references }),
    };
  });
}

function severityFor(finding: Finding, _region: Region): Severity {
  return finding.severity;
}
