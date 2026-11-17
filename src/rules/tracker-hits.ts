import {
  type ConsentModeState,
  describeConsentMode,
  grantsStorage,
  readConsentMode,
} from '../consent-mode.js';
import {
  type CookieTracker,
  findTrackerByCookie,
  findTrackerByUrl,
  type TrackerCategory,
} from '../data/trackers.js';
import { huArticle, type Lang, say, type Text } from '../i18n.js';
import { observedRequests } from '../observations.js';
import type { CnameCloak, Finding, RecordedCookie, RecordedRequest, StorageKey } from '../types.js';
import { safeHost } from '../url.js';

const MAX_EVIDENCE = 5;
/** Consent Mode states listed per vendor, so request URLs keep at least two evidence slots. */
const MAX_CONSENT_MODE_STATES = 3;

export interface TrackerHit {
  /** A full tracker for host matches; cookie matches from the generated list have no hosts. */
  tracker: CookieTracker;
  /** Up to five request URLs, cookie names and storage keys, deduplicated. */
  evidence: string[];
  /** The distinct Google Consent Mode states the vendor's requests carried, if any. */
  consentMode?: ConsentModeState[];
}

/**
 * Matches requests, cookies and Web Storage keys against the tracker list, grouped by vendor.
 * Storage keys are looked up like first-party cookies: the vendors and the Open Cookie Database
 * use the same names for both ("cookie / data key").
 */
export function findTrackerHits(
  requests: readonly RecordedRequest[],
  cookies: readonly RecordedCookie[],
  lang: Lang,
  storage: readonly StorageKey[] = [],
  cloaks: readonly CnameCloak[] = [],
): TrackerHit[] {
  const requestLabel = say(lang, { en: 'request', de: 'Anfrage', hu: 'kérés' });
  const hits = new Map<
    string,
    { tracker: CookieTracker; evidence: Set<string>; consentMode: Map<string, ConsentModeState> }
  >();
  const record = (tracker: CookieTracker, evidence: string, url?: string) => {
    const hit = hits.get(tracker.vendor) ?? {
      tracker,
      evidence: new Set<string>(),
      consentMode: new Map<string, ConsentModeState>(),
    };
    hit.evidence.add(evidence);
    const state = url === undefined ? undefined : readConsentMode(url);
    if (state !== undefined) hit.consentMode.set(state.gcs, state);
    hits.set(tracker.vendor, hit);
  };

  for (const request of observedRequests(requests)) {
    const cloak = cloaks.find((entry) => entry.host === safeHost(request.url));
    if (cloak !== undefined) {
      // A first-party subdomain that is a CNAME to a tracker: the tracker, behind the site's name.
      record(
        { vendor: cloak.vendor, category: cloak.category },
        `${requestLabel} ${request.url} (CNAME ${[cloak.host, ...cloak.chain].join(' → ')})`,
        request.url,
      );
      continue;
    }
    const tracker = findTrackerByUrl(request.url);
    if (tracker !== undefined) {
      const host = tracker.proxied ? (safeHost(request.url) ?? '') : '';
      const proxied = tracker.proxied
        ? say(lang, {
            en: ` (proxied through ${host})`,
            de: ` (über ${host} weitergeleitet)`,
            hu: ` (${huArticle(host)} ${host} kiszolgálón keresztül továbbítva)`,
          })
        : '';
      record(tracker, `${requestLabel} ${request.url}${proxied}`, request.url);
    }
  }
  for (const cookie of cookies) {
    const tracker = findTrackerByCookie(cookie.name, cookie.domain);
    if (tracker !== undefined) {
      record(tracker, `cookie ${cookie.name} (${cookie.domain})`);
    }
  }
  for (const { area, name } of storage) {
    const tracker = findTrackerByCookie(name);
    if (tracker !== undefined) {
      record(tracker, `${area === 'local' ? 'localStorage' : 'sessionStorage'} ${name}`);
    }
  }

  return [...hits.values()].map(({ tracker, evidence, consentMode }) => {
    // Granted states first: they decide the message and must not fall to the cap.
    const states = [...consentMode.values()].sort(
      (a, b) => Number(grantsStorage(b)) - Number(grantsStorage(a)),
    );
    // The Consent Mode states lead the evidence, so the cap on request URLs can't hide them.
    const described = states
      .slice(0, MAX_CONSENT_MODE_STATES)
      .map((state) => describeConsentMode(state, lang));
    return {
      tracker,
      evidence: [...described, ...evidence].slice(0, MAX_EVIDENCE),
      ...(states.length === 0 ? {} : { consentMode: states }),
    };
  });
}

/** What a tracker rule says about one vendor; trackerFinding picks by Consent Mode state. */
export interface TrackerTexts {
  message: Text;
  /** When the vendor only sent pings with storage denied. Defaults to `message`. */
  deniedMessage?: Text;
  /** When a request told Google that consent was granted. */
  grantedMessage: Text;
  fix: Text;
  /** When consent was granted. Defaults to `fix`. */
  grantedFix?: Text;
}

/**
 * Severity, message and fix of a tracker finding. A tag manager alone is a warning, since the
 * container may be configured correctly; a request that tells Google consent was granted is an error
 * for any vendor. The fix for pings with storage denied says that they still reach Google.
 */
export function trackerFinding(
  hit: TrackerHit,
  lang: Lang,
  texts: TrackerTexts,
): Pick<Finding, 'severity' | 'message' | 'fix'> {
  const kind = consentModeKind(hit);
  if (kind === 'granted') {
    return {
      severity: 'error',
      message: say(lang, texts.grantedMessage),
      fix: say(lang, texts.grantedFix ?? texts.fix),
    };
  }
  return {
    severity: hit.tracker.category === 'tag-manager' ? 'warning' : 'error',
    message: say(lang, kind === 'denied' ? (texts.deniedMessage ?? texts.message) : texts.message),
    fix: say(lang, texts.fix) + (kind === 'denied' ? say(lang, DENIED_PINGS_NOTE) : ''),
  };
}

/**
 * How a vendor's Google Consent Mode states change its finding: granted storage before or after a
 * choice gets its own message; denied pings are explained, since they still reach Google.
 */
function consentModeKind(hit: TrackerHit): 'granted' | 'denied' | undefined {
  if (hit.consentMode === undefined) return undefined;
  if (hit.consentMode.some(grantsStorage)) return 'granted';
  // "G1--" sets neither type: nothing was denied, so it says nothing about pings.
  const denied = hit.consentMode.some(
    (state) => state.adStorage === false || state.analyticsStorage === false,
  );
  return denied ? 'denied' : undefined;
}

/** Added to the fix when the vendor only sent pings with storage denied. */
const DENIED_PINGS_NOTE: Text = {
  en: ' Consent Mode pings with storage denied still send each page view, with the IP address and browser details, to Google; they do not replace consent.',
  de: ' Google-Consent-Mode-Pings mit abgelehnter Speicherung senden trotzdem jeden Seitenaufruf mit IP-Adresse und Browserdaten an Google; sie ersetzen keine Einwilligung.',
  hu: ' Az elutasított tárolású Consent Mode pingek is elküldenek minden oldalmegtekintést az IP-címmel és a böngésző adataival a Google-nek; nem helyettesítik a hozzájárulást.',
};

const CATEGORY_LABELS: Record<TrackerCategory, Text> = {
  analytics: { en: 'analytics', de: 'Analyse', hu: 'analitika' },
  advertising: { en: 'advertising', de: 'Werbung', hu: 'hirdetés' },
  'session-replay': { en: 'session-replay', de: 'Session-Replay', hu: 'munkamenet-visszajátszás' },
  fingerprinting: { en: 'fingerprinting', de: 'Fingerprinting', hu: 'ujjlenyomat-azonosítás' },
  social: { en: 'social', de: 'Social Media', hu: 'közösségi média' },
  'marketing-automation': {
    en: 'marketing-automation',
    de: 'Marketing-Automatisierung',
    hu: 'marketingautomatizálás',
  },
  'tag-manager': { en: 'tag-manager', de: 'Tag-Manager', hu: 'címkekezelő' },
};

export const categoryLabel = (category: TrackerCategory, lang: Lang) =>
  say(lang, CATEGORY_LABELS[category]);
