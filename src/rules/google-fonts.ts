import { say, type Text } from '../i18n.js';
import type { Finding, Rule } from '../types.js';
import { hostMatches, safeHost } from '../url.js';

const ID = 'google-fonts';
const GOOGLE_FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

/** dns-prefetch only resolves the name; these hints open a real connection. */
const CONNECTING_HINTS = new Set(['preconnect', 'preload', 'prefetch', 'stylesheet']);

const FIX: Text = {
  en:
    'Self-host the font files. In Next.js, next/font/google downloads fonts at build time and ' +
    'serves them from your own domain. Elsewhere, install the family from @fontsource or download ' +
    'it via google-webfonts-helper, then remove every reference to fonts.googleapis.com and ' +
    'fonts.gstatic.com.',
  de:
    'Die Schriftdateien selbst hosten. In Next.js lädt next/font/google die Schriften beim Build ' +
    'herunter und liefert sie von der eigenen Domain aus. Sonst die Schrift über @fontsource ' +
    'installieren oder mit dem google-webfonts-helper herunterladen und danach alle Verweise auf ' +
    'fonts.googleapis.com und fonts.gstatic.com entfernen.',
};

const isGoogleFontUrl = (url: string): boolean => {
  const host = safeHost(url);
  return host !== undefined && GOOGLE_FONT_HOSTS.some((domain) => hostMatches(host, domain));
};

export const googleFonts: Rule = {
  id: ID,
  title: 'Google Fonts loaded from Google servers',
  description:
    "Loading fonts from Google's CDN sends every visitor's IP address to Google without " +
    'consent. LG München I awarded a visitor damages for this in 2022.',
  references: ['Art. 6(1) GDPR', 'LG München I, 20.01.2022, Az. 3 O 17493/20'],
  check({ page, lang }) {
    const requests = page.requests.filter((request) => isGoogleFontUrl(request.url));
    if (requests.length > 0) {
      const count = requests.length;
      return [
        {
          ruleId: ID,
          severity: 'error',
          message: say(lang, {
            en: `Fonts are loaded from Google (${count} request${count === 1 ? '' : 's'}).`,
            de: `Schriften werden von Google geladen (${count} ${count === 1 ? 'Anfrage' : 'Anfragen'}).`,
          }),
          pageUrl: page.finalUrl,
          evidence: [...new Set(requests.map((request) => request.url))].slice(0, 5),
          fix: say(lang, FIX),
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
          message: say(lang, {
            en: 'The page preconnects to Google Fonts. No font was fetched, but the browser still opens a connection and transmits the IP address.',
            de: 'Die Seite baut vorab eine Verbindung zu Google Fonts auf. Es wurde keine Schrift geladen, aber der Browser öffnet trotzdem eine Verbindung und überträgt die IP-Adresse.',
          }),
          pageUrl: page.finalUrl,
          evidence: hints.map((hint) => `<link rel="${hint.rel}" href="${hint.href}">`),
          fix: say(lang, {
            en: 'Remove the leftover <link> tags pointing to Google Fonts.',
            de: 'Die übrig gebliebenen <link>-Tags zu Google Fonts entfernen.',
          }),
        } satisfies Finding,
      ];
    }

    return [];
  },
};
