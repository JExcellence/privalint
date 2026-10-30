import type { Finding, Severity } from './types.js';

export const REGIONS = ['de', 'at', 'ch', 'hu', 'eu'] as const;
export type Region = (typeof REGIONS)[number];

/**
 * Legal basis per rule and country, cited the way lawyers in that country
 * would cite it. `eu` is for sites outside Germany, Austria, Switzerland and
 * Hungary and refers to the EU instruments directly.
 */
const LEGAL: Record<string, Record<Region, string[]>> = {
  'pre-consent-trackers': {
    de: ['§ 25 Abs. 1 TDDDG', 'Art. 6 Abs. 1 lit. a DSGVO', 'EuGH C-673/17 (Planet49)'],
    at: ['§ 165 Abs. 3 TKG 2021', 'Art. 6 Abs. 1 lit. a DSGVO', 'EuGH C-673/17 (Planet49)'],
    ch: ['Art. 45c FMG', 'Art. 6 DSG'],
    hu: ['Eht. 155. § (4)', 'GDPR 6. cikk (1) bekezdés a) pont', 'EUB C-673/17 (Planet49)'],
    eu: ['Art. 5(3) ePrivacy Directive', 'Art. 6(1)(a) GDPR', 'CJEU C-673/17 (Planet49)'],
  },
  'trackers-after-reject': {
    de: ['§ 25 Abs. 1 TDDDG', 'Art. 7 Abs. 3 DSGVO'],
    at: ['§ 165 Abs. 3 TKG 2021', 'Art. 7 Abs. 3 DSGVO'],
    ch: ['Art. 45c FMG', 'Art. 30 Abs. 2 lit. b DSG'],
    hu: ['Eht. 155. § (4)', 'GDPR 7. cikk (3) bekezdés'],
    eu: ['Art. 5(3) ePrivacy Directive', 'Art. 7(3) GDPR'],
  },
  // Switching everything off in the settings is a refusal like the reject button.
  'trackers-after-settings': {
    de: ['§ 25 Abs. 1 TDDDG', 'Art. 7 Abs. 3 DSGVO'],
    at: ['§ 165 Abs. 3 TKG 2021', 'Art. 7 Abs. 3 DSGVO'],
    ch: ['Art. 45c FMG', 'Art. 30 Abs. 2 lit. b DSG'],
    hu: ['Eht. 155. § (4)', 'GDPR 7. cikk (3) bekezdés'],
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
    hu: ['Eht. 155. § (4)', 'GDPR 4. cikk 11. pont', 'GDPR 7. cikk (3) bekezdés'],
    eu: ['Art. 4(11) GDPR', 'Art. 7(3) GDPR', 'EDPB Cookie Banner Taskforce report, 17.01.2023'],
  },
  'consent-settings-link': {
    de: ['Art. 7 Abs. 3 DSGVO', '§ 25 Abs. 1 TDDDG'],
    at: ['Art. 7 Abs. 3 DSGVO', '§ 165 Abs. 3 TKG 2021'],
    ch: ['Art. 45c FMG'],
    hu: ['GDPR 7. cikk (3) bekezdés', 'Eht. 155. § (4)'],
    eu: ['Art. 7(3) GDPR', 'Art. 5(3) ePrivacy Directive'],
  },
  'google-fonts': {
    de: ['Art. 6 Abs. 1 DSGVO', 'LG München I, 20.01.2022, Az. 3 O 17493/20'],
    at: ['Art. 6 Abs. 1 DSGVO'],
    ch: ['Art. 6 DSG'],
    hu: ['GDPR 6. cikk (1) bekezdés'],
    eu: ['Art. 6(1) GDPR'],
  },
  'adobe-fonts': {
    de: ['Art. 6 Abs. 1 DSGVO', 'LG München I, 20.01.2022, Az. 3 O 17493/20 (entsprechend)'],
    at: ['Art. 6 Abs. 1 DSGVO'],
    ch: ['Art. 6 DSG'],
    hu: ['GDPR 6. cikk (1) bekezdés'],
    eu: ['Art. 6(1) GDPR'],
  },
  'third-party-embeds': {
    de: ['Art. 6 Abs. 1 DSGVO', '§ 25 Abs. 1 TDDDG'],
    at: ['Art. 6 Abs. 1 DSGVO', '§ 165 Abs. 3 TKG 2021'],
    ch: ['Art. 6 DSG', 'Art. 45c FMG'],
    hu: ['GDPR 6. cikk (1) bekezdés', 'Eht. 155. § (4)'],
    eu: ['Art. 6(1) GDPR', 'Art. 5(3) ePrivacy Directive'],
  },
  'third-party-cdns': {
    de: ['Art. 6 Abs. 1 DSGVO'],
    at: ['Art. 6 Abs. 1 DSGVO'],
    ch: ['Art. 6 DSG'],
    hu: ['GDPR 6. cikk (1) bekezdés'],
    eu: ['Art. 6(1) GDPR'],
  },
  'impressum-link': {
    de: ['§ 5 DDG', 'BGH, 20.07.2006, Az. I ZR 228/03'],
    at: ['§ 5 ECG', '§ 25 MedienG'],
    ch: ['Art. 3 Abs. 1 lit. s UWG'],
    hu: ['Ekertv. 4. §'],
    eu: ['Art. 5 Directive 2000/31/EC (e-commerce)'],
  },
  'privacy-policy-link': {
    de: ['Art. 12 DSGVO', 'Art. 13 DSGVO'],
    at: ['Art. 12 DSGVO', 'Art. 13 DSGVO'],
    ch: ['Art. 19 DSG'],
    hu: ['GDPR 12. cikk', 'GDPR 13. cikk'],
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

/**
 * Switzerland uses an opt-out model for cookies and tracking (Art. 45c FMG) and
 * requires an imprint only for offers in electronic commerce, so those findings
 * drop one level there. Ignoring an explicit refusal stays as serious as anywhere.
 */
const SOFTER_IN_SWITZERLAND = new Set([
  'pre-consent-trackers',
  'consent-settings-link',
  'third-party-embeds',
  'impressum-link',
]);

function severityFor(finding: Finding, region: Region): Severity {
  if (region === 'ch' && SOFTER_IN_SWITZERLAND.has(finding.ruleId)) {
    return lower(finding.severity);
  }
  return finding.severity;
}

const lower = (severity: Severity): Severity => (severity === 'error' ? 'warning' : 'info');
