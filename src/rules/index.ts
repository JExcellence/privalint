import type { Rule } from '../types.js';
import { googleFonts } from './google-fonts.js';
import { impressumLink } from './impressum-link.js';
import { preConsentTrackers } from './pre-consent-trackers.js';
import { privacyPolicyLink } from './privacy-policy-link.js';
import { rejectOption } from './reject-option.js';
import { thirdPartyCdns } from './third-party-cdns.js';
import { thirdPartyEmbeds } from './third-party-embeds.js';
import { trackersAfterReject } from './trackers-after-reject.js';

export const defaultRules: readonly Rule[] = [
  preConsentTrackers,
  trackersAfterReject,
  rejectOption,
  googleFonts,
  thirdPartyEmbeds,
  thirdPartyCdns,
  impressumLink,
  privacyPolicyLink,
];

export {
  googleFonts,
  impressumLink,
  preConsentTrackers,
  privacyPolicyLink,
  rejectOption,
  thirdPartyCdns,
  thirdPartyEmbeds,
  trackersAfterReject,
};
