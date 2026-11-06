import { type Lang, say } from './i18n.js';
import { REPOSITORY_URL } from './meta.js';
import type { Finding } from './types.js';

/** Consent managers with a fix guide in docs/fixes, by the name consent recognition reports. */
const GUIDES: Readonly<Record<string, string>> = {
  Cookiebot: 'cookiebot',
  Usercentrics: 'usercentrics',
  OneTrust: 'onetrust',
  Complianz: 'complianz',
};

/** Rules whose fix is a setting in the consent manager; each guide has a section per rule. */
export const GUIDE_RULES: ReadonlySet<string> = new Set([
  'pre-consent-trackers',
  'trackers-after-reject',
  'trackers-after-settings',
  'trackers-after-close',
  'consent-preselected',
  'reject-option',
  'reject-less-prominent',
  'consent-settings-link',
  'banner-legal-links',
  'banner-language',
  'gpc-signal',
]);

/** The guide section for a rule in the consent manager's guide; German has its own, else English. */
export function fixGuideUrl(cmp: string, ruleId: string, lang: Lang): string | undefined {
  const slug = GUIDES[cmp];
  if (slug === undefined || !GUIDE_RULES.has(ruleId)) return undefined;
  const file = lang === 'de' ? `${slug}.de.md` : `${slug}.md`;
  return `${REPOSITORY_URL}/blob/main/docs/fixes/${file}#${ruleId}`;
}

/**
 * Adds the consent manager's guide to the fix of each finding it covers, so the reader goes
 * straight to the setting in Cookiebot, Usercentrics, OneTrust or Complianz.
 */
export function withFixGuides(
  findings: readonly Finding[],
  cmp: string | undefined,
  lang: Lang,
): Finding[] {
  if (cmp === undefined || GUIDES[cmp] === undefined) return [...findings];
  return findings.map((finding) => {
    const url = fixGuideUrl(cmp, finding.ruleId, lang);
    if (url === undefined) return finding;
    const pointer = say(lang, {
      en: `How to do this in ${cmp}: ${url}`,
      de: `So geht das in ${cmp}: ${url}`,
      hu: `Így teheti meg a(z) ${cmp} felületén (angol nyelvű útmutató): ${url}`,
    });
    return { ...finding, fix: finding.fix === undefined ? pointer : `${finding.fix} ${pointer}` };
  });
}
