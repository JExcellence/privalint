import type { Lang } from './i18n.js';
import type { Region } from './legal.js';

export type Severity = 'error' | 'warning' | 'info';

export interface RecordedRequest {
  url: string;
  resourceType: string;
  /** Absent on legacy snapshots. Only received responses count as network evidence. */
  outcome?: 'pending' | 'response' | 'failed';
  status?: number;
  /** Set when the request was deliberately not completed: by the adapter, or by the page itself. */
  skippedReason?: SkipReason;
}

export type LoadIssueKind =
  | 'security-blocked'
  | 'unsupported-method'
  | 'unsupported-protocol'
  | 'dns'
  | 'tls'
  | 'connection'
  | 'timeout'
  | 'resource-limit'
  | 'http-error'
  | 'browser-failure'
  | 'skipped'
  | 'aborted';

export type CapturePhase = 'before-consent' | 'after-reject';
export type SkipReason =
  | 'beacon'
  | 'unsupported-method'
  | 'unsupported-protocol'
  | 'policy'
  /** The page aborted the request itself, e.g. a framework cancelling a prefetch. */
  | 'cancelled-by-page';

export interface LoadDiagnostic {
  kind: LoadIssueKind;
  phase: CapturePhase;
  /** Origin only: user info, path, query and fragment are never retained. */
  url: string;
  status?: number;
  limit?: 'requests' | 'response-bytes' | 'total-bytes' | 'redirects';
  skippedReason?: SkipReason;
  /**
   * Adapter scans only, on timeouts: whether the request was still waiting for an adapter slot
   * or the adapter was fetching it. The two have separate budgets. Since schema 1.4.0.
   */
  stage?: 'queued' | 'fetching';
}

/** Where the time of one page capture went. Durations in milliseconds. Since schema 1.4.0. */
export interface CaptureTiming {
  /** From navigation start until the load event. */
  loadMs: number;
  /** From the load event until the network was idle, or the wait gave up. */
  networkIdleMs: number;
  /** Adapter scans only: most requests waiting for an adapter slot at the same time. */
  peakQueued?: number;
  /** Adapter scans only: how long the adapter took. Since scanner 0.10.0. */
  adapter?: AdapterTiming;
}

/** How long the network adapter took for the requests of one capture, in milliseconds. */
export interface AdapterTiming {
  /** Requests the adapter was asked for. */
  requests: number;
  /** Median and 95th percentile time from asking the adapter to its response headers. */
  headersP50Ms?: number;
  headersP95Ms?: number;
  /** The slowest requests, by time from being queued until done or given up. At most 5. */
  slowest: AdapterRequestTiming[];
}

export interface AdapterRequestTiming {
  /** Origin only, like issue URLs. */
  url: string;
  /** Waiting for one of the adapter slots (`networkLimits.concurrency`). */
  queuedMs: number;
  /** Until the adapter returned status and headers. Absent when it never did. */
  headersMs?: number;
  /** Reading the body after the headers. Absent when it never finished. */
  bodyMs?: number;
}

export interface LoadDiagnostics {
  /** Disjoint terminal outcomes; finished + these three equals requests. */
  skippedRequests?: number;
  failedRequests?: number;
  securityBlockedRequests?: number;
  /** HTTP(S) browser requests, including documents and every redirect hop, across both phases. */
  requests: number;
  /** Requests counted but omitted from bounded in-memory rule evidence. */
  omittedRequests: number;
  /** Received HTTP responses, including redirects and HTTP errors; may overlap failed. */
  responses: number;
  /** Browser requestfinished events (including HTTP errors). */
  finished: number;
  /** @deprecated Aggregate of skippedRequests + failedRequests + securityBlockedRequests. */
  failed: number;
  /** Subset of failed: explicitly denied by the adapter's security policy. */
  blocked: number;
  /** Subset of responses: status >= 400. */
  httpErrors: number;
  /** Adapter response-body bytes consumed, including the chunk exceeding a limit. */
  bytes: number;
  /** All issues, even when their details exceed the storage cap. */
  issueCount: number;
  dropped: number;
  issues: LoadDiagnostic[];
  timing?: CaptureTiming;
}

export type ObservationKind =
  | 'document'
  | 'network'
  | 'consent'
  | 'after-reject'
  /** Since schema 1.3.0. */
  | 'after-settings'
  /** The start page was searched for a banner, found or not. Since schema 1.4.0. */
  | 'banner-search'
  /** How the start page travels: HTTPS, HSTS, plain HTTP. Native scans only. Since 1.4.0. */
  | 'transport'
  /** The legal notice or privacy policy the start page links, loaded separately. Since 1.5.0. */
  | 'linked-page';

export interface RuleEvaluation {
  pageId?: string;
  ruleId: string;
  status: 'executed' | 'skipped' | 'not-evaluable';
  reason?:
    | 'disabled'
    | 'consent-disabled'
    | 'not-start-page'
    | 'missing-observation'
    /** No banner, and nothing that needs consent loaded before a choice. */
    | 'no-consent-needed'
    /** The settings-layer check is opt-in. Since schema 1.3.0. */
    | 'settings-check-disabled'
    /** Adapter and offline scans make no extra request to http://. Since schema 1.4.0. */
    | 'transport-not-checked'
    /** The start page links no such page on the same site. Since schema 1.5.0. */
    | 'no-linked-page';
  /** Executed against available positive evidence, without ruling out additional findings. */
  partial: boolean;
  outcome?: 'checked-no-finding' | 'finding-detected' | 'not-evaluable';
  explanation?: RuleExplanation;
  findingCount?: number;
}

export type RuleExplanation =
  | 'disabled'
  | 'not-start-page'
  | 'consent-disabled'
  | 'no-consent-needed'
  | 'missing-reject-observation'
  | 'missing-consent-observation'
  | 'incomplete-document'
  | 'positive-evidence'
  | 'incomplete-observation'
  | 'required-observations-available'
  | 'no-supported-banner'
  | 'no-supported-reject-control'
  | 'unsupported-banner-markup'
  | 'browser-interaction-failed'
  | 'reject-clicked-and-reloaded'
  // Since schema 1.3.0:
  | 'settings-check-disabled'
  | 'missing-settings-observation'
  | 'no-settings-control'
  | 'no-save-control'
  | 'settings-saved-and-reloaded'
  // Since schema 1.4.0:
  | 'banner-not-shown'
  | 'transport-not-checked'
  // Since schema 1.5.0:
  | 'no-linked-page'
  | 'linked-page-not-loaded';

export interface CaptureObservation {
  complete: boolean;
  /** Loading coverage before the consent interaction, for pre-consent rule evaluation. */
  beforeConsentComplete?: boolean;
  document: boolean;
  diagnostics: LoadDiagnostics;
}

export interface RecordedCookie {
  name: string;
  domain: string;
  path: string;
  /** Unix time in seconds, -1 for session cookies. */
  expires: number;
}

export interface TransportObservation {
  /** The start page itself was served over HTTPS. */
  https: boolean;
  /** A Strict-Transport-Security header with a positive max-age. Only with https. */
  hsts?: boolean;
  /** http://<host>/ redirects to HTTPS or isn't served at all. Absent when it couldn't be checked. */
  httpRedirectsToHttps?: boolean;
}

/** A Web Storage key of the page's origin; only its name is recorded. */
export interface StorageKey {
  area: 'local' | 'session';
  name: string;
}

export interface PageLink {
  href: string;
  text: string;
}

/** A visible form that collects personal data. Only its structure, never its contents. */
export interface FormObservation {
  /** A password field makes it a login; an email or phone field a contact or sign-up form. */
  kind: 'login' | 'contact';
  /** A link to the privacy policy in the form or right around it. */
  privacyNearby: boolean;
  /** Labels of the checkboxes ticked when the page loaded, at most five, cut to 120 characters. */
  checkedBoxes?: string[];
  /** An http:// address the form or one of its submit buttons sends to. */
  httpAction?: string;
}

/** A `<link>` element such as preconnect, dns-prefetch or preload. */
export interface ResourceHint {
  rel: string;
  href: string;
}

/** How a banner control is rendered, measured from its box and computed styles. */
export interface ControlLook {
  /** "button" if it has a visible background or border, "text" if it is shown as plain text. */
  style: 'button' | 'text';
  /** Rendered size in CSS pixels. */
  width: number;
  height: number;
  /** Contrast of the text against the background behind it; absent if it can't be computed. */
  contrast?: number;
}

/** What happened when privalint looked for a consent banner and clicked "reject". */
export interface ConsentObservation {
  outcome?: 'no-banner-detected' | 'unsupported-banner' | 'interaction-failed' | 'reject-succeeded';
  reason?:
    | 'no-supported-banner'
    | 'no-supported-reject-control'
    | 'unsupported-banner-markup'
    | 'browser-interaction-failed'
    | 'reject-clicked-and-reloaded';
  state?: 'not-detected' | 'reject-unavailable' | 'interaction-failed' | 'reject-tested';
  bannerFound: boolean;
  /** Name of the consent manager, if it was recognised. */
  cmp?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  /** The banner offers "accept" or "subscribe" instead of "reject". */
  payOrOk?: boolean;
  /**
   * How long privalint kept looking for a banner after the page had settled, in milliseconds:
   * 0 if it was there at once, about one settle period if none appeared. Since schema 1.4.0.
   */
  bannerWaitMs?: number;
  /** Links inside the banner. Internal input for banner-legal-links, not in the report. */
  bannerLinks?: PageLink[];
  /** Whether the open banner keeps the visitor from the rest of the page. Internal. */
  bannerBlocking?: boolean;
  /** How the first-layer accept and reject controls look. Internal input for reject-less-prominent. */
  bannerControls?: { accept: ControlLook; reject: ControlLook };
  /** True once the reject button was clicked and the page reloaded. */
  rejected: boolean;
  /** Requests made and cookies newly set after rejecting, including the reload. */
  afterReject?: { requests: RecordedRequest[]; cookies: RecordedCookie[]; storage?: StorageKey[] };
  /** True only if the reject observation window completed without load issues. */
  afterRejectComplete?: boolean;
  /**
   * After rejecting and reloading: whether a link or button to reopen the consent settings was
   * visible, and its label. Absent if the reject path was not tested, and in reports before 0.5.0.
   */
  settingsControl?: { found: boolean; label?: string };
  /**
   * What an IAB TCF consent manager reports through `__tcfapi('getTCData')` after rejecting and
   * reloading. Absent without a TCF API or an answer. Since schema 1.4.0.
   */
  tcf?: TcfObservation;
  /** Only present when the settings-layer check ran. Since schema 1.3.0. */
  settings?: SettingsObservation;
  error?: string;
}

/**
 * What happened when privalint opened the banner's settings layer in a fresh browser context,
 * switched off every optional category and saved.
 */
export interface SettingsObservation {
  /** `banner-not-shown` since schema 1.4.0. */
  outcome:
    | 'no-settings-control'
    | 'no-save-control'
    | 'interaction-failed'
    | 'saved'
    | 'banner-not-shown';
  reason:
    | 'no-settings-control'
    | 'no-save-control'
    | 'browser-interaction-failed'
    | 'settings-saved-and-reloaded'
    /** The banner showed in the first browser context but not in the fresh one. */
    | 'banner-not-shown';
  /** Label of the control that opened the settings layer. */
  openLabel?: string;
  /** Label of the control that saved the selection. */
  saveLabel?: string;
  /** How many checked category switches privalint turned off before saving. */
  switchedOff?: number;
  /**
   * Labels of optional categories that were already on when the settings layer opened, and of
   * radio levels wider than necessary-only that were preselected. Since scanner 0.10.0.
   */
  preselected?: string[];
  /**
   * The legitimate-interest tab of a TCF banner, if there was one: its label, the "object to all"
   * button used, or how many of its switches were turned off. Since schema 1.4.0.
   */
  legitimateInterest?: { openLabel: string; objectAllLabel?: string; switchedOff: number };
  /** Requests made and cookies newly set after saving, including the reload. */
  afterSave?: { requests: RecordedRequest[]; cookies: RecordedCookie[]; storage?: StorageKey[] };
  /** True only if the observation window after saving completed without load issues. */
  afterSaveComplete?: boolean;
  /**
   * What an IAB TCF consent manager reports through `__tcfapi('getTCData')` after saving and
   * reloading. Absent when the page has no TCF API or it did not answer. Since schema 1.4.0.
   */
  tcf?: TcfObservation;
  error?: string;
}

/** TCF purposes and vendors that are still on after switching everything off. */
export interface TcfObservation {
  /** Purpose ids with consent still given. */
  purposesOn: number[];
  /** Purpose ids still processed on the basis of legitimate interest. */
  legitimateInterestsOn: number[];
  /** Number of vendors with consent still given. */
  vendorConsents: number;
  /** Number of vendors still relying on legitimate interest. */
  vendorLegitimateInterests: number;
}

/** Why a linked page was not read: no such link on the same site, or the load failed. */
export type LinkedPageMissing = 'no-link' | 'not-loaded';

/** A page the start page links to, kept as text: the legal notice or the privacy policy. */
export interface LinkedPageText {
  /** Where the page ended up. */
  url: string;
  /** Visible text, cut to 100,000 characters. */
  text: string;
  /** Whether the page links a mailto: address. */
  mailto: boolean;
  /** Linked parts that could not be read, such as a cookie policy in a PDF. */
  unread?: string[];
  /** Privacy policy only: further privacy documents it links that were not read, at most three. */
  linkedDocuments?: string[];
  /** False when a request of the page never finished: what's missing may not have loaded. */
  complete?: boolean;
  /**
   * Set when the page was read in place of a missing legal notice: a page behind a vague legal
   * link ("Rechtliche Hinweise"), or the privacy policy.
   */
  readAs?: { source: 'legal-link'; label: string } | { source: 'privacy-policy' };
}

/**
 * Everything observed while loading one page in a fresh browser context,
 * without touching any consent banner.
 */
export interface PageSnapshot {
  pageId?: string;
  url: string;
  finalUrl: string;
  status: number | null;
  requests: RecordedRequest[];
  /** Initial-phase request count, including records beyond the retained evidence cap. */
  requestCount?: number;
  cookies: RecordedCookie[];
  /** Forms that collect personal data. Internal input for form-privacy-notice. */
  forms?: FormObservation[];
  /** Scripts, images, frames and stylesheets the page references over http://, at most ten. */
  insecureResources?: string[];
  /** The referrer policy the page sets by response header and by meta tag, as written. */
  referrerPolicy?: { header?: string; meta?: string };
  /** Start page in native scans only: how it travels. */
  transport?: TransportObservation;
  /** localStorage and sessionStorage key names of the page's origin, never values. */
  storage?: StorageKey[];
  links: PageLink[];
  /** The page's own text, when the capture was asked to keep it. Internal. */
  pageText?: LinkedPageText;
  /**
   * Start page only: text of the page it links as its legal notice, loaded separately. Internal
   * input for legal-notice-content, not in the report.
   */
  legalNotice?: LinkedPageText;
  /**
   * Start page only: text of its privacy policy, and of a cookie policy that one links, loaded
   * separately. Internal input for privacy-policy-vendors, not in the report.
   */
  privacyPolicy?: LinkedPageText;
  /** Start page only: why the legal notice or privacy policy was not read. Internal. */
  linkedPageMissing?: { legalNotice?: LinkedPageMissing; privacyPolicy?: LinkedPageMissing };
  /** Primary language subtag of `<html lang>`, lowercase, such as `en` or `hu`. */
  language?: string;
  resourceHints: ResourceHint[];
  /** Only present on the start page, unless the consent check was skipped. */
  consent?: ConsentObservation;
  /** Set when the page could not be loaded, e.g. a download or a timeout. */
  error?: string;
  capture?: CaptureObservation;
}

export interface Finding {
  pageId?: string;
  /** Explicit local policy, not evidence of consent or legal approval. */
  policy?: { allowed: boolean; originalSeverity: Severity };
  ruleId: string;
  severity: Severity;
  message: string;
  pageUrl: string;
  evidence: string[];
  fix?: string;
  /** What the finding is about, e.g. a vendor. Keeps fingerprints stable across runs. */
  subject?: string;
  /** Legal basis in the country the scan was run for. */
  references?: string[];
}

export interface RuleContext {
  siteUrl: URL;
  page: PageSnapshot;
  /** Language for messages and fixes. */
  lang: Lang;
  /** Legal profile of the scan. Absent when a custom caller doesn't pass one. */
  region?: Region;
}

export interface Rule {
  id: string;
  title: string;
  description: string;
  /** Laws, rulings or guidelines the rule is based on. */
  references: string[];
  /** Observations needed by custom rules. Missing means a complete document is required. */
  requires?: readonly ObservationKind[];
  check(context: RuleContext): Finding[];
}

export interface PageSummary {
  pageId?: string;
  url: string;
  finalUrl: string;
  status: number | null;
  requestCount: number;
  cookieCount: number;
  error?: string;
  capture?: CaptureObservation;
  ruleEvaluations?: RuleEvaluation[];
}

export type ConsentSummary = Omit<ConsentObservation, 'afterReject' | 'settings'> & {
  settings?: Omit<SettingsObservation, 'afterSave'>;
};

export interface ScanResult {
  scanId?: string;
  /** Absent on reports created before schema versioning. */
  schemaVersion?: string;
  scannerVersion?: string;
  options?: ReportOptions;
  siteUrl: string;
  lang: Lang;
  region: Region;
  scannedAt: string;
  durationMs: number;
  pages: PageSummary[];
  /**
   * Crawled links that redirected to another site. They are not scanned as part of the site and
   * don't count against maxPages. Absent when there were none.
   */
  offSiteRedirects?: OffSiteRedirect[];
  /** Each selected rule across all pages. Since scanner 0.10.0. */
  ruleSummary?: RuleSummary[];
  /**
   * `summary` when the per-page `ruleEvaluations` were left out on purpose (`--evaluations
   * summary`); `ruleSummary` then holds the result. Absent means full.
   */
  evaluations?: 'full' | 'summary';
  /**
   * Consent checks on the first page of other hosts of the site, by host. Absent when there were
   * none. Since scanner 0.10.0.
   */
  consentByHost?: Record<string, ConsentSummary>;
  /**
   * Every host outside the site that answered a request, busiest first, at most 200. Absent when
   * there was none, and in reports before schema 1.5.0.
   */
  thirdParties?: ThirdPartyHost[];
  /** Outcome of the consent check on the start page. */
  consent?: ConsentSummary;
  findings: Finding[];
  rules: Array<Omit<Rule, 'check'>>;
  /** Observation coverage, not a legal compliance judgement. */
  coverage?: 'complete' | 'partial';
}

export interface RuleSummary {
  ruleId: string;
  /** Pages per outcome. Skipped pages are counted by reason instead. */
  findingDetected: number;
  checkedNoFinding: number;
  notEvaluable: number;
  skipped: Partial<Record<NonNullable<RuleEvaluation['reason']>, number>>;
  /** Page IDs (or URLs without IDs) worth a look. */
  findingPages: string[];
  notEvaluablePages: string[];
  partialPages: string[];
}

export interface OffSiteRedirect {
  url: string;
  finalUrl: string;
}

export type RuleSettings = Record<string, Severity | 'off'>;
export interface ScanProgressEvent {
  stage:
    | 'starting'
    | 'loading-page'
    | 'checking-consent'
    | 'page-captured'
    | 'evaluating-rules'
    | 'completed';
  /** Random attempt ID; multiple redirecting attempts may resolve to the same pageId. */
  captureId?: string;
  pageId?: string;
  scanId?: string;
  elapsedMs: number;
  /** Origin-only, no target path, credentials, query or fragment. */
  pageUrl?: string;
  pageIndex?: number;
}

export interface ReportOptions {
  maxPages: number;
  /** Absent in reports from scanners before 0.5.0. */
  concurrency?: number;
  settleMs: number;
  timeoutMs: number;
  locale: string;
  lang: Lang;
  region: Region;
  consentCheck: boolean;
  /** Absent in reports before schema 1.3.0. */
  settingsCheck?: boolean;
  /** Absent in reports from scanners before 0.10.0, which checked only the main host. */
  hostChecks?: 'each' | 'main';
  /** The emulated Playwright device, when the scan used one. Absent before schema 1.5.0. */
  device?: string;
  headed: boolean;
  channel: string;
  /** Absent in reports from scanners before 0.5.0. */
  sandbox?: boolean;
  captureTimeoutMs: number | null;
  maxDiagnostics: number;
  failureMode: 'throw' | 'report';
  captureMode: 'native' | 'adapter' | 'offline-fixture';
  networkLimits: Record<string, number> | null;
  selectedRules: string[];
  ruleSettings: RuleSettings;
  allowedVendors: string[];
}

export type ThirdPartyPhase = 'before-consent' | 'after-reject' | 'after-settings';

/** One host outside the site, with what privalint knows about it. Hosts only, never paths. */
export interface ThirdPartyHost {
  host: string;
  /** Registrable domain (eTLD+1), or the host itself when it has none. */
  site: string;
  /** The page where the host was first seen. */
  firstPageId?: string;
  phases: ThirdPartyPhase[];
  /** Requests that got a response, over all pages and phases. */
  requests: number;
  /** The vendor privalint's lists name for it; absent for hosts on no list. */
  vendor?: string;
}
