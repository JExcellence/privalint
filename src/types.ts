export type Severity = 'error' | 'warning' | 'info';

export interface RecordedRequest {
  url: string;
  resourceType: string;
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
  cookies: RecordedCookie[];
  links: PageLink[];
  resourceHints: ResourceHint[];
  /** Only present on the start page, unless the consent check was skipped. */
  consent?: ConsentObservation;
  /** Set when the page could not be loaded, e.g. a download or a timeout. */
  error?: string;
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
}

export interface RuleContext {
  siteUrl: URL;
  page: PageSnapshot;
}

export interface Rule {
  id: string;
  title: string;
  description: string;
  /** Laws, rulings or guidelines the rule is based on. */
  references: string[];
  check(context: RuleContext): Finding[];
}

export interface PageSummary {
  url: string;
  finalUrl: string;
  status: number | null;
  requestCount: number;
  cookieCount: number;
  error?: string;
}

export type ConsentSummary = Omit<ConsentObservation, 'afterReject'>;

export interface ScanResult {
  siteUrl: string;
  scannedAt: string;
  durationMs: number;
  pages: PageSummary[];
  /** Outcome of the consent check on the start page. */
  consent?: ConsentSummary;
  findings: Finding[];
  rules: Array<Omit<Rule, 'check'>>;
}
