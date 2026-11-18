import type { Finding, Severity } from './types.js';

export const REGIONS = ['de', 'at', 'ch', 'hu', 'fr', 'it', 'es', 'nl', 'pl', 'uk', 'eu'] as const;
export type Region = (typeof REGIONS)[number];
/** The regions cited in the table below; the others have a table of their own further down. */
type BaseRegion = Exclude<Region, 'fr' | 'it' | 'es' | 'nl' | 'pl' | 'uk'>;

/** Trackers need prior consent; also the basis when there is no banner to give it. */
const TRACKER_CONSENT: Record<BaseRegion, string[]> = {
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
 * would cite it. `eu` is for sites outside the countries with a profile and
 * refers to the EU instruments directly.
 */
const BASE = {
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
  // Closing a banner is no choice; consent needs a clear affirmative act.
  'trackers-after-close': {
    de: ['§ 25 Abs. 1 TDDDG', 'Art. 4 Nr. 11 DSGVO'],
    at: ['§ 165 Abs. 3 TKG 2021', 'Art. 4 Nr. 11 DSGVO'],
    ch: ['Art. 45c FMG'],
    hu: ['Eht. 155. § (4)', 'GDPR 4. cikk 11. pont'],
    eu: ['Art. 5(3) ePrivacy Directive', 'Art. 4(11) GDPR'],
  },
  // Informed consent: the visitor has to understand what they agree to.
  'banner-language': {
    de: ['Art. 4 Nr. 11, Art. 7 Abs. 2 DSGVO'],
    at: ['Art. 4 Nr. 11, Art. 7 Abs. 2 DSGVO'],
    ch: ['Art. 6 Abs. 6 DSG'],
    hu: ['GDPR 4. cikk 11. pont, 7. cikk (2) bekezdés'],
    eu: ['Art. 4(11) and 7(2) GDPR'],
  },
  // Refusing must be as easy as accepting, also without a mouse; accessibility law asks for
  // keyboard operation (EN 301 549 9.2.1.1, WCAG 2.1 SC 2.1.1).
  'banner-keyboard': {
    de: ['Art. 4 Nr. 11, Art. 7 Abs. 3 DSGVO', 'BFSG, EN 301 549 9.2.1.1'],
    at: ['Art. 4 Nr. 11, Art. 7 Abs. 3 DSGVO', 'BaFG, EN 301 549 9.2.1.1'],
    ch: ['Art. 6 Abs. 6 DSG', 'WCAG 2.1 SC 2.1.1'],
    hu: ['GDPR 4. cikk 11. pont, 7. cikk (3) bekezdés', '(EU) 2019/882 irányelv I. melléklet'],
    eu: ['Art. 4(11) and 7(3) GDPR', 'Annex I Directive (EU) 2019/882, EN 301 549 9.2.1.1'],
  },
  // A browser signal can express a refusal; in the EU, no law makes a site follow GPC yet.
  'gpc-signal': {
    de: ['Art. 21 Abs. 5 DSGVO'],
    at: ['Art. 21 Abs. 5 DSGVO'],
    ch: ['Art. 30 Abs. 2 lit. b DSG'],
    hu: ['GDPR 21. cikk (5) bekezdés'],
    eu: ['Art. 21(5) GDPR', 'Cal. Civ. Code § 1798.135 (CCPA)'],
  },
  // Consent is an active choice: no pre-ticked boxes, and advertising e-mails need it.
  'form-preticked-consent': {
    de: ['Art. 4 Nr. 11, Art. 7 DSGVO', 'EuGH C-673/17 (Planet49)', '§ 7 Abs. 2 UWG'],
    at: ['Art. 4 Nr. 11, Art. 7 DSGVO', 'EuGH C-673/17 (Planet49)', '§ 174 TKG 2021'],
    ch: ['Art. 3 Abs. 1 lit. o UWG'],
    hu: ['GDPR 4. cikk 11. pont, 7. cikk', 'Grt. 6. §'],
    eu: ['Art. 4(11) and 7 GDPR', 'CJEU C-673/17 (Planet49)', 'Art. 13 Directive 2002/58/EC'],
  },
  // Security of processing: personal data travels encrypted.
  'mixed-content': {
    de: ['Art. 32 DSGVO'],
    at: ['Art. 32 DSGVO'],
    ch: ['Art. 8 DSG'],
    hu: ['GDPR 32. cikk'],
    eu: ['Art. 32 GDPR'],
  },
  // Reading device information needs consent like storing a cookie (EDPB Guidelines 2/2023).
  fingerprinting: {
    de: ['§ 25 Abs. 1 TDDDG'],
    at: ['§ 165 Abs. 3 TKG 2021'],
    ch: ['Art. 45c FMG'],
    hu: ['Eht. 155. § (4)'],
    eu: ['Art. 5(3) ePrivacy Directive', 'EDPB Guidelines 2/2023'],
  },
  // Personal data beyond the IP address sent to other sites.
  'third-party-personal-data': {
    de: ['Art. 5 Abs. 1 lit. c, Art. 6 Abs. 1 DSGVO'],
    at: ['Art. 5 Abs. 1 lit. c, Art. 6 Abs. 1 DSGVO'],
    ch: ['Art. 6 Abs. 2 und 3 DSG'],
    hu: ['GDPR 5. cikk (1) c), 6. cikk (1)'],
    eu: ['Art. 5(1)(c) and 6(1) GDPR'],
  },
  // Data protection by default: no more data to third parties than needed.
  'referrer-policy': {
    de: ['Art. 25 Abs. 2 DSGVO'],
    at: ['Art. 25 Abs. 2 DSGVO'],
    ch: ['Art. 7 Abs. 3 DSG'],
    hu: ['GDPR 25. cikk (2) bekezdés'],
    eu: ['Art. 25(2) GDPR'],
  },
  // Who is responsible for the data and how to reach them and the data protection officer.
  'privacy-policy-content': {
    de: ['Art. 13 Abs. 1 lit. a und b DSGVO'],
    at: ['Art. 13 Abs. 1 lit. a und b DSGVO'],
    ch: ['Art. 19 Abs. 2 lit. a DSG'],
    hu: ['GDPR 13. cikk (1) bekezdés a) és b) pont'],
    eu: ['Art. 13(1)(a) and (b) GDPR'],
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
} satisfies Record<string, Record<BaseRegion, string[]>>;

/** Rules with legal references; every country table has to cover each of them. */
type RuleId = keyof typeof BASE;

const FR_TRACKERS = ['Art. 82 loi n° 78-17 du 6 janvier 1978', 'Art. 6.1.a RGPD'];
const PLANET49_FR = 'CJUE, 1er oct. 2019, Planet49, C-673/17';
const CNIL_GUIDELINES = 'CNIL, délibération n° 2020-091 du 17 septembre 2020';
const CNIL_RECOMMENDATION = 'CNIL, recommandation n° 2020-092 du 17 septembre 2020';
const LCEN = 'Art. 1-1, I loi n° 2004-575 du 21 juin 2004 (LCEN)';

/**
 * France, as French lawyers cite it: loi Informatique et Libertés, LCEN, Code de la consommation
 * and the CNIL's cookie guidelines and recommendation. Researched 2026-11-17 against Légifrance
 * and cnil.fr; sources in docs/regions.md.
 */
const FRANCE: Record<RuleId, string[]> = {
  'pre-consent-trackers': [...FR_TRACKERS, PLANET49_FR],
  'consent-banner-missing': [...FR_TRACKERS, PLANET49_FR],
  'trackers-after-reject': FR_TRACKERS,
  'trackers-after-settings': FR_TRACKERS,
  'reject-option': [
    'Art. 82 loi n° 78-17 du 6 janvier 1978',
    'Art. 4.11 RGPD',
    `${CNIL_GUIDELINES}, § 30`,
    `${CNIL_RECOMMENDATION}, § 2.3`,
  ],
  'consent-settings-link': [
    'Art. 7.3 RGPD',
    'Art. 82 loi n° 78-17 du 6 janvier 1978',
    `${CNIL_GUIDELINES}, § 31`,
  ],
  'google-fonts': ['Art. 6.1 RGPD'],
  'adobe-fonts': ['Art. 6.1 RGPD'],
  'third-party-embeds': ['Art. 6.1 RGPD', 'Art. 82 loi n° 78-17 du 6 janvier 1978'],
  'third-party-cdns': ['Art. 6.1 RGPD'],
  'impressum-link': [LCEN, 'Art. 19 LCEN'],
  'privacy-policy-link': ['Art. 12 RGPD', 'Art. 13 RGPD'],
  'banner-legal-links': ['Art. 12.1 RGPD', 'Art. 13 RGPD', LCEN],
  'form-privacy-notice': ['Art. 13 RGPD'],
  'https-transport': ['Art. 32 RGPD'],
  'privacy-policy-vendors': ['Art. 13.1.e RGPD'],
  'trackers-after-close': [
    'Art. 82 loi n° 78-17 du 6 janvier 1978',
    'Art. 4.11 RGPD',
    `${CNIL_GUIDELINES}, § 27`,
  ],
  'banner-language': ['Art. 4.11 et 7.2 RGPD', `${CNIL_GUIDELINES}, § 22`],
  'banner-keyboard': ['Art. 4.11 et 7.3 RGPD', 'Art. L. 412-13 C. consom., EN 301 549 9.2.1.1'],
  'gpc-signal': ['Art. 21.5 RGPD'],
  'form-preticked-consent': ['Art. 4.11 et 7 RGPD', PLANET49_FR, 'Art. L. 34-5 CPCE'],
  'mixed-content': ['Art. 32 RGPD'],
  fingerprinting: ['Art. 82 loi n° 78-17 du 6 janvier 1978', `${CNIL_GUIDELINES}, § 13`],
  'third-party-personal-data': ['Art. 5.1.c et 6.1 RGPD'],
  'referrer-policy': ['Art. 25.2 RGPD'],
  'privacy-policy-content': ['Art. 13.1.a et b RGPD'],
  'legal-notice-content': [LCEN, 'Art. 19 LCEN'],
  'third-country-providers': [
    'Art. 44, 45 et 46 RGPD',
    'Décision d’exécution (UE) 2023/1795 (EU-US Data Privacy Framework)',
  ],
  'reject-less-prominent': [
    'Art. 82 loi n° 78-17 du 6 janvier 1978',
    'Art. 4.11 RGPD',
    `${CNIL_RECOMMENDATION}, § 2.3`,
    'CNIL, délibération SAN-2021-023 du 31 décembre 2021',
  ],
  'consent-preselected': [
    'Art. 82 loi n° 78-17 du 6 janvier 1978',
    'Art. 4.11 RGPD',
    PLANET49_FR,
    `${CNIL_GUIDELINES}, § 27`,
  ],
  // The CNIL's 13 months are for consent-exempt audience measurement; a benchmark for the rest.
  'tracking-cookie-lifetime': ['Art. 5.1.e RGPD', `${CNIL_RECOMMENDATION}, § 5`],
  // Ordonnance n° 2026-2 and décret n° 2026-3, applicable since 19.06.2026.
  'withdrawal-button': ['Art. L. 221-21 C. consom.', 'Art. D. 221-5 C. consom.'],
  // The EAA information may sit in the terms; a statement is required of public bodies (loi 2005-102).
  'accessibility-statement': ['Art. L. 412-13 C. consom.', 'Art. D. 412-57 C. consom.'],
};

const IT_TRACKERS = [
  'Art. 122, comma 1, D.lgs. 196/2003 (Codice privacy)',
  'Art. 6, par. 1, lett. a), GDPR',
];
const PLANET49_IT = 'CGUE, 1° ottobre 2019, C-673/17, Planet49';
const GARANTE =
  'Garante privacy, Linee guida cookie e altri strumenti di tracciamento, 10 giugno 2021';

/**
 * Italy: Codice privacy, D.lgs. 70/2003, Codice del consumo and the Garante's cookie guidelines of
 * 10.06.2021. Researched 2026-11-17 against normattiva.it and garanteprivacy.it; sources in
 * docs/regions.md.
 */
const ITALY: Record<RuleId, string[]> = {
  'pre-consent-trackers': [...IT_TRACKERS, PLANET49_IT],
  'consent-banner-missing': [...IT_TRACKERS, PLANET49_IT, `${GARANTE}, § 7.1`],
  'trackers-after-reject': [...IT_TRACKERS, `${GARANTE}, §§ 5 e 7.1`],
  'trackers-after-settings': IT_TRACKERS,
  'reject-option': [
    'Art. 122, comma 1, Codice privacy',
    'Art. 4, n. 11), GDPR',
    `${GARANTE}, § 7.1`,
  ],
  'consent-settings-link': ['Art. 7, par. 3, GDPR', 'Art. 122 Codice privacy', `${GARANTE}, § 7.1`],
  'google-fonts': ['Art. 6, par. 1, GDPR'],
  'adobe-fonts': ['Art. 6, par. 1, GDPR'],
  'third-party-embeds': ['Art. 6, par. 1, GDPR', 'Art. 122, comma 1, Codice privacy'],
  'third-party-cdns': ['Art. 6, par. 1, GDPR'],
  'impressum-link': ['Art. 7, comma 1, D.lgs. 70/2003', 'Art. 2250, comma 7, c.c.'],
  'privacy-policy-link': ['Artt. 12 e 13 GDPR'],
  'banner-legal-links': [
    'Art. 12, par. 1, e art. 13 GDPR',
    'Art. 7 D.lgs. 70/2003',
    `${GARANTE}, § 7.1`,
  ],
  'form-privacy-notice': ['Art. 13 GDPR'],
  'https-transport': ['Art. 32 GDPR'],
  'privacy-policy-vendors': ['Art. 13, par. 1, lett. e), GDPR'],
  // § 7.1: closing the banner with the "X" keeps the defaults, i.e. it refuses.
  'trackers-after-close': [
    'Art. 122, comma 1, Codice privacy',
    'Art. 4, n. 11), GDPR',
    `${GARANTE}, § 7.1`,
  ],
  'banner-language': ['Artt. 4, n. 11), e 7, par. 2, GDPR'],
  'banner-keyboard': [
    'Artt. 4, n. 11), e 7, par. 3, GDPR',
    'D.lgs. 82/2022, allegato I, EN 301 549 9.2.1.1',
  ],
  'gpc-signal': ['Art. 21, par. 5, GDPR'],
  'form-preticked-consent': ['Artt. 4, n. 11), e 7 GDPR', PLANET49_IT, 'Art. 130 Codice privacy'],
  'mixed-content': ['Art. 32 GDPR'],
  fingerprinting: ['Art. 122, comma 1, Codice privacy', `${GARANTE}, § 3`],
  'third-party-personal-data': ['Art. 5, par. 1, lett. c), e art. 6, par. 1, GDPR'],
  'referrer-policy': ['Art. 25, par. 2, GDPR'],
  'privacy-policy-content': ['Art. 13, par. 1, lett. a) e b), GDPR'],
  'legal-notice-content': [
    'Art. 7, comma 1, D.lgs. 70/2003',
    'Art. 2250, commi 1, 2 e 7, c.c.',
    'Art. 35, comma 1, DPR 633/1972',
  ],
  'third-country-providers': [
    'Artt. 44, 45 e 46 GDPR',
    'Decisione di esecuzione (UE) 2023/1795 (EU-US Data Privacy Framework)',
  ],
  'reject-less-prominent': ['Art. 122 Codice privacy', 'Art. 4, n. 11), GDPR', `${GARANTE}, § 7.1`],
  'consent-preselected': ['Art. 122 Codice privacy', 'Art. 4, n. 11), GDPR', PLANET49_IT],
  'tracking-cookie-lifetime': ['Art. 5, par. 1, lett. e), GDPR'],
  // D.lgs. 209/2025, for contracts from 19.06.2026.
  'withdrawal-button': ['Art. 54-bis D.lgs. 206/2005 (Codice del consumo)'],
  'accessibility-statement': ['Art. 12, comma 2, e allegato IV, D.lgs. 82/2022'],
};

const ES_TRACKERS = ['Art. 22.2 LSSI', 'Art. 6.1.a) RGPD'];
const PLANET49_ES = 'STJUE de 1 de octubre de 2019, C-673/17 (Planet49)';
const AEPD = 'AEPD, Guía sobre el uso de las cookies (mayo 2024)';

/**
 * Spain: LSSI, LOPDGDD, Ley 11/2023 and the AEPD cookie guide of May 2024. Researched 2026-11-17
 * against boe.es and aepd.es; sources in docs/regions.md.
 */
const SPAIN: Record<RuleId, string[]> = {
  'pre-consent-trackers': [...ES_TRACKERS, PLANET49_ES],
  'consent-banner-missing': [...ES_TRACKERS, PLANET49_ES, `${AEPD}, § 3.1.2.2`],
  'trackers-after-reject': ES_TRACKERS,
  'trackers-after-settings': ES_TRACKERS,
  'reject-option': ['Art. 22.2 LSSI', 'Art. 4.11 RGPD', `${AEPD}, §§ 3.1.2.2 y 3.2.3`],
  'consent-settings-link': ['Art. 7.3 RGPD', 'Art. 22.2 LSSI', `${AEPD}, § 3.2.9`],
  'google-fonts': ['Art. 6.1 RGPD'],
  'adobe-fonts': ['Art. 6.1 RGPD'],
  'third-party-embeds': ['Art. 6.1 RGPD', 'Art. 22.2 LSSI'],
  'third-party-cdns': ['Art. 6.1 RGPD'],
  'impressum-link': ['Art. 10.1 LSSI'],
  'privacy-policy-link': ['Arts. 12 y 13 RGPD', 'Art. 11 LOPDGDD'],
  'banner-legal-links': ['Arts. 12.1 y 13 RGPD', 'Art. 10.1 LSSI', `${AEPD}, § 3.1.2.2`],
  'form-privacy-notice': ['Art. 13 RGPD', 'Art. 11 LOPDGDD'],
  'https-transport': ['Art. 32 RGPD'],
  'privacy-policy-vendors': ['Art. 13.1.e) RGPD'],
  'trackers-after-close': ['Art. 22.2 LSSI', 'Art. 4.11 RGPD', `${AEPD}, § 3.2.1`],
  'banner-language': ['Arts. 4.11 y 7.2 RGPD', `${AEPD}, § 3.1.2.1`],
  'banner-keyboard': ['Arts. 4.11 y 7.3 RGPD', 'Ley 11/2023, anexo I, EN 301 549 9.2.1.1'],
  'gpc-signal': ['Art. 21.5 RGPD'],
  'form-preticked-consent': ['Arts. 4.11 y 7 RGPD', PLANET49_ES, 'Art. 21 LSSI'],
  'mixed-content': ['Art. 32 RGPD'],
  fingerprinting: ['Art. 22.2 LSSI', `${AEPD}, § 1`],
  'third-party-personal-data': ['Arts. 5.1.c) y 6.1 RGPD'],
  'referrer-policy': ['Art. 25.2 RGPD'],
  'privacy-policy-content': ['Art. 13.1.a) y b) RGPD', 'Art. 11.2 LOPDGDD'],
  'legal-notice-content': ['Art. 10.1.a), b) y e) LSSI'],
  'third-country-providers': [
    'Arts. 44, 45 y 46 RGPD',
    'Decisión de Ejecución (UE) 2023/1795 (Marco de Privacidad de Datos UE-EE. UU.)',
  ],
  'reject-less-prominent': ['Art. 22.2 LSSI', 'Art. 4.11 RGPD', `${AEPD}, § 3.1.2.2`],
  'consent-preselected': ['Art. 22.2 LSSI', 'Art. 4.11 RGPD', PLANET49_ES, `${AEPD}, § 3.1.2.2`],
  'tracking-cookie-lifetime': ['Art. 5.1.e) RGPD', `${AEPD}, § 2.1.3`],
  // Not transposed into the TRLGDCU as of 2026-11-17.
  'withdrawal-button': ['Art. 11 bis Directiva 2011/83/UE'],
  'accessibility-statement': ['Art. 13.2 Ley 11/2023'],
};

const NL_TRACKERS = ['Art. 11.7a lid 1 Tw', 'Art. 6 lid 1 sub a AVG'];
const PLANET49_NL = 'HvJ EU 1 oktober 2019, C-673/17 (Planet49)';
const AP_BANNERS = 'AP, Vuistregels heldere cookiebanners';

/**
 * The Netherlands: Telecommunicatiewet, AVG, Burgerlijk Wetboek and the Autoriteit
 * Persoonsgegevens' cookie banner rules. Researched 2026-11-17 against wetten.overheid.nl and
 * autoriteitpersoonsgegevens.nl; sources in docs/regions.md.
 */
const NETHERLANDS: Record<RuleId, string[]> = {
  'pre-consent-trackers': [...NL_TRACKERS, PLANET49_NL],
  'consent-banner-missing': [...NL_TRACKERS, PLANET49_NL],
  'trackers-after-reject': NL_TRACKERS,
  'trackers-after-settings': NL_TRACKERS,
  'reject-option': ['Art. 11.7a lid 1 Tw', 'Art. 4 punt 11 AVG', `${AP_BANNERS}, vuistregel 2`],
  'consent-settings-link': [
    'Art. 7 lid 3 AVG',
    'Art. 11.7a lid 1 Tw',
    `${AP_BANNERS}, vuistregel 3`,
  ],
  'google-fonts': ['Art. 6 lid 1 AVG'],
  'adobe-fonts': ['Art. 6 lid 1 AVG'],
  'third-party-embeds': ['Art. 6 lid 1 AVG', 'Art. 11.7a lid 1 Tw'],
  'third-party-cdns': ['Art. 6 lid 1 AVG'],
  'impressum-link': ['Art. 3:15d lid 1 BW'],
  'privacy-policy-link': ['Art. 12 AVG', 'Art. 13 AVG'],
  'banner-legal-links': ['Art. 12 lid 1 AVG', 'Art. 13 AVG', 'Art. 3:15d lid 1 BW'],
  'form-privacy-notice': ['Art. 13 AVG'],
  'https-transport': ['Art. 32 AVG'],
  'privacy-policy-vendors': ['Art. 13 lid 1 sub e AVG'],
  'trackers-after-close': [
    'Art. 11.7a lid 1 Tw',
    'Art. 4 punt 11 AVG',
    `${AP_BANNERS}, vuistregel 2`,
  ],
  'banner-language': ['Art. 4 punt 11 en 7 lid 2 AVG'],
  'banner-keyboard': ['Art. 4 punt 11 en 7 lid 3 AVG', 'Art. 6:230fb lid 1 BW, EN 301 549 9.2.1.1'],
  'gpc-signal': ['Art. 21 lid 5 AVG'],
  'form-preticked-consent': ['Art. 4 punt 11 en 7 AVG', PLANET49_NL, 'Art. 11.7 lid 1 Tw'],
  'mixed-content': ['Art. 32 AVG'],
  fingerprinting: ['Art. 11.7a lid 1 Tw', 'EDPB Guidelines 2/2023'],
  'third-party-personal-data': ['Art. 5 lid 1 sub c en 6 lid 1 AVG'],
  'referrer-policy': ['Art. 25 lid 2 AVG'],
  'privacy-policy-content': ['Art. 13 lid 1 sub a en b AVG'],
  'legal-notice-content': ['Art. 3:15d lid 1 sub a, b, c en f BW'],
  'third-country-providers': [
    'Art. 44, 45 en 46 AVG',
    'Uitvoeringsbesluit (EU) 2023/1795 (EU-VS-gegevensprivacykader)',
  ],
  'reject-less-prominent': [
    'Art. 11.7a lid 1 Tw',
    'Art. 4 punt 11 AVG',
    `${AP_BANNERS}, vuistregel 2`,
    'AP, boetebesluit AS Watson (Kruidvat.nl), 16 juli 2024',
  ],
  'consent-preselected': [
    'Art. 11.7a lid 1 Tw',
    'Art. 4 punt 11 AVG',
    PLANET49_NL,
    'AP, boetebesluit AS Watson (Kruidvat.nl), 16 juli 2024',
  ],
  'tracking-cookie-lifetime': ['Art. 5 lid 1 sub e AVG'],
  // In force since 25.06.2026 (Stb. 2026, 153).
  'withdrawal-button': ['Art. 6:230oa BW'],
  'accessibility-statement': ['Art. 6:230fb lid 2 sub a BW', 'bijlage V Richtlijn (EU) 2019/882'],
};

const PL_TRACKERS = ['art. 399 ust. 1 PKE', 'art. 6 ust. 1 lit. a RODO'];
const PLANET49_PL = 'wyrok TSUE z 1 października 2019 r., C-673/17 (Planet49)';
const PL_ACCESSIBILITY =
  'ustawa z dnia 26 kwietnia 2024 r. o zapewnianiu spełniania wymagań dostępności';

/**
 * Poland: Prawo komunikacji elektronicznej (PKE, in force since 10.11.2024, art. 399 replacing
 * art. 173 of the telecommunications act), RODO, UŚUDE and KSH. Researched 2026-11-17 against the
 * Sejm's ELI database; sources in docs/regions.md.
 */
const POLAND: Record<RuleId, string[]> = {
  'pre-consent-trackers': [...PL_TRACKERS, PLANET49_PL],
  'consent-banner-missing': [...PL_TRACKERS, PLANET49_PL],
  'trackers-after-reject': ['art. 399 ust. 1 pkt 2 PKE', 'art. 6 ust. 1 lit. a RODO'],
  'trackers-after-settings': ['art. 399 ust. 1 pkt 2 PKE', 'art. 6 ust. 1 lit. a RODO'],
  'reject-option': ['art. 399 ust. 1 pkt 2 i art. 400 PKE', 'art. 4 pkt 11 RODO'],
  'consent-settings-link': ['art. 7 ust. 3 RODO', 'art. 400 PKE'],
  'google-fonts': ['art. 6 ust. 1 RODO'],
  'adobe-fonts': ['art. 6 ust. 1 RODO'],
  'third-party-embeds': ['art. 6 ust. 1 RODO', 'art. 399 ust. 1 PKE'],
  'third-party-cdns': ['art. 6 ust. 1 RODO'],
  'impressum-link': ['art. 5 ust. 1 i 2 UŚUDE'],
  'privacy-policy-link': ['art. 12 RODO', 'art. 13 RODO'],
  'banner-legal-links': ['art. 12 ust. 1 RODO', 'art. 13 RODO', 'art. 5 ust. 1 UŚUDE'],
  'form-privacy-notice': ['art. 13 RODO'],
  'https-transport': ['art. 32 RODO', 'art. 7 ust. 1 pkt 1 lit. a UŚUDE'],
  'privacy-policy-vendors': ['art. 13 ust. 1 lit. e RODO'],
  'trackers-after-close': ['art. 399 ust. 1 pkt 2 PKE', 'art. 4 pkt 11 RODO'],
  'banner-language': ['art. 4 pkt 11 i art. 7 ust. 2 RODO'],
  'banner-keyboard': [
    'art. 4 pkt 11 i art. 7 ust. 3 RODO',
    `art. 18 ${PL_ACCESSIBILITY}, EN 301 549 9.2.1.1`,
  ],
  'gpc-signal': ['art. 21 ust. 5 RODO'],
  'form-preticked-consent': ['art. 4 pkt 11 i art. 7 RODO', PLANET49_PL, 'art. 398 ust. 1 PKE'],
  'mixed-content': ['art. 32 RODO'],
  fingerprinting: ['art. 399 ust. 1 PKE', 'EROD, Wytyczne 2/2023'],
  'third-party-personal-data': ['art. 5 ust. 1 lit. c i art. 6 ust. 1 RODO'],
  'referrer-policy': ['art. 25 ust. 2 RODO'],
  'privacy-policy-content': ['art. 13 ust. 1 lit. a i b RODO'],
  'legal-notice-content': ['art. 5 ust. 2 i 3 UŚUDE', 'art. 206 § 1 KSH', 'art. 374 § 1 KSH'],
  'third-country-providers': [
    'art. 44, 45 i 46 RODO',
    'decyzja wykonawcza Komisji (UE) 2023/1795 (ramy ochrony danych UE-USA)',
  ],
  'reject-less-prominent': [
    'art. 399 ust. 1 pkt 2 PKE',
    'art. 4 pkt 11 RODO',
    'EROD, Wytyczne 03/2022',
  ],
  'consent-preselected': ['art. 399 ust. 1 pkt 2 PKE', 'art. 4 pkt 11 RODO', PLANET49_PL],
  'tracking-cookie-lifetime': ['art. 5 ust. 1 lit. e RODO'],
  // Not transposed into the ustawa o prawach konsumenta as of 2026-11-17.
  'withdrawal-button': ['art. 11a dyrektywy 2011/83/UE'],
  'accessibility-statement': [`art. 32 ust. 2 pkt 1 ${PL_ACCESSIBILITY}`],
};

const UK_TRACKERS = ['PECR reg. 6(1), Sch. A1 para. 2', 'UK GDPR Art. 6(1)(a)'];
const UK_CONSENT = ['PECR reg. 6(1), Sch. A1 para. 2', 'UK GDPR Art. 4(1)(11)'];
const ICO_CONSENT = 'ICO, guidance on storage and access technologies: managing consent';
const UK_E_COMMERCE = 'Electronic Commerce (EC Directive) Regulations 2002, reg. 6(1)';
const UK_COMPANY_DISCLOSURES =
  'Company, Limited Liability Partnership and Business (Names and Trading Disclosures) Regulations 2015, regs. 24 and 25';
const UK_EQUALITY = 'Equality Act 2010, ss. 20 and 29';

/**
 * The United Kingdom: PECR as amended by the Data (Use and Access) Act 2025 (Sch. A1 in force
 * since 05.02.2026) and the UK GDPR, whose definitions are now Art. 4(1) and whose transfer rules
 * are Arts. 44A to 46. Researched 2026-11-17 against legislation.gov.uk; sources in docs/regions.md.
 */
const UNITED_KINGDOM: Record<RuleId, string[]> = {
  'pre-consent-trackers': UK_TRACKERS,
  'consent-banner-missing': UK_TRACKERS,
  'trackers-after-reject': UK_TRACKERS,
  'trackers-after-settings': UK_TRACKERS,
  'reject-option': [...UK_CONSENT, ICO_CONSENT],
  'consent-settings-link': ['UK GDPR Art. 7(3)', 'PECR reg. 6(1), Sch. A1 para. 2'],
  'google-fonts': ['UK GDPR Art. 6(1)'],
  'adobe-fonts': ['UK GDPR Art. 6(1)'],
  'third-party-embeds': ['UK GDPR Art. 6(1)', 'PECR reg. 6(1)'],
  'third-party-cdns': ['UK GDPR Art. 6(1)'],
  'impressum-link': [UK_E_COMMERCE, UK_COMPANY_DISCLOSURES],
  'privacy-policy-link': ['UK GDPR Art. 12', 'UK GDPR Art. 13'],
  'banner-legal-links': ['UK GDPR Art. 12(1)', 'UK GDPR Art. 13', UK_E_COMMERCE],
  'form-privacy-notice': ['UK GDPR Art. 13'],
  'https-transport': ['UK GDPR Art. 32(1)'],
  'privacy-policy-vendors': ['UK GDPR Art. 13(1)(e)'],
  'trackers-after-close': UK_CONSENT,
  'banner-language': ['UK GDPR Arts. 4(1)(11), 7(2)'],
  'banner-keyboard': ['UK GDPR Arts. 4(1)(11), 7(3)', UK_EQUALITY],
  'gpc-signal': ['UK GDPR Art. 21(5)'],
  'form-preticked-consent': ['UK GDPR Arts. 4(1)(11), 7', 'PECR reg. 22'],
  'mixed-content': ['UK GDPR Art. 32(1)'],
  // PECR reg. 6(2)(b): access includes information the device emits, which covers fingerprinting.
  fingerprinting: ['PECR reg. 6(1) and (2)(b)'],
  'third-party-personal-data': ['UK GDPR Arts. 5(1)(c), 6(1)'],
  'referrer-policy': ['UK GDPR Art. 25(2)'],
  'privacy-policy-content': ['UK GDPR Art. 13(1)(a) and (b)'],
  'legal-notice-content': [`${UK_E_COMMERCE}(a) to (d)`, UK_COMPANY_DISCLOSURES],
  'third-country-providers': [
    'UK GDPR Arts. 44A, 45A and 46',
    'Data Protection (Adequacy) (United States of America) Regulations 2023',
  ],
  'reject-less-prominent': [...UK_CONSENT, ICO_CONSENT],
  'consent-preselected': UK_CONSENT,
  'tracking-cookie-lifetime': ['UK GDPR Art. 5(1)(e)'],
  // No UK counterpart to Art. 11a Directive 2011/83/EU; cancellation by any clear statement.
  'withdrawal-button': ['Consumer Contracts Regulations 2013, regs. 29 and 32'],
  // A statement is required of public sector bodies only; private sites owe reasonable adjustments.
  'accessibility-statement': [UK_EQUALITY],
};

const LEGAL: Record<string, Record<Region, string[]>> = Object.fromEntries(
  (Object.keys(BASE) as RuleId[]).map((ruleId) => [
    ruleId,
    {
      ...BASE[ruleId],
      fr: FRANCE[ruleId],
      it: ITALY[ruleId],
      es: SPAIN[ruleId],
      nl: NETHERLANDS[ruleId],
      pl: POLAND[ruleId],
      uk: UNITED_KINGDOM[ruleId],
    },
  ]),
);

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
 * embed, and the Munich ruling that makes them an error in Germany is not Swiss law, so
 * they drop too. Ignoring an explicit refusal stays as serious as anywhere.
 */
const SOFTER_IN_SWITZERLAND = new Set([
  'pre-consent-trackers',
  // Closing is no explicit refusal, so the opt-out model applies.
  'trackers-after-close',
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
  'banner-keyboard',
]);

/**
 * The United Kingdom has no counterpart to the EU withdrawal button or the accessibility
 * statement of the European Accessibility Act for private sites, and its e-commerce rules ask for
 * the provider's details to be easily accessible, not for a page called "legal notice". Analytics
 * before consent is handled in the tracker rules (PECR Sch. A1 para. 5).
 */
const SOFTER_IN_THE_UK = new Set([
  'withdrawal-button',
  'accessibility-statement',
  'impressum-link',
]);

/**
 * Italy, the Netherlands and Poland ask for the provider's details to be easily and directly
 * accessible, not for a page with a fixed name, so a missing "legal notice" link is one level
 * lower there; legal-notice-content still checks the details wherever they are linked.
 */
const NO_FIXED_NOTICE_PAGE = new Set(['impressum-link']);

/**
 * Spain and Poland had not transposed the withdrawal button (Art. 11a of Directive 2011/83/EU,
 * from 19.06.2026) as of 2026-11-17: the directive applies to the national legislator, not yet to
 * the shop, so the finding is one level lower until the national law is in force.
 */
const WITHDRAWAL_NOT_TRANSPOSED = 'withdrawal-button';

/** Rules whose findings drop one level in a region. */
const SOFTER: Partial<Record<Region, ReadonlySet<string>>> = {
  ch: SOFTER_IN_SWITZERLAND,
  it: NO_FIXED_NOTICE_PAGE,
  es: new Set([WITHDRAWAL_NOT_TRANSPOSED]),
  nl: NO_FIXED_NOTICE_PAGE,
  pl: new Set([...NO_FIXED_NOTICE_PAGE, WITHDRAWAL_NOT_TRANSPOSED]),
  uk: SOFTER_IN_THE_UK,
};

/** One level lower, never below info. */
const softened = (severity: Severity): Severity => (severity === 'error' ? 'warning' : 'info');

function severityFor(finding: Finding, region: Region): Severity {
  return SOFTER[region]?.has(finding.ruleId) ? softened(finding.severity) : finding.severity;
}
