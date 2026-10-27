import type { Lang } from './i18n.js';
import type { Region } from './legal.js';

export type Severity = 'error' | 'warning' | 'info';

export interface RecordedRequest {
  url: string;
  resourceType: string;
  /** Absent on legacy snapshots. Only received responses count as network evidence. */
  outcome?: 'pending' | 'response' | 'failed';
  status?: number;
  /** Set when the network adapter deliberately did not send the request. */
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
export type SkipReason = 'beacon' | 'unsupported-method' | 'unsupported-protocol' | 'policy';

export interface LoadDiagnostic {
  kind: LoadIssueKind;
  phase: CapturePhase;
  /** Origin only: user info, path, query and fragment are never retained. */
  url: string;
  status?: number;
  limit?: 'requests' | 'response-bytes' | 'total-bytes' | 'redirects';
  skippedReason?: SkipReason;
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
}

export type ObservationKind = 'document' | 'network' | 'consent' | 'after-reject';

export interface RuleEvaluation {
  pageId?: string;
  ruleId: string;
  status: 'executed' | 'skipped' | 'not-evaluable';
  reason?: 'disabled' | 'consent-disabled' | 'not-start-page' | 'missing-observation';
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
  | 'reject-clicked-and-reloaded';

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

export interface PageLink {
  href: string;
  text: string;
}

/** A `<link>` element such as preconnect, dns-prefetch or preload. */
export interface ResourceHint {
  rel: string;
  href: string;
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
  /** True once the reject button was clicked and the page reloaded. */
  rejected: boolean;
  /** Requests made and cookies newly set after rejecting, including the reload. */
  afterReject?: { requests: RecordedRequest[]; cookies: RecordedCookie[] };
  /** True only if the reject observation window completed without load issues. */
  afterRejectComplete?: boolean;
  /**
   * After rejecting and reloading: whether a link or button to reopen the consent settings was
   * visible, and its label. Absent if the reject path was not tested, and in reports before 0.5.0.
   */
  settingsControl?: { found: boolean; label?: string };
  error?: string;
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
  links: PageLink[];
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

export type ConsentSummary = Omit<ConsentObservation, 'afterReject'>;

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
  /** Outcome of the consent check on the start page. */
  consent?: ConsentSummary;
  findings: Finding[];
  rules: Array<Omit<Rule, 'check'>>;
  /** Observation coverage, not a legal compliance judgement. */
  coverage?: 'complete' | 'partial';
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
