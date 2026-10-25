import { hostMatches } from '../url.js';

export type TrackerCategory =
  | 'analytics'
  | 'advertising'
  | 'session-replay'
  | 'social'
  | 'marketing-automation'
  | 'tag-manager';

export interface Tracker {
  vendor: string;
  category: TrackerCategory;
  /** Hostnames; subdomains match too. */
  domains: string[];
  /** If set, only requests whose path starts with one of these count. */
  paths?: string[];
  /** Cookie name prefixes the vendor's script sets, including on the first-party domain. */
  cookies?: string[];
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
    cookies: ['mp_'],
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
];

export function findTrackerByUrl(url: string): Tracker | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  return trackers.find(
    (tracker) =>
      tracker.domains.some((domain) => hostMatches(parsed.hostname, domain)) &&
      (tracker.paths === undefined ||
        tracker.paths.some((path) => parsed.pathname.startsWith(path))),
  );
}

export function findTrackerByCookie(name: string): Tracker | undefined {
  return trackers.find((tracker) => tracker.cookies?.some((prefix) => name.startsWith(prefix)));
}
