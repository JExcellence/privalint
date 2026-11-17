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
import type { Region } from '../legal.js';
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
 *
 * `exemptionRegion`: the scan's region, passed only where the visitor has not refused. Where that
 * region exempts analytics from consent under conditions privalint can't see from outside, an
 * analytics tool is a warning and the fix names the conditions.
 */
export function trackerFinding(
  hit: TrackerHit,
  lang: Lang,
  texts: TrackerTexts,
  exemptionRegion?: Region,
): Pick<Finding, 'severity' | 'message' | 'fix'> {
  const kind = consentModeKind(hit);
  if (kind === 'granted') {
    return {
      severity: 'error',
      message: say(lang, texts.grantedMessage),
      fix: say(lang, texts.grantedFix ?? texts.fix),
    };
  }
  const exemption =
    hit.tracker.category === 'analytics' && exemptionRegion !== undefined
      ? STATISTICS_EXEMPTION[exemptionRegion]
      : undefined;
  return {
    severity:
      hit.tracker.category === 'tag-manager' || exemption !== undefined ? 'warning' : 'error',
    message: say(lang, kind === 'denied' ? (texts.deniedMessage ?? texts.message) : texts.message),
    fix:
      say(lang, texts.fix) +
      (kind === 'denied' ? say(lang, DENIED_PINGS_NOTE) : '') +
      (exemption === undefined ? '' : say(lang, exemption)),
  };
}

/**
 * Regions that exempt analytics from consent under conditions: the United Kingdom since
 * 05.02.2026 (PECR Sch. A1 para. 5), France for audience measurement (CNIL, délibération
 * n° 2020-091, §§ 49 to 51), Italy for analytics that counts as a technical cookie (Garante,
 * 10.06.2021, § 7.2) and the Netherlands (Art. 11.7a lid 3 sub b Tw). Spain and Poland have no
 * such exemption in law. A refusal or a granted Consent Mode state is never softened.
 */
const STATISTICS_EXEMPTION: Partial<Record<Region, Text>> = {
  uk: {
    en: ' In the UK, analytics may run without consent (PECR Sch. A1 para. 5) only if it collects statistics solely to improve this site, the data is not shared for any other purpose, and visitors are told clearly and can object free of charge. privalint cannot check these conditions; if one is not met, ask for consent.',
    de: ' Im Vereinigten Königreich darf Analyse ohne Einwilligung laufen (PECR Sch. A1 para. 5), wenn sie nur Statistiken zur Verbesserung dieser Website erhebt, die Daten zu keinem anderen Zweck weitergegeben werden und Besucher klar informiert werden und kostenlos widersprechen können. privalint kann diese Bedingungen nicht prüfen; fehlt eine, ist eine Einwilligung nötig.',
    hu: ' Az Egyesült Királyságban az analitika hozzájárulás nélkül is futhat (PECR Sch. A1 para. 5), ha kizárólag a webhely fejlesztését szolgáló statisztikát gyűjt, az adatokat más célra nem adják tovább, és a látogatók egyértelmű tájékoztatást kapnak, valamint ingyenesen tiltakozhatnak. A privalint ezeket a feltételeket nem tudja ellenőrizni; ha bármelyik hiányzik, hozzájárulás szükséges.',
  },
  fr: {
    en: ' In France, audience measurement is exempt from consent (CNIL, délibération n° 2020-091, §§ 49 to 51) only if it serves solely to measure the audience of this site for the publisher alone, produces anonymous statistics, is not combined with other data and does not follow visitors across sites. privalint cannot check this configuration; if it is not met, ask for consent.',
    de: ' In Frankreich ist Reichweitenmessung von der Einwilligung befreit (CNIL, délibération n° 2020-091, §§ 49 bis 51), wenn sie nur der Reichweitenmessung dieser Website für den Betreiber allein dient, anonyme Statistiken erzeugt, nicht mit anderen Daten verknüpft wird und Besucher nicht über Websites hinweg verfolgt. privalint kann diese Konfiguration nicht prüfen; ist sie nicht erfüllt, ist eine Einwilligung nötig.',
    hu: ' Franciaországban a látogatottságmérés mentesül a hozzájárulás alól (CNIL, délibération n° 2020-091, 49-51. pont), ha kizárólag a webhely látogatottságát méri, csak az üzemeltető számára, anonim statisztikát készít, nem kapcsolják össze más adatokkal, és nem követi a látogatókat más webhelyeken. A privalint ezt a beállítást nem tudja ellenőrizni; ha nem teljesül, hozzájárulás szükséges.',
  },
  it: {
    en: ' In Italy, analytics cookies count as technical cookies that need no consent (Garante privacy, cookie guidelines of 10.06.2021, § 7.2) only if they produce aggregate statistics for this site alone, a third-party tool masks at least part of the IP address, and the data is not combined with other data or passed on. privalint cannot check this configuration; if it is not met, ask for consent.',
    de: ' In Italien gelten Analyse-Cookies als technische Cookies ohne Einwilligung (Garante privacy, Cookie-Leitlinien vom 10.06.2021, § 7.2), wenn sie nur aggregierte Statistiken für diese Website erzeugen, ein Drittanbieter-Tool die IP-Adresse mindestens teilweise kürzt und die Daten weder mit anderen Daten verknüpft noch weitergegeben werden. privalint kann diese Konfiguration nicht prüfen; ist sie nicht erfüllt, ist eine Einwilligung nötig.',
    hu: ' Olaszországban az analitikai sütik hozzájárulás nélküli technikai sütinek számítanak (Garante privacy, 2021.06.10-i süti-iránymutatás, 7.2. pont), ha kizárólag a webhelyre vonatkozó összesített statisztikát készítenek, harmadik féltől származó eszköz esetén az IP-cím legalább egy részét elfedik, és az adatokat nem kapcsolják össze más adatokkal és nem adják tovább. A privalint ezt a beállítást nem tudja ellenőrizni; ha nem teljesül, hozzájárulás szükséges.',
  },
  nl: {
    en: " In the Netherlands, analytics may run without consent (Art. 11.7a lid 3 sub b Tw) only if it measures the quality or effectiveness of this site and has little or no impact on the privacy of visitors, for example with shortened IP addresses, no data sharing for the vendor's own purposes and a data processing agreement. privalint cannot check this configuration; if it is not met, ask for consent.",
    de: ' In den Niederlanden darf Analyse ohne Einwilligung laufen (Art. 11.7a lid 3 sub b Tw), wenn sie nur die Qualität oder Wirksamkeit dieser Website misst und kaum oder keine Folgen für die Privatsphäre der Besucher hat, etwa mit gekürzten IP-Adressen, ohne Datenweitergabe für eigene Zwecke des Anbieters und mit Auftragsverarbeitungsvertrag. privalint kann diese Konfiguration nicht prüfen; ist sie nicht erfüllt, ist eine Einwilligung nötig.',
    hu: ' Hollandiában az analitika hozzájárulás nélkül is futhat (Art. 11.7a lid 3 sub b Tw), ha kizárólag a webhely minőségét vagy hatékonyságát méri, és alig vagy egyáltalán nem érinti a látogatók magánszféráját, például rövidített IP-címekkel, a szolgáltató saját céljaira történő adatátadás nélkül és adatfeldolgozási szerződéssel. A privalint ezt a beállítást nem tudja ellenőrizni; ha nem teljesül, hozzájárulás szükséges.',
  },
};

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
