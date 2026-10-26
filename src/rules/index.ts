import type { Rule } from '../types.js';
import { googleFonts } from './google-fonts.js';
import { impressumLink } from './impressum-link.js';
import { preConsentTrackers } from './pre-consent-trackers.js';
import { rejectOption } from './reject-option.js';
import { trackersAfterReject } from './trackers-after-reject.js';

export const defaultRules: readonly Rule[] = [
  preConsentTrackers,
  trackersAfterReject,
  rejectOption,
  googleFonts,
  impressumLink,
];

export { googleFonts, impressumLink, preConsentTrackers, rejectOption, trackersAfterReject };
