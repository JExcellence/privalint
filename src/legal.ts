import type { Finding, Severity } from './types.js';

export const REGIONS = ['de', 'at', 'ch', 'hu', 'eu'] as const;
export type Region = (typeof REGIONS)[number];

/** Trackers need prior consent; also the basis when there is no banner to give it. */
const TRACKER_CONSENT: Record<Region, string[]> = {
  de: ['§ 25 Abs. 1 TDDDG', 'Art. 6 Abs. 1 lit. a DSGVO', 'EuGH, 01.10.2019, C-673/17 (Planet49)'],
  at: [
    '§ 165 Abs. 3 TKG 2021',
    'Art. 6 Abs. 1 lit. a DSGVO',
    'EuGH, 01.10.2019, C-673/17 (Planet49)',
  ],
  ch: ['Art. 45c FMG', 'Art. 6 DSG'],
  hu: [
    'Eht. 155. § (4)',
    'GDPR 6. cikk (1) bekezdés a) pont',
    'EUB, 2019. október 1., C-673/17 (Planet49)',
  ],
  eu: [
    'Art. 5(3) ePrivacy Directive',
    'Art. 6(1)(a) GDPR',
    'CJEU, 01.10.2019, C-673/17 (Planet49)',
  ],
};

/**
 * Legal basis per rule and country, cited the way lawyers in that country
 * would cite it. `eu` is for sites outside Germany, Austria, Switzerland and
 * Hungary and refers to the EU instruments directly.
 */
const LEGAL: Record<string, Record<Region, string[]>> = {
  'pre-consent-trackers': TRACKER_CONSENT,
  // No banner means no way to consent: the same basis as the trackers that run without it.
  'consent-banner-missing': TRACKER_CONSENT,
  'trackers-after-reject': {
    de: ['§ 25 Abs. 1 TDDDG', 'Art. 6 Abs. 1 lit. a DSGVO'],
    at: ['§ 165 Abs. 3 TKG 2021', 'Art. 6 Abs. 1 lit. a DSGVO'],
    ch: ['Art. 45c FMG', 'Art. 30 Abs. 2 lit. b DSG'],
    hu: ['Eht. 155. § (4)', 'GDPR 6. cikk (1) bekezdés a) pont'],
    eu: ['Art. 5(3) ePrivacy Directive', 'Art. 6(1)(a) GDPR'],
  },
  // Switching everything off in the settings is a refusal like the reject button.
  'trackers-after-settings': {
    de: ['§ 25 Abs. 1 TDDDG', 'Art. 6 Abs. 1 lit. a DSGVO'],
    at: ['§ 165 Abs. 3 TKG 2021', 'Art. 6 Abs. 1 lit. a DSGVO'],
    ch: ['Art. 45c FMG', 'Art. 30 Abs. 2 lit. b DSG'],
    hu: ['Eht. 155. § (4)', 'GDPR 6. cikk (1) bekezdés a) pont'],
    eu: ['Art. 5(3) ePrivacy Directive', 'Art. 6(1)(a) GDPR'],
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
    hu: ['Eht. 155. § (4)', 'GDPR 4. cikk 11. pont'],
    eu: [
      'Art. 4(11) GDPR',
      'EDPB Cookie Banner Taskforce report, 17.01.2023',
      'EDPB Opinion 08/2024 (consent or pay)',
    ],
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
    de: ['Art. 6 Abs. 1 DSGVO', 'LG München I, 20.01.2022, Az. 3 O 17493/20 (entsprechend)'],
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
  // Both pages must be reachable before the visitor decides, and the Impressum at all times.
  'banner-legal-links': {
    de: ['Art. 12 Abs. 1 DSGVO', 'Art. 13 DSGVO', '§ 5 DDG'],
    at: ['Art. 12 Abs. 1 DSGVO', 'Art. 13 DSGVO', '§ 5 ECG'],
    ch: ['Art. 19 DSG'],
    hu: ['GDPR 12. cikk (1) bekezdés', 'GDPR 13. cikk', 'Ekertv. 4. §'],
    eu: ['Art. 12(1) GDPR', 'Art. 13 GDPR', 'Art. 5 Directive 2000/31/EC (e-commerce)'],
  },
  // Information at the time personal data is collected.
  'form-privacy-notice': {
    de: ['Art. 13 DSGVO'],
    at: ['Art. 13 DSGVO'],
    ch: ['Art. 19 DSG'],
    hu: ['GDPR 13. cikk'],
    eu: ['Art. 13 GDPR'],
  },
  // Security of processing: transport encryption is the baseline measure.
  'https-transport': {
    de: ['Art. 32 DSGVO', '§ 19 Abs. 4 TDDDG'],
    at: ['Art. 32 DSGVO'],
    ch: ['Art. 8 DSG'],
    hu: ['GDPR 32. cikk'],
    eu: ['Art. 32 GDPR'],
  },
  // The privacy policy names the recipients of personal data.
  'privacy-policy-vendors': {
    de: ['Art. 13 Abs. 1 lit. e DSGVO'],
    at: ['Art. 13 Abs. 1 lit. e DSGVO'],
    ch: ['Art. 19 Abs. 2 lit. c DSG'],
    hu: ['GDPR 13. cikk (1) bekezdés e) pont'],
    eu: ['Art. 13(1)(e) GDPR'],
  },
  // What the legal notice has to say: name, address, fast electronic contact, register entry.
  'legal-notice-content': {
    de: ['§ 5 Abs. 1 Nr. 1, 2 und 4 DDG'],
    at: ['§ 5 Abs. 1 ECG', '§ 14 UGB', '§ 25 MedienG'],
    ch: ['Art. 3 Abs. 1 lit. s UWG'],
    hu: ['Ekertv. 4. §'],
    eu: ['Art. 5(1) Directive 2000/31/EC (e-commerce)'],
  },
  // Transfers of personal data to third countries need an adequacy decision or safeguards.
  'third-country-providers': {
    de: ['Art. 44 DSGVO', 'Art. 45 DSGVO', 'Art. 46 DSGVO'],
    at: ['Art. 44 DSGVO', 'Art. 45 DSGVO', 'Art. 46 DSGVO'],
    ch: ['Art. 16 DSG', 'Art. 17 DSG'],
    hu: ['GDPR 44. cikk', 'GDPR 45. cikk', 'GDPR 46. cikk'],
    eu: [
      'Art. 44 GDPR',
      'Art. 45 GDPR',
      'Art. 46 GDPR',
      'Commission Implementing Decision (EU) 2023/1795 (EU-US Data Privacy Framework)',
    ],
  },
  // Refusing must be as easy as accepting; deceptive designs undermine a free choice.
  'reject-less-prominent': {
    de: ['§ 25 Abs. 1 TDDDG', 'Art. 4 Nr. 11 DSGVO', 'EDSA Cookie-Banner-Taskforce, 17.01.2023'],
    at: [
      '§ 165 Abs. 3 TKG 2021',
      'Art. 4 Nr. 11 DSGVO',
      'EDSA Cookie-Banner-Taskforce, 17.01.2023',
    ],
    ch: ['Art. 45c FMG', 'EDÖB, Leitfaden zu Cookies (2025)'],
    hu: ['Eht. 155. § (4)', 'GDPR 4. cikk 11. pont', 'EDPB Cookie Banner Taskforce, 2023.01.17.'],
    eu: [
      'Art. 4(11) GDPR',
      'EDPB Cookie Banner Taskforce report, 17.01.2023',
      'EDPB Guidelines 03/2022 on deceptive design patterns',
    ],
  },
  // Pre-ticked boxes are no consent (Planet49); the same in every EU country.
  'consent-preselected': {
    de: ['§ 25 Abs. 1 TDDDG', 'Art. 4 Nr. 11 DSGVO', 'EuGH, 01.10.2019, C-673/17 (Planet49)'],
    at: ['§ 165 Abs. 3 TKG 2021', 'Art. 4 Nr. 11 DSGVO', 'EuGH, 01.10.2019, C-673/17 (Planet49)'],
    ch: ['Art. 45c FMG'],
    hu: ['Eht. 155. § (4)', 'GDPR 4. cikk 11. pont', 'EUB, 2019. október 1., C-673/17 (Planet49)'],
    eu: [
      'Art. 5(3) ePrivacy Directive',
      'Art. 4(11) GDPR',
      'CJEU, 01.10.2019, C-673/17 (Planet49)',
    ],
  },
  // Storage limitation; the 13 months come from the CNIL recommendation of 17.09.2020.
  'tracking-cookie-lifetime': {
    de: ['Art. 5 Abs. 1 lit. e DSGVO', 'CNIL-Empfehlung zu Cookies, 17.09.2020'],
    at: ['Art. 5 Abs. 1 lit. e DSGVO', 'CNIL-Empfehlung zu Cookies, 17.09.2020'],
    ch: ['Art. 6 Abs. 4 DSG'],
    hu: ['GDPR 5. cikk (1) bekezdés e) pont', 'CNIL-ajánlás a sütikről, 2020.09.17.'],
    eu: ['Art. 5(1)(e) GDPR', 'CNIL recommendation on cookies, 17.09.2020'],
  },
  // Directive (EU) 2023/2673 added Art. 11a; Germany: § 356a BGB, applicable from 19.06.2026.
  'withdrawal-button': {
    de: ['§ 356a BGB'],
    at: ['Art. 11a Richtlinie 2011/83/EU'],
    ch: ['Art. 11a Richtlinie 2011/83/EU (bei Verkauf an Verbraucher in der EU)'],
    hu: ['2011/83/EU irányelv 11a. cikk'],
    eu: ['Art. 11a Directive 2011/83/EU'],
  },
  // European Accessibility Act; Germany and Austria since 28.06.2025.
  'accessibility-statement': {
    de: ['§ 14 BFSG', 'Anlage 3 BFSG'],
    at: ['§ 14 BaFG'],
    ch: ['Art. 13 Richtlinie (EU) 2019/882 (bei Angeboten in der EU)'],
    hu: ['(EU) 2019/882 irányelv 13. cikk'],
    eu: ['Art. 13 and Annex V Directive (EU) 2019/882'],
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
 * drop one level there. Fonts from Google or Adobe are a third-party request like an
 * embed, and the Munich Google Fonts ruling is German law, so they drop too. Ignoring
 * an explicit refusal stays as serious as anywhere.
 */
const SOFTER_IN_SWITZERLAND = new Set([
  'pre-consent-trackers',
  'consent-preselected',
  'consent-banner-missing',
  'consent-settings-link',
  'third-party-embeds',
  'google-fonts',
  'adobe-fonts',
  'impressum-link',
  'legal-notice-content',
  'banner-legal-links',
  'withdrawal-button',
  'accessibility-statement',
]);

function severityFor(finding: Finding, region: Region): Severity {
  if (region === 'ch' && SOFTER_IN_SWITZERLAND.has(finding.ruleId)) {
    return lower(finding.severity);
  }
  return finding.severity;
}

const lower = (severity: Severity): Severity => (severity === 'error' ? 'warning' : 'info');
