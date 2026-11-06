import { findByUrl, type HostPattern } from '../url.js';

/**
 * A service a page talks to that is neither a tracker, an embed nor a CDN: error monitoring,
 * performance monitoring, feature flags, backends. Each entry says where the data goes.
 */
export interface Provider extends HostPattern {
  vendor: string;
  /**
   * ISO 3166-1 alpha-2 code of the country the requests go to: the region the host names, such as
   * Sentry's `ingest.de.`, otherwise the provider's seat. `EU` when the provider only says the
   * region is in the EU.
   */
  country: string;
}

/**
 * Hand-maintained. Order matters: the first entry that matches wins, so put region hosts before
 * the provider's general domain. The region hosts of Sentry, Datadog and New Relic were checked
 * 2026-11-06 against the providers' documentation; sources in docs/rules/third-country-providers.md.
 */
export const providers: readonly Provider[] = [
  // Sentry: o<id>.ingest.de.sentry.io stores in Frankfurt; ingest.us. and the older ingest. in Iowa.
  { vendor: 'Sentry', country: 'DE', domains: ['ingest.de.sentry.io'] },
  { vendor: 'Sentry', country: 'US', domains: ['sentry.io', 'sentry-cdn.com'] },
  // Supabase Inc. is in the US; the region of a project is not visible from its host.
  { vendor: 'Supabase', country: 'US', domains: ['supabase.co'] },
  { vendor: 'Firebase', country: 'US', domains: ['firebaseio.com', 'firebaseapp.com'] },
  {
    vendor: 'Firebase',
    country: 'US',
    domains: [
      'firestore.googleapis.com',
      'identitytoolkit.googleapis.com',
      'securetoken.googleapis.com',
      'firebaseinstallations.googleapis.com',
    ],
  },
  { vendor: 'Datadog', country: 'EU', domains: ['browser-intake-datadoghq.eu'] },
  {
    vendor: 'Datadog',
    country: 'US',
    domains: [
      'browser-intake-datadoghq.com',
      'browser-intake-us3-datadoghq.com',
      'browser-intake-us5-datadoghq.com',
      'browser-intake-ap1-datadoghq.com',
      'datadoghq-browser-agent.com',
    ],
  },
  { vendor: 'New Relic', country: 'EU', domains: ['bam.eu01.nr-data.net'] },
  { vendor: 'New Relic', country: 'US', domains: ['nr-data.net', 'js-agent.newrelic.com'] },
  { vendor: 'Bugsnag', country: 'US', domains: ['bugsnag.com'] },
  { vendor: 'Rollbar', country: 'US', domains: ['api.rollbar.com', 'cdn.rollbar.com'] },
  { vendor: 'LaunchDarkly', country: 'US', domains: ['launchdarkly.com'] },
  { vendor: 'Vercel Analytics', country: 'US', domains: ['vitals.vercel-insights.com'] },
  {
    vendor: 'Cloudflare Web Analytics',
    country: 'US',
    domains: ['static.cloudflareinsights.com', 'cloudflareinsights.com'],
  },
];

export const findProvider = (url: string) => findByUrl(providers, url);

/** EU member states and the other EEA countries, where the GDPR applies directly. */
const EEA = new Set([
  'AT',
  'BE',
  'BG',
  'CY',
  'CZ',
  'DE',
  'DK',
  'EE',
  'ES',
  'FI',
  'FR',
  'GR',
  'HR',
  'HU',
  'IE',
  'IT',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SE',
  'SI',
  'SK',
  'IS',
  'LI',
  'NO',
  'EU',
]);

/** Whether data sent to `country` leaves the EU/EEA, or Switzerland as well for `ch`. */
export function isThirdCountry(country: string, region?: string): boolean {
  if (region === 'ch' && country === 'CH') return false;
  return !EEA.has(country);
}
