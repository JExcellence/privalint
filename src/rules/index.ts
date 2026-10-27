import type { Rule } from '../types.js';
import { adobeFonts } from './adobe-fonts.js';
import { consentSettingsLink } from './consent-settings-link.js';
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
  consentSettingsLink,
  googleFonts,
  adobeFonts,
  thirdPartyEmbeds,
  thirdPartyCdns,
  impressumLink,
  privacyPolicyLink,
];

export {
  adobeFonts,
  consentSettingsLink,
  googleFonts,
  impressumLink,
  preConsentTrackers,
  privacyPolicyLink,
  rejectOption,
  thirdPartyCdns,
  thirdPartyEmbeds,
  trackersAfterReject,
};
