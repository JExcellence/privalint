import type { Rule } from '../types.js';
import { accessibilityStatement } from './accessibility-statement.js';
import { adobeFonts } from './adobe-fonts.js';
import { bannerLegalLinks } from './banner-legal-links.js';
import { consentBannerMissing } from './consent-banner-missing.js';
import { consentSettingsLink } from './consent-settings-link.js';
import { googleFonts } from './google-fonts.js';
import { impressumLink } from './impressum-link.js';
import { preConsentTrackers } from './pre-consent-trackers.js';
import { privacyPolicyLink } from './privacy-policy-link.js';
import { rejectOption } from './reject-option.js';
import { thirdPartyCdns } from './third-party-cdns.js';
import { thirdPartyEmbeds } from './third-party-embeds.js';
import { trackersAfterReject } from './trackers-after-reject.js';
import { trackersAfterSettings } from './trackers-after-settings.js';
import { withdrawalButton } from './withdrawal-button.js';

export const defaultRules: readonly Rule[] = [
  preConsentTrackers,
  trackersAfterReject,
  trackersAfterSettings,
  rejectOption,
  consentSettingsLink,
  consentBannerMissing,
  bannerLegalLinks,
  googleFonts,
  adobeFonts,
  thirdPartyEmbeds,
  thirdPartyCdns,
  impressumLink,
  privacyPolicyLink,
  withdrawalButton,
  accessibilityStatement,
];

export {
  accessibilityStatement,
  adobeFonts,
  bannerLegalLinks,
  consentBannerMissing,
  consentSettingsLink,
  googleFonts,
  impressumLink,
  preConsentTrackers,
  privacyPolicyLink,
  rejectOption,
  thirdPartyCdns,
  thirdPartyEmbeds,
  trackersAfterReject,
  trackersAfterSettings,
  withdrawalButton,
};
