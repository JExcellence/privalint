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

export interface ScanResult {
  siteUrl: string;
  scannedAt: string;
  durationMs: number;
  pages: PageSummary[];
  findings: Finding[];
  rules: Array<Omit<Rule, 'check'>>;
}
