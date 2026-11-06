import { describe, expect, it } from 'vitest';
import { fixGuideUrl, GUIDE_RULES, withFixGuides } from '../src/fix-guides.js';
import type { Finding } from '../src/types.js';

const finding = (ruleId: string, fix?: string): Finding => ({
  ruleId,
  severity: 'error',
  message: 'Something',
  pageUrl: 'https://example.de/',
  evidence: [],
  ...(fix === undefined ? {} : { fix }),
});

describe('fix guides', () => {
  it('links the section of the rule, in German where there is a German guide', () => {
    expect(fixGuideUrl('OneTrust', 'reject-option', 'en')).toBe(
      'https://github.com/jexcellence/privalint/blob/main/docs/fixes/onetrust.md#reject-option',
    );
    expect(fixGuideUrl('Cookiebot', 'consent-preselected', 'de')).toMatch(
      /docs\/fixes\/cookiebot\.de\.md#consent-preselected$/,
    );
    expect(fixGuideUrl('Complianz', 'banner-language', 'hu')).toMatch(
      /complianz\.md#banner-language$/,
    );
    expect(fixGuideUrl('Klaro', 'reject-option', 'en')).toBeUndefined();
    expect(fixGuideUrl('Usercentrics', 'google-fonts', 'en')).toBeUndefined();
  });

  it('appends the guide to covered findings only', () => {
    const [covered, other, bare] = withFixGuides(
      [
        finding('trackers-after-reject', 'Block it.'),
        finding('google-fonts', 'Host it.'),
        finding('gpc-signal'),
      ],
      'Usercentrics',
      'en',
    );
    expect(covered?.fix).toBe(
      'Block it. How to do this in Usercentrics: https://github.com/jexcellence/privalint/blob/main/docs/fixes/usercentrics.md#trackers-after-reject',
    );
    expect(other?.fix).toBe('Host it.');
    expect(bare?.fix).toMatch(/^How to do this in Usercentrics: /);
    expect(withFixGuides([finding('reject-option', 'x')], undefined, 'en')[0]?.fix).toBe('x');
  });

  it('has a guide section for every covered rule in every guide', async () => {
    const { readFile } = await import('node:fs/promises');
    for (const slug of ['cookiebot', 'usercentrics', 'onetrust', 'complianz']) {
      for (const suffix of ['md', 'de.md']) {
        const text = await readFile(
          new URL(`../docs/fixes/${slug}.${suffix}`, import.meta.url),
          'utf8',
        );
        for (const rule of GUIDE_RULES) {
          expect(text, `${slug}.${suffix} lacks ${rule}`).toContain(`## \`${rule}\``);
        }
      }
    }
  });
});
