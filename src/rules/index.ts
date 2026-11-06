import type { Rule } from '../types.js';
import { accessibilityStatement } from './accessibility-statement.js';
import { adobeFonts } from './adobe-fonts.js';
import { bannerLegalLinks } from './banner-legal-links.js';
import { consentBannerMissing } from './consent-banner-missing.js';
import { consentPreselected } from './consent-preselected.js';
import { consentSettingsLink } from './consent-settings-link.js';
import { formPrivacyNotice } from './form-privacy-notice.js';
import { googleFonts } from './google-fonts.js';
import { httpsTransport } from './https-transport.js';
import { impressumLink } from './impressum-link.js';
import { legalNoticeContent } from './legal-notice-content.js';
import { preConsentTrackers } from './pre-consent-trackers.js';
import { privacyPolicyContent } from './privacy-policy-content.js';
import { privacyPolicyLink } from './privacy-policy-link.js';
import { privacyPolicyVendors } from './privacy-policy-vendors.js';
import { rejectLessProminent } from './reject-less-prominent.js';
import { rejectOption } from './reject-option.js';
import { thirdCountryProviders } from './third-country-providers.js';
import { thirdPartyCdns } from './third-party-cdns.js';
import { thirdPartyEmbeds } from './third-party-embeds.js';
import { trackersAfterReject } from './trackers-after-reject.js';
import { trackersAfterSettings } from './trackers-after-settings.js';
import { trackingCookieLifetime } from './tracking-cookie-lifetime.js';
import { withdrawalButton } from './withdrawal-button.js';

export const defaultRules: readonly Rule[] = [
  preConsentTrackers,
  trackersAfterReject,
  trackersAfterSettings,
  consentPreselected,
  rejectOption,
  rejectLessProminent,
  consentSettingsLink,
  consentBannerMissing,
  bannerLegalLinks,
  googleFonts,
  adobeFonts,
  thirdPartyEmbeds,
  thirdPartyCdns,
  thirdCountryProviders,
  trackingCookieLifetime,
  impressumLink,
  legalNoticeContent,
  privacyPolicyLink,
  privacyPolicyVendors,
  privacyPolicyContent,
  formPrivacyNotice,
  httpsTransport,
  withdrawalButton,
  accessibilityStatement,
];

export {
  accessibilityStatement,
  adobeFonts,
  bannerLegalLinks,
  consentBannerMissing,
  consentPreselected,
  consentSettingsLink,
  formPrivacyNotice,
  googleFonts,
  httpsTransport,
  impressumLink,
  legalNoticeContent,
  preConsentTrackers,
  privacyPolicyContent,
  privacyPolicyLink,
  privacyPolicyVendors,
  rejectLessProminent,
  rejectOption,
  thirdCountryProviders,
  thirdPartyCdns,
  thirdPartyEmbeds,
  trackersAfterReject,
  trackersAfterSettings,
  trackingCookieLifetime,
  withdrawalButton,
};
