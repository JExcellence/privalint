import { say, type Text } from '../i18n.js';
import { observedRequests } from '../observations.js';
import type { Finding, Rule } from '../types.js';
import { hostMatches, safeHost } from '../url.js';

const ID = 'adobe-fonts';
/** use.typekit.net serves the kit CSS and fonts, p.typekit.net counts page views for licensing. */
const ADOBE_FONT_HOSTS = ['use.typekit.net', 'p.typekit.net'];

/** dns-prefetch only resolves the name; these hints open a real connection. */
const CONNECTING_HINTS = new Set(['preconnect', 'preload', 'prefetch', 'stylesheet']);

const FIX: Text = {
  en:
    'Adobe Fonts are licensed for web use through Adobe’s servers only, so they cannot simply be ' +
    'self-hosted. Either license the font for self-hosting from its foundry or ask Adobe Sales ' +
    'about local hosting, or switch to an open-licensed font (e.g. from Fontsource) and serve it ' +
    'from your own domain. Then remove every reference to use.typekit.net and p.typekit.net.',
  de:
    'Adobe Fonts sind für das Web nur über Adobes Server lizenziert und lassen sich nicht einfach ' +
    'selbst hosten. Entweder die Schrift beim Hersteller für Self-Hosting lizenzieren oder bei Adobe ' +
    'nach lokalem Hosting fragen, oder auf eine Schrift mit offener Lizenz (z. B. über Fontsource) ' +
    'wechseln und sie von der eigenen Domain ausliefern. Danach alle Verweise auf use.typekit.net ' +
    'und p.typekit.net entfernen.',
};

const isAdobeFontUrl = (url: string): boolean => {
  const host = safeHost(url);
  return host !== undefined && ADOBE_FONT_HOSTS.some((domain) => hostMatches(host, domain));
};

export const adobeFonts: Rule = {
  id: ID,
  title: 'Adobe Fonts loaded from Adobe servers',
  description:
    "Adobe Fonts (Typekit) are served from Adobe's servers, which receive every visitor's IP " +
    'address and the page’s hostname, and count page views for font licensing. The reasoning ' +
    'that made Google Fonts a problem applies the same way.',
  references: ['Art. 6(1) GDPR', 'LG München I, 20.01.2022, Az. 3 O 17493/20 (by analogy)'],
  check({ page, lang }) {
    const requests = observedRequests(page.requests).filter((request) =>
      isAdobeFontUrl(request.url),
    );
    if (requests.length > 0) {
      const count = requests.length;
      return [
        {
          ruleId: ID,
          severity: 'error',
          message: say(lang, {
            en: `Fonts are loaded from Adobe (${count} request${count === 1 ? '' : 's'}).`,
            de: `Schriften werden von Adobe geladen (${count} ${count === 1 ? 'Anfrage' : 'Anfragen'}).`,
          }),
          pageUrl: page.finalUrl,
          evidence: [...new Set(requests.map((request) => request.url))].slice(0, 5),
          fix: say(lang, FIX),
        },
      ];
    }

    const hints = page.resourceHints.filter(
      (hint) =>
        isAdobeFontUrl(hint.href) && hint.rel.split(/\s+/).some((rel) => CONNECTING_HINTS.has(rel)),
    );
    if (hints.length > 0) {
      return [
        {
          ruleId: ID,
          severity: 'warning',
          message: say(lang, {
            en: 'The page preconnects to Adobe Fonts. No font was fetched, but the browser still opens a connection and transmits the IP address.',
            de: 'Die Seite baut vorab eine Verbindung zu Adobe Fonts auf. Es wurde keine Schrift geladen, aber der Browser öffnet trotzdem eine Verbindung und überträgt die IP-Adresse.',
          }),
          pageUrl: page.finalUrl,
          evidence: hints.map((hint) => `<link rel="${hint.rel}" href="${hint.href}">`),
          fix: say(lang, {
            en: 'Remove the leftover <link> tags pointing to Adobe Fonts.',
            de: 'Die übrig gebliebenen <link>-Tags zu Adobe Fonts entfernen.',
          }),
        } satisfies Finding,
      ];
    }

    return [];
  },
};
