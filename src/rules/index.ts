import type { Rule } from '../types.js';
import { googleFonts } from './google-fonts.js';
import { impressumLink } from './impressum-link.js';
import { preConsentTrackers } from './pre-consent-trackers.js';

export const defaultRules: readonly Rule[] = [preConsentTrackers, googleFonts, impressumLink];

export { googleFonts, impressumLink, preConsentTrackers };
