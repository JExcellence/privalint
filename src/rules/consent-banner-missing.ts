import { say } from '../i18n.js';
import type { Finding, Rule } from '../types.js';
import { findTrackerHits } from './tracker-hits.js';

const ID = 'consent-banner-missing';

export const consentBannerMissing: Rule = {
  id: ID,
  title: 'Trackers run and there is no consent banner',
  description:
    'On the start page, trackers run before any interaction and privalint found no consent ' +
    'banner, not even after waiting for a late one. Visitors then have no way to give or refuse ' +
    'consent. pre-consent-trackers reports each tracker as an error; this rule names the cause.',
  references: ['§ 25 Abs. 1 TDDDG', 'Art. 5(3) ePrivacy Directive', 'Art. 6(1)(a) GDPR'],
  requires: ['network', 'banner-search'],
  check({ page, lang }) {
    if (page.consent?.bannerFound !== false || page.consent.state !== 'not-detected') return [];
    // A tag manager on its own can be configured to wait for consent, so it doesn't count here.
    const vendors = findTrackerHits(page.requests, page.cookies, lang, page.storage)
      .filter(({ tracker }) => tracker.category !== 'tag-manager')
      .map(({ tracker }) => tracker.vendor);
    if (vendors.length === 0) return [];
    const list = vendors.join(', ');
    return [
      {
        ruleId: ID,
        // pre-consent-trackers already gives each tracker an error; this explains why.
        severity: 'warning',
        message: say(lang, {
          en: `No consent banner was found, but ${list} run before any interaction. Visitors can't give or refuse consent.`,
          de: `Es wurde kein Cookie-Banner gefunden, aber ${list} laufen ohne jede Interaktion. Besucher können weder einwilligen noch ablehnen.`,
          hu: `Nem található sütibanner, de a következők minden interakció előtt futnak: ${list}. A látogatók nem tudnak hozzájárulni vagy elutasítani.`,
        }),
        pageUrl: page.finalUrl,
        evidence: [
          say(lang, {
            en: `Looked for a banner for ${page.consent.bannerWaitMs ?? 0} ms more after the page settled`,
            de: `Nach dem Laden noch ${page.consent.bannerWaitMs ?? 0} ms nach einem Banner gesucht`,
            hu: `A betöltés után a privalint még ${page.consent.bannerWaitMs ?? 0} ms-ig keresett bannert`,
          }),
          ...vendors.map((vendor) =>
            say(lang, {
              en: `Tracker: ${vendor}`,
              de: `Tracker: ${vendor}`,
              hu: `Nyomkövető: ${vendor}`,
            }),
          ),
        ],
        fix: say(lang, {
          en: 'Add a consent manager that blocks these tools until the visitor opts in, with "accept" and "reject" on its first layer. If a banner exists but privalint missed it, please report the site.',
          de: 'Ein Consent-Tool einbinden, das diese Dienste bis zur Einwilligung blockiert, mit „Akzeptieren“ und „Ablehnen“ auf der ersten Ebene. Gibt es ein Banner, das privalint übersehen hat, bitte die Seite melden.',
          hu: 'Építsen be egy hozzájárulás-kezelőt, amely a hozzájárulásig blokkolja ezeket az eszközöket, és az első szinten „Elfogadom” és „Elutasítom” gombot kínál. Ha van banner, de a privalint nem találta meg, kérjük, jelezze az oldalt.',
        }),
      } satisfies Finding,
    ];
  },
};
