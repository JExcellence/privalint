import { findByUrl, type HostPattern } from '../url.js';
import { openCookieDatabase } from './open-cookie-database.js';

export type TrackerCategory =
  | 'analytics'
  | 'advertising'
  | 'session-replay'
  | 'social'
  | 'marketing-automation'
  | 'tag-manager';

/** Who set a cookie and why. Cookies from the Open Cookie Database carry no hosts. */
export interface CookieTracker {
  vendor: string;
  category: TrackerCategory;
}

export interface Tracker extends HostPattern, CookieTracker {
  /**
   * Cookies the vendor's script sets, including on the first-party domain.
   * Strings are name prefixes; use a RegExp where a prefix would be too broad.
   */
  cookies?: Array<string | RegExp>;
}

/**
 * Hand-maintained and MIT licensed, so it can ship with the package.
 * Order matters: the first entry that matches wins, so put path-specific
 * entries before broader ones on the same domain.
 *
 * Adding a vendor? See CONTRIBUTING.md.
 */
export const trackers: readonly Tracker[] = [
  {
    vendor: 'Google Analytics',
    category: 'analytics',
    domains: ['google-analytics.com', 'analytics.google.com'],
    cookies: ['_ga', '_gid', '_gat'],
  },
  {
    vendor: 'Google Analytics',
    category: 'analytics',
    domains: ['googletagmanager.com'],
    paths: ['/gtag/'],
  },
  {
    vendor: 'Google Tag Manager',
    category: 'tag-manager',
    domains: ['googletagmanager.com'],
  },
  {
    vendor: 'Google Ads',
    category: 'advertising',
    domains: ['googleadservices.com', 'doubleclick.net', 'googlesyndication.com'],
    cookies: ['_gcl_'],
  },
  {
    vendor: 'Meta Pixel',
    category: 'advertising',
    domains: ['connect.facebook.net'],
    cookies: ['_fbp', '_fbc'],
  },
  {
    vendor: 'Meta Pixel',
    category: 'advertising',
    domains: ['facebook.com'],
    paths: ['/tr'],
  },
  {
    vendor: 'Hotjar',
    category: 'session-replay',
    domains: ['hotjar.com', 'hotjar.io'],
    cookies: ['_hj'],
  },
  {
    vendor: 'Microsoft Clarity',
    category: 'session-replay',
    domains: ['clarity.ms'],
    cookies: ['_clck', '_clsk'],
  },
  {
    vendor: 'Microsoft Advertising',
    category: 'advertising',
    domains: ['bat.bing.com'],
    cookies: ['_uetsid', '_uetvid'],
  },
  {
    vendor: 'LinkedIn Insight',
    category: 'advertising',
    domains: ['snap.licdn.com', 'px.ads.linkedin.com'],
    cookies: ['li_fat_id'],
  },
  {
    vendor: 'TikTok Pixel',
    category: 'advertising',
    domains: ['analytics.tiktok.com'],
    cookies: ['_ttp'],
  },
  {
    vendor: 'X (Twitter) Pixel',
    category: 'advertising',
    domains: ['static.ads-twitter.com', 'analytics.twitter.com'],
  },
  {
    vendor: 'Pinterest Tag',
    category: 'advertising',
    domains: ['ct.pinterest.com'],
    cookies: ['_pin_unauth'],
  },
  {
    vendor: 'Snap Pixel',
    category: 'advertising',
    domains: ['sc-static.net', 'tr.snapchat.com'],
    cookies: ['_scid'],
  },
  {
    vendor: 'Yandex Metrica',
    category: 'analytics',
    domains: ['mc.yandex.ru', 'mc.yandex.com'],
    cookies: ['_ym_'],
  },
  {
    vendor: 'HubSpot',
    category: 'marketing-automation',
    domains: ['js.hs-scripts.com', 'js.hs-analytics.net', 'track.hubspot.com'],
    cookies: ['__hstc', 'hubspotutk'],
  },
  {
    vendor: 'Segment',
    category: 'analytics',
    domains: ['cdn.segment.com', 'api.segment.io'],
    cookies: ['ajs_'],
  },
  {
    vendor: 'Mixpanel',
    category: 'analytics',
    domains: ['cdn.mxpnl.com', 'api-js.mixpanel.com'],
    cookies: [/^mp_\w+_mixpanel$/],
  },
  {
    vendor: 'Amplitude',
    category: 'analytics',
    domains: ['cdn.amplitude.com', 'api2.amplitude.com'],
    cookies: ['AMP_'],
  },
  {
    vendor: 'Matomo',
    category: 'analytics',
    domains: ['matomo.cloud'],
    cookies: ['_pk_'],
  },
  // Ad-tech vendors below were observed on welt.de, spiegel.de, focus.de, n-tv.de, bild.de,
  // independent.co.uk and usatoday.com on 2026-10-27, after accepting their consent banners.
  {
    vendor: 'Criteo',
    category: 'advertising',
    domains: ['criteo.com', 'criteo.net'],
    cookies: ['cto_'],
  },
  {
    vendor: 'Taboola',
    category: 'advertising',
    domains: ['taboola.com'],
  },
  {
    vendor: 'Outbrain',
    category: 'advertising',
    domains: ['outbrain.com', 'outbrainimg.com'],
  },
  {
    vendor: 'Adform',
    category: 'advertising',
    domains: ['adform.net'],
  },
  {
    // Measure and audience pixels only; cmp.quantcast.com is a consent manager, not a tracker.
    vendor: 'Quantcast',
    category: 'advertising',
    domains: ['quantserve.com', 'quantcount.com'],
    cookies: ['__qca'],
  },
  // Session-replay tools below. Hosts from the vendors' own install material or observed on
  // live sites on 2026-10-28; the sources are listed in docs/rules/pre-consent-trackers.md.
  {
    vendor: 'FullStory',
    category: 'session-replay',
    domains: ['edge.fullstory.com', 'rs.fullstory.com'],
  },
  { vendor: 'Mouseflow', category: 'session-replay', domains: ['cdn.mouseflow.com'] },
  { vendor: 'Smartlook', category: 'session-replay', domains: ['web-sdk.smartlook.com'] },
  {
    vendor: 'Lucky Orange',
    category: 'session-replay',
    domains: ['tools.luckyorange.com', 'settings.luckyorange.com'],
  },
  {
    // The tag and recording hosts; the corporate site is contentsquare.com.
    vendor: 'Contentsquare',
    category: 'session-replay',
    domains: ['contentsquare.net'],
    // _cs_optout is set when the visitor opts out and must not be reported as tracking.
    cookies: [/^_cs_(?!optout)/],
  },
];

export function findTrackerByUrl(url: string): Tracker | undefined {
  return findByUrl(trackers, url);
}

// The generated list, indexed once. Exact names are looked up directly; prefixes are tried
// longest first so the most specific wildcard wins.
const databaseNames = new Map<string, CookieTracker>();
const databasePrefixes: Array<{ prefix: string; tracker: CookieTracker }> = [];
for (const { vendor, category, names, prefixes } of openCookieDatabase) {
  const tracker: CookieTracker = { vendor, category };
  for (const name of names) {
    if (!databaseNames.has(name)) {
      databaseNames.set(name, tracker);
    }
  }
  for (const prefix of prefixes) {
    databasePrefixes.push({ prefix, tracker });
  }
}
databasePrefixes.sort((a, b) => b.prefix.length - a.prefix.length);

function findListedTrackerByCookie(name: string): Tracker | undefined {
  return trackers.find((tracker) =>
    tracker.cookies?.some((pattern) =>
      typeof pattern === 'string' ? name.startsWith(pattern) : pattern.test(name),
    ),
  );
}

function findDatabaseTrackerByCookie(name: string): CookieTracker | undefined {
  return (
    databaseNames.get(name) ??
    databasePrefixes.find(({ prefix }) => name.startsWith(prefix))?.tracker
  );
}

/**
 * Finds who set a cookie. The hand-maintained list wins: first by cookie name, then, if a domain
 * is given, by the host the cookie belongs to. Only then the Open Cookie Database is asked.
 */
export function findTrackerByCookie(name: string, domain?: string): CookieTracker | undefined {
  const host = domain?.replace(/^\./, '');
  return (
    findListedTrackerByCookie(name) ??
    (host ? findTrackerByUrl(`https://${host}/`) : undefined) ??
    findDatabaseTrackerByCookie(name)
  );
}
