export { type Tracker, type TrackerCategory, trackers } from './data/trackers.js';
export { LANGS, type Lang, type Text } from './i18n.js';
export { legalReferences, REGIONS, type Region } from './legal.js';
export {
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
