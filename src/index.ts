export { loadConfig, type PrivalintConfig, parseConfig } from './config.js';
export { type ConsentCheckOptions, observeConsent } from './consent.js';
export { assessCoverage, type CoverageAssessment, type CoverageIssue } from './coverage.js';
export { type Tracker, type TrackerCategory, trackers } from './data/trackers.js';
export { diagnosticUrl } from './diagnostics.js';
export { LANGS, type Lang, type Text } from './i18n.js';
export { legalReferences, REGIONS, type Region } from './legal.js';
export {
  type NetworkAdapter,
  NetworkError,
  type NetworkLimits,
  type NetworkRequest,
  type NetworkResponse,
} from './network.js';
export {
  identifyReportSchema,
  REPORT_SCHEMA_VERSION,
  type ReportSchemaIdentity,
  SUPPORTED_REPORT_SCHEMAS,
} from './report-contract.js';
export {
  adobeFonts,
  consentSettingsLink,
  defaultRules,
  googleFonts,
  impressumLink,
  preConsentTrackers,
  privacyPolicyLink,
  rejectOption,
  thirdPartyCdns,
  thirdPartyEmbeds,
  trackersAfterReject,
} from './rules/index.js';
export { type ScanOptions, scan } from './scanner.js';
export type * from './types.js';
