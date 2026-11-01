import type { BrowserContext, Request } from 'playwright';
import type {
  CapturePhase,
  CaptureTiming,
  LoadDiagnostic,
  LoadDiagnostics,
  LoadIssueKind,
  RecordedRequest,
  SkipReason,
} from './types.js';

/** Safe for diagnostics and operational logs. Raw URLs remain internal rule input. */
export function diagnosticUrl(raw: string): string {
  try {
    const url = new URL(raw);
    return /^https?:$/.test(url.protocol) ? `${url.origin}/[redacted]` : '[redacted]';
  } catch {
    return '[redacted]';
  }
}

/** Classify known transport codes; never persist arbitrary exception messages. */
export function classifyLoadError(error: unknown): LoadIssueKind {
  const parts: string[] = [];
  let cause = error;
  for (let depth = 0; depth < 4 && cause instanceof Error; depth++) {
    parts.push(cause.message, 'code' in cause ? String(cause.code) : '');
    cause = cause.cause;
  }
  const text = parts.length > 0 ? parts.join(' ') : String(error);
  if (/ERR_NAME_NOT_RESOLVED|ENOTFOUND|EAI_AGAIN/i.test(text)) return 'dns';
  if (/ERR_CERT|ERR_SSL|CERT_|TLS|SELF_SIGNED|UNABLE_TO_VERIFY_LEAF/i.test(text)) return 'tls';
  if (/timeout|timed.?out|ETIMEDOUT/i.test(text)) return 'timeout';
  if (/ERR_CONNECTION|ECONN|ENETUNREACH|EHOSTUNREACH|socket hang up/i.test(text)) {
    return 'connection';
  }
  return 'browser-failure';
}

interface PendingRequest {
  record: RecordedRequest;
  phase: CapturePhase;
  issue?: LoadDiagnostic;
}

/**
 * A fetch or XHR that got its full answer and was aborted while the page's code read it, or never
 * read it. Only that code sees such a response, so nothing the rules look at is missing. A script
 * or stylesheet aborted mid-download is different: the page may lack it, so it still counts.
 */
const isReadAborted = (entry: PendingRequest): boolean =>
  (entry.record.resourceType === 'fetch' || entry.record.resourceType === 'xhr') &&
  entry.record.outcome === 'response' &&
  (entry.record.status ?? 0) < 400;

/**
 * An event stream that answered without error and is still open when observation ends. A
 * request still waiting for its first answer (long polling, a stuck backend) is not one.
 */
const isOpenStream = (entry: PendingRequest): boolean =>
  entry.issue === undefined &&
  entry.record.resourceType === 'eventsource' &&
  entry.record.outcome === 'response' &&
  (entry.record.status ?? 0) < 400;

export class Diagnostics {
  readonly data: LoadDiagnostics = {
    requests: 0,
    skippedRequests: 0,
    failedRequests: 0,
    securityBlockedRequests: 0,
    omittedRequests: 0,
    responses: 0,
    finished: 0,
    failed: 0,
    blocked: 0,
    httpErrors: 0,
    bytes: 0,
    issueCount: 0,
    dropped: 0,
    issues: [],
  };
  phase: CapturePhase = 'before-consent';
  private readonly pending = new Map<Request, PendingRequest>();
  private readonly earlyFailures = new Map<string, LoadDiagnostic[]>();
  /** ERR_ABORTED failures without an adapter reason, waiting for the cancel signal. */
  private readonly unexplained: { url: string; entry: PendingRequest; issue: LoadDiagnostic }[] =
    [];
  private stopped = false;
  /**
   * Set by an adapter network: where a request still open at the end of the capture was waiting.
   * Requests open at stop() become timeouts, and this tells a queue wait from a slow fetch.
   */
  stageOf?: (url: string) => LoadDiagnostic['stage'];
  private readonly phaseIssues = { 'before-consent': 0, 'after-reject': 0 };
  private restricting = 0;

  constructor(
    private readonly maxIssues: number,
    private readonly maxRecords = 5_000,
  ) {}

  attach(context: BrowserContext, records: RecordedRequest[]): void {
    context.on('request', (request) => {
      if (this.stopped) return;
      const record: RecordedRequest = {
        url: request.url(),
        resourceType: request.resourceType(),
        outcome: 'pending',
      };
      if (records.length < this.maxRecords) records.push(record);
      else {
        this.data.omittedRequests++;
        if (this.data.omittedRequests === 1)
          this.add('resource-limit', request.url(), { limit: 'requests' });
      }
      const early = this.earlyFailures.get(request.url());
      const issue = early?.shift();
      if (early?.length === 0) this.earlyFailures.delete(request.url());
      this.pending.set(request, { record, phase: this.phase, ...(issue ? { issue } : {}) });
      this.data.requests++;
    });
    context.on('response', (response) => {
      if (this.stopped) return;
      const entry = this.pending.get(response.request());
      if (entry === undefined) return;
      entry.record.outcome = 'response';
      entry.record.status = response.status();
      this.data.responses++;
      if (response.status() >= 400) {
        this.data.httpErrors++;
        this.add('http-error', response.url(), { status: response.status() }, entry.phase);
      }
    });
    context.on('requestfinished', (request) => this.finish(request));
    context.on('requestfailed', (request) => {
      const entry = this.pending.get(request);
      if (entry === undefined || this.stopped) return;
      this.pending.delete(request);
      const errorText = request.failure()?.errorText;
      const issue = entry.issue ?? {
        kind: classifyLoadError(errorText),
        url: diagnosticUrl(request.url()),
        phase: entry.phase,
      };
      if (entry.issue === undefined && errorText === 'net::ERR_ABORTED' && isReadAborted(entry)) {
        // The answer arrived; the page's code just stopped reading it. Workers and other
        // targets send no cancel signal to this page, so it would otherwise count as a failure.
        this.data.finished++;
        return;
      }
      // Chromium reports a request the page cancelled as ERR_ABORTED, but so does teardown. The
      // text only defers the decision; cancelledByPage() or stop() settles it.
      if (entry.issue === undefined && errorText === 'net::ERR_ABORTED') {
        this.unexplained.push({ url: request.url(), entry, issue });
        return;
      }
      this.settle(entry, issue);
    });
  }

  private settle(entry: PendingRequest, issue: LoadDiagnostic): void {
    entry.record.outcome = 'failed';
    if (issue.skippedReason !== undefined) entry.record.skippedReason = issue.skippedReason;
    this.terminalFailure(issue.kind);
    this.store(issue);
    this.data.failed++;
  }

  /**
   * The browser reported that the page itself cancelled a request to this URL (CDP
   * Network.loadingFailed with canceled). The page no longer wanted the response, so this is
   * not an observation gap; the URL stays in the report as a skipped request.
   */
  cancelledByPage(url: string): void {
    if (this.stopped) return;
    const issue = (phase: CapturePhase): LoadDiagnostic => ({
      kind: 'skipped',
      phase,
      url: diagnosticUrl(url),
      skippedReason: 'cancelled-by-page',
    });
    const index = this.unexplained.findIndex((failure) => failure.url === url);
    if (index !== -1) {
      const [failure] = this.unexplained.splice(index, 1);
      if (failure) this.settle(failure.entry, issue(failure.entry.phase));
      return;
    }
    const sameUrl = [...this.pending].filter(([request]) => request.url() === url);
    // Never relabel a request that already has a reason: a real failure would turn into a
    // non-restricting cancel. With two requests to one URL, the one without a reason is meant.
    const open = sameUrl.find(([, entry]) => entry.issue === undefined);
    if (open !== undefined) {
      open[1].issue = issue(open[1].phase);
      return;
    }
    if (sameUrl.length > 0) return;
    // The cancellation can overtake Playwright's request event; apply it on arrival.
    const early = this.earlyFailures.get(url) ?? [];
    early.push(issue(this.phase));
    this.earlyFailures.set(url, early);
  }

  private finish(request: Request): void {
    if (this.stopped || !this.pending.delete(request)) return;
    this.data.finished++;
  }

  /** Defer storage until requestfailed to avoid counting adapter + browser errors twice. */
  fail(
    request: Request,
    kind: LoadIssueKind,
    limit?: LoadDiagnostic['limit'],
    skippedReason?: SkipReason,
    stage?: LoadDiagnostic['stage'],
  ): void {
    const entry = this.pending.get(request);
    if (entry === undefined) return;
    entry.issue = {
      kind,
      phase: entry.phase,
      url: diagnosticUrl(request.url()),
      ...(limit === undefined ? {} : { limit }),
      ...(skippedReason === undefined ? {} : { skippedReason }),
      ...(stage === undefined ? {} : { stage }),
    };
  }

  failUrl(
    url: string,
    kind: LoadIssueKind,
    limit?: LoadDiagnostic['limit'],
    skippedReason?: SkipReason,
    stage?: LoadDiagnostic['stage'],
  ): void {
    if (this.stopped) return;
    for (const [request, entry] of this.pending) {
      if (request.url() === url && entry.issue === undefined) {
        this.fail(request, kind, limit, skippedReason, stage);
        return;
      }
    }
    // CDP can pause a request before Playwright emits it. Associate the reason on arrival.
    const early = this.earlyFailures.get(url) ?? [];
    early.push({
      kind,
      url: diagnosticUrl(url),
      phase: this.phase,
      ...(limit === undefined ? {} : { limit }),
      ...(skippedReason === undefined ? {} : { skippedReason }),
      ...(stage === undefined ? {} : { stage }),
    });
    this.earlyFailures.set(url, early);
  }

  add(
    kind: LoadIssueKind,
    url: string,
    extra: Pick<LoadDiagnostic, 'status' | 'limit'> = {},
    phase = this.phase,
  ): void {
    if (!this.stopped) this.store({ kind, phase, url: diagnosticUrl(url), ...extra });
  }

  private store(issue: LoadDiagnostic): void {
    this.data.issueCount++;
    // Omitted beacons, requests the page cancelled itself and skipped error reports hide nothing
    // from the rules: their URL is recorded and the page never uses the response. Every other
    // issue limits what the scanner observed.
    if (!isUnrestricting(issue)) {
      this.phaseIssues[issue.phase]++;
      this.restricting++;
    }
    if (this.data.issues.length < this.maxIssues) this.data.issues.push(issue);
    else this.data.dropped++;
  }

  /** Timing of this capture, created on first use. */
  get timing(): CaptureTiming {
    this.data.timing ??= { loadMs: 0, networkIdleMs: 0 };
    return this.data.timing;
  }

  hasIssues(phase: CapturePhase): boolean {
    return this.phaseIssues[phase] > 0;
  }

  /** Issues that limit what the scanner observed: all except omitted beacons and page cancels. */
  get restrictingIssues(): number {
    return this.restricting;
  }

  /** Freeze before closing the context: teardown errors are not resource failures. */
  stop(): void {
    if (this.stopped) return;
    // No cancel signal arrived for these, so they stay what Chromium reported.
    for (const failure of this.unexplained.splice(0)) this.settle(failure.entry, failure.issue);
    for (const [request, entry] of this.pending) {
      if (isOpenStream(entry)) {
        // Server-Sent Events answer once and stay open by design; the page has what it asked for.
        this.data.finished++;
      } else {
        entry.record.outcome = 'failed';
        const stage = this.stageOf?.(request.url());
        const issue = entry.issue ?? {
          kind: 'timeout',
          phase: entry.phase,
          url: diagnosticUrl(request.url()),
          ...(stage === undefined ? {} : { stage }),
        };
        this.terminalFailure(issue.kind);
        this.store(issue);
        this.data.failed++;
      }
    }
    this.pending.clear();
    for (const issues of this.earlyFailures.values()) {
      for (const issue of issues) this.store(issue);
    }
    this.earlyFailures.clear();
    this.stopped = true;
  }

  private terminalFailure(kind: LoadIssueKind): void {
    if (kind === 'security-blocked') {
      this.data.blocked++;
      this.data.securityBlockedRequests = (this.data.securityBlockedRequests ?? 0) + 1;
    } else if (['skipped', 'unsupported-method', 'unsupported-protocol'].includes(kind)) {
      this.data.skippedRequests = (this.data.skippedRequests ?? 0) + 1;
    } else {
      this.data.failedRequests = (this.data.failedRequests ?? 0) + 1;
    }
  }
}

/**
 * Error-monitoring ingest hosts. A page never acts on the response of an error report, so a
 * skipped report hides nothing from the rules. Sentry documents `o<number>.ingest.sentry.io`,
 * `o<number>.ingest.de.sentry.io` and `o<number>.<location>.ingest.sentry.io`
 * (docs.sentry.io/product/security/ip-ranges).
 *
 * Bugsnag sends to `notify.` and `sessions.bugsnag.com`, and to the same names under
 * `bugsnag.smartbear.com` for some organisations (defaults in bugsnag-js packages/core/config.js
 * and client.js; docs.bugsnag.com/platforms/javascript/legacy/faq names both domains).
 *
 * Rollbar posts to `api.rollbar.com` (default `endpoint`,
 * docs.rollbar.com/docs/rollbarjs-configuration-reference).
 *
 * Datadog Browser RUM and Browser Logs post to `browser-intake-<site with dashes>.<tld>`, sometimes
 * with one more label in front, for the sites datadoghq.com, us3/us5/ap1/ap2.datadoghq.com,
 * datadoghq.eu, ddog-gov.com and us2.ddog-gov.com (DataDog/browser-sdk,
 * packages/js-core/src/transport/endpointBuilder.ts and intakeSites.ts).
 */
const ERROR_MONITORING_HOSTS = [
  /^o\d+\.(?:[a-z]+\.)?ingest\.(?:[a-z]+\.)?sentry\.io$/,
  /^(?:notify|sessions)\.bugsnag\.(?:smartbear\.)?com$/,
  /^api\.rollbar\.com$/,
  /^(?:[a-z\d-]+\.)?browser-intake-(?:(?:us3|us5|ap1|ap2)-)?datadoghq\.com$/,
  /^(?:[a-z\d-]+\.)?browser-intake-datadoghq\.eu$/,
  /^(?:[a-z\d-]+\.)?browser-intake-(?:us2-)?ddog-gov\.com$/,
];

const isErrorMonitoring = (url: string): boolean => {
  try {
    const host = new URL(url).hostname;
    return ERROR_MONITORING_HOSTS.some((pattern) => pattern.test(host));
  } catch {
    return false;
  }
};

const isUnrestricting = (issue: LoadDiagnostic): boolean =>
  (issue.kind === 'skipped' &&
    (issue.skippedReason === 'beacon' || issue.skippedReason === 'cancelled-by-page')) ||
  ((issue.kind === 'skipped' || issue.kind === 'unsupported-method') &&
    isErrorMonitoring(issue.url));
