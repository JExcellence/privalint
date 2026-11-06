import { findProvider } from '../data/providers.js';
import { findCdn, findEmbed } from '../data/third-parties.js';
import { findTrackerByCookie, findTrackerByUrl } from '../data/trackers.js';
import { say } from '../i18n.js';
import { observedRequests } from '../observations.js';
import type { Finding, RecordedRequest, Rule, Severity } from '../types.js';
import { hostMatches } from '../url.js';

const ID = 'privacy-policy-vendors';

const FONT_SERVICES = [
  { vendor: 'Google Fonts', hosts: ['fonts.googleapis.com', 'fonts.gstatic.com'] },
  { vendor: 'Adobe Fonts', hosts: ['use.typekit.net', 'p.typekit.net'] },
];

/**
 * Other names a privacy policy may use for a vendor: the product it belongs to, an older name or
 * the company. Names shorter than three letters are never searched on their own.
 */
const ALIASES: Record<string, readonly string[]> = {
  'Google Analytics': ['GA4', 'Universal Analytics'],
  'Google Tag Manager': ['GTM'],
  'Google reCAPTCHA': ['reCAPTCHA'],
  'Meta Pixel': ['Facebook Pixel', 'Facebook'],
  'Facebook SDK': ['Meta'],
  'Facebook plugin': ['Meta'],
  'Microsoft Clarity': ['Clarity'],
  'Microsoft Advertising': ['Bing Ads'],
  Sentry: ['Functional Software'],
  'Cloudflare Turnstile': ['Turnstile'],
  'Cloudflare Web Analytics': ['Cloudflare'],
  'Vercel Analytics': ['Vercel'],
  'OpenStreetMap tiles': ['OpenStreetMap'],
  'Zendesk Web Widget': ['Zendesk'],
};

/** Words that describe how a vendor is used, not who it is: "YouTube embed" is named as "YouTube". */
const USAGE_SUFFIX =
  /\s+(?:embed|plugin|widgets?|web widget|pixel|tag|sdk|insight|tiles|cdn|play cdn|calendar embed)$/i;

interface Seen {
  severity: Severity;
  evidence: string;
}

export const privacyPolicyVendors: Rule = {
  id: ID,
  title: 'The privacy policy does not name a service the site uses',
  description:
    'The privacy policy has to name the recipients of personal data. privalint reads the privacy ' +
    'policy linked from the start page, and a cookie policy it links, and looks for every tracker, ' +
    'embed, font service, CDN and listed provider the start page contacted.',
  references: ['Art. 13(1)(e) GDPR', 'Art. 13(1)(f) GDPR'],
  check({ page, lang }) {
    const policy = page.privacyPolicy;
    if (policy === undefined) return [];
    const text = policy.text;
    const requests = observedRequests([
      ...page.requests,
      ...(page.consent?.afterReject?.requests ?? []),
    ]);
    const cookies = [...page.cookies, ...(page.consent?.afterReject?.cookies ?? [])];
    const cookieHosts = cookies.map((cookie) => cookie.domain.replace(/^\./, ''));

    const seen = new Map<string, Seen>();
    const note = (vendor: string, severity: Severity, evidence: string) => {
      const known = seen.get(vendor);
      if (known === undefined || (known.severity === 'info' && severity === 'warning')) {
        seen.set(vendor, { severity, evidence });
      }
    };
    for (const request of requests) {
      const tracker = findTrackerByUrl(request.url)?.vendor;
      if (tracker !== undefined) {
        note(tracker, 'warning', request.url);
        continue;
      }
      const embed = findEmbed(request.url)?.vendor;
      if (embed !== undefined) {
        const setsCookies = cookieHosts.some(
          (host) => findEmbed(`https://${host}/`)?.vendor === embed,
        );
        note(embed, setsCookies ? 'warning' : 'info', request.url);
        continue;
      }
      const other =
        fontService(request) ?? findCdn(request.url)?.vendor ?? findProvider(request.url)?.vendor;
      if (other !== undefined) note(other, 'info', request.url);
    }
    for (const cookie of cookies) {
      const tracker = findTrackerByCookie(cookie.name, cookie.domain)?.vendor;
      if (tracker !== undefined)
        note(tracker, 'warning', `cookie ${cookie.name} (${cookie.domain})`);
    }

    return [...seen]
      .filter(([vendor, { evidence }]) => !isNamed(text, vendor, evidence))
      .map(
        ([vendor, { severity, evidence }]): Finding => ({
          ruleId: ID,
          severity,
          subject: vendor,
          message: say(lang, {
            en: `The privacy policy does not mention ${vendor}, which the start page uses.`,
            de: `Die Datenschutzerklärung nennt ${vendor} nicht, obwohl die Startseite es nutzt.`,
          }),
          pageUrl: page.finalUrl,
          evidence: [
            say(lang, {
              en: `privacy policy: ${policy.url}`,
              de: `Datenschutzerklärung: ${policy.url}`,
            }),
            evidence,
          ],
          fix: say(lang, {
            en: `Name ${vendor} in the privacy policy, with the purpose, the legal basis and, where it applies, the transfer outside the EU. If the site no longer needs it, remove it instead.`,
            de: `${vendor} in der Datenschutzerklärung nennen, mit Zweck, Rechtsgrundlage und, falls zutreffend, der Übermittlung außerhalb der EU. Wird es nicht mehr gebraucht, stattdessen entfernen.`,
          }),
        }),
      );
  },
};

function fontService(request: RecordedRequest): string | undefined {
  let host: string;
  try {
    host = new URL(request.url).hostname;
  } catch {
    return undefined;
  }
  return FONT_SERVICES.find(({ hosts }) => hosts.some((domain) => hostMatches(host, domain)))
    ?.vendor;
}

/** Lowercase, without spaces, hyphens, dots, underscores and brackets. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[\s\-_.()[\]]+/g, '');
}

/**
 * A name as a whole word, case-insensitive, with any spacing or hyphens between its letters:
 * "googleanalytics" finds "Google Analytics" and "Google-Analytics", "meta" doesn't find
 * "Metadaten".
 */
function wordPattern(name: string): RegExp {
  const letters = [...name].map((char) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(?<![\\p{L}\\p{N}])${letters.join('[\\s\\-_.]*')}(?![\\p{L}\\p{N}])`, 'iu');
}

/** The names a policy may use for a vendor, normalized. */
function namesFor(vendor: string, evidence: string): string[] {
  const names = [vendor, ...(ALIASES[vendor] ?? [])];
  const base = vendor.replace(USAGE_SUFFIX, '');
  names.push(base);
  // "X (Twitter) embed": both "X" and "Twitter".
  for (const part of base.split(/[()]/)) names.push(part);
  try {
    const host = new URL(evidence).hostname;
    names.push(host.replace(/^www\./, ''));
  } catch {
    // A cookie, not a URL.
  }
  return [...new Set(names.map(normalize))].filter((name) => name.length >= 3);
}

function isNamed(text: string, vendor: string, evidence: string): boolean {
  return namesFor(vendor, evidence).some((name) => wordPattern(name).test(text));
}
