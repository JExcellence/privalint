import type { Lang } from './i18n.js';
import type { Region } from './legal.js';

export type Severity = 'error' | 'warning' | 'info';

export interface RecordedRequest {
  url: string;
  resourceType: string;
  /** Absent on legacy snapshots. Only received responses count as network evidence. */
  outcome?: 'pending' | 'response' | 'failed';
  status?: number;
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
  | 'aborted';

export type CapturePhase = 'before-consent' | 'after-reject';

export interface LoadDiagnostic {
  kind: LoadIssueKind;
  phase: CapturePhase;
  /** Origin only: user info, path, query and fragment are never retained. */
  url: string;
  status?: number;
  limit?: 'requests' | 'response-bytes' | 'total-bytes' | 'redirects';
}

export interface LoadDiagnostics {
  /** HTTP(S) browser requests, including documents and every redirect hop, across both phases. */
  requests: number;
  /** Requests counted but omitted from bounded in-memory rule evidence. */
  omittedRequests: number;
  /** Received HTTP responses, including redirects and HTTP errors; may overlap failed. */
  responses: number;
  /** Browser requestfinished events (including HTTP errors). */
  finished: number;
  /** Failed or unfinished requests at capture end; disjoint from finished. */
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
  ruleId: string;
  status: 'executed' | 'skipped' | 'not-evaluable';
  reason?: 'disabled' | 'consent-disabled' | 'not-start-page' | 'missing-observation';
  /** Executed against available positive evidence, without ruling out additional findings. */
  partial: boolean;
}

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
  error?: string;
}

/**
 * Everything observed while loading one page in a fresh browser context,
 * without touching any consent banner.
 */
export interface PageSnapshot {
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
