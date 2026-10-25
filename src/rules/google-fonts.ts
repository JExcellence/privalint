import type { Finding, Rule } from '../types.js';
import { hostMatches, safeHost } from '../url.js';

const ID = 'google-fonts';
const GOOGLE_FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

/** dns-prefetch only resolves the name; these hints open a real connection. */
const CONNECTING_HINTS = new Set(['preconnect', 'preload', 'prefetch', 'stylesheet']);

const FIX =
  'Self-host the font files. In Next.js, next/font/google downloads fonts at build time and ' +
  'serves them from your own domain. Elsewhere, install the family from @fontsource or download ' +
  'it via google-webfonts-helper, then remove every reference to fonts.googleapis.com and ' +
  'fonts.gstatic.com.';

const isGoogleFontUrl = (url: string): boolean => {
  const host = safeHost(url);
  return host !== undefined && GOOGLE_FONT_HOSTS.some((domain) => hostMatches(host, domain));
};

export const googleFonts: Rule = {
  id: ID,
  title: 'Google Fonts loaded from Google servers',
  description:
    "Loading fonts from Google's CDN sends every visitor's IP address to Google without " +
    'consent. A German court awarded damages for this in 2022, which set off a wave of ' +
    'warning letters.',
  references: ['Art. 6(1) GDPR', 'LG München I, 20.01.2022, Az. 3 O 17493/20'],
  check({ page }) {
    const requests = page.requests.filter((request) => isGoogleFontUrl(request.url));
    if (requests.length > 0) {
      return [
        {
          ruleId: ID,
          severity: 'error',
          message: `Fonts are loaded from Google (${requests.length} request${requests.length === 1 ? '' : 's'}).`,
          pageUrl: page.finalUrl,
          evidence: [...new Set(requests.map((request) => request.url))].slice(0, 5),
          fix: FIX,
        },
      ];
    }

    const hints = page.resourceHints.filter(
      (hint) =>
        isGoogleFontUrl(hint.href) &&
        hint.rel.split(/\s+/).some((rel) => CONNECTING_HINTS.has(rel)),
    );
    if (hints.length > 0) {
      return [
        {
          ruleId: ID,
          severity: 'warning',
          message:
            'The page preconnects to Google Fonts. No font was fetched, but the browser still opens a connection and transmits the IP address.',
          pageUrl: page.finalUrl,
          evidence: hints.map((hint) => `<link rel="${hint.rel}" href="${hint.href}">`),
          fix: 'Remove the leftover <link> tags pointing to Google Fonts.',
        } satisfies Finding,
      ];
    }

    return [];
  },
};
