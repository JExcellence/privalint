import type { BrowserContext, CDPSession, Page } from 'playwright';
import { classifyLoadError, type Diagnostics } from './diagnostics.js';
import type { LoadDiagnostic, LoadIssueKind, SkipReason } from './types.js';

export interface NetworkRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Uint8Array | null;
  resourceType: string;
  /** Covers execution and body consumption. The adapter must honour cancellation. */
  signal: AbortSignal;
}

export interface NetworkResponse {
  status: number;
  headers?: Record<string, string | string[]>;
  /** Stream bodies to enforce byte limits before buffering the entire response. */
  body?: string | Uint8Array | AsyncIterable<Uint8Array>;
}

/** Fetch exactly ONE HTTP hop, never follow redirects. Caller owns shared transport clients. */
export type NetworkAdapter = (request: NetworkRequest) => Promise<NetworkResponse>;

export interface NetworkLimits {
  concurrency?: number;
  maxRequests?: number;
  maxResponseBytes?: number;
  maxTotalBytes?: number;
  maxRedirects?: number;
  /** Starts on dequeue; queue wait is bounded separately by captureTimeoutMs. */
  requestTimeoutMs?: number;
}

export const NETWORK_DEFAULTS = {
  concurrency: 6,
  maxRequests: 500,
  maxResponseBytes: 5 * 1024 * 1024,
  maxTotalBytes: 20 * 1024 * 1024,
  maxRedirects: 10,
  requestTimeoutMs: 10_000,
} satisfies Required<NetworkLimits>;

export class NetworkError extends Error {
  constructor(
    readonly kind: Exclude<LoadIssueKind, 'http-error'>,
    readonly limit?: LoadDiagnostic['limit'],
    readonly skippedReason?: SkipReason,
  ) {
    super(kind);
    this.name = 'NetworkError';
  }
}

export function networkLimits(options: NetworkLimits = {}): Required<NetworkLimits> {
  const limits = { ...NETWORK_DEFAULTS, ...options };
  for (const [key, value] of Object.entries(limits)) {
    const min = key === 'maxRedirects' ? 0 : 1;
    if (!Number.isSafeInteger(value) || value < min)
      throw new RangeError(`${key} must be a safe integer of at least ${min}`);
  }
  return limits;
}

interface PausedRequest {
  requestId: string;
  /** The Network domain id of the same request, used to match page cancellations. */
  networkId?: string;
  resourceType: string;
  redirectedRequestId?: string;
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    postData?: string;
    hasPostData?: boolean;
    postDataEntries?: Array<{ bytes?: string }>;
  };
}
interface InterceptedRequest {
  event: PausedRequest;
  session: CDPSession;
  redirects: number;
  redirectCounts: Map<string, number>;
}

function requestBody(request: PausedRequest['request']): Uint8Array | null {
  if (request.postDataEntries !== undefined) {
    if (request.postDataEntries.some((entry) => entry.bytes === undefined)) {
      throw new NetworkError('unsupported-method');
    }
    return Buffer.concat(
      request.postDataEntries.map((entry) => Buffer.from(entry.bytes ?? '', 'base64')),
    );
  }
  if (request.postData !== undefined) return Buffer.from(request.postData);
  if (request.hasPostData) throw new NetworkError('unsupported-method');
  return null;
}

function failureKind(error: unknown, signal: AbortSignal, timeout: AbortSignal): LoadIssueKind {
  if (signal.aborted) {
    return signal.reason instanceof DOMException && signal.reason.name === 'TimeoutError'
      ? 'timeout'
      : 'aborted';
  }
  if (timeout.aborted) return 'timeout';
  return error instanceof NetworkError ? error.kind : classifyLoadError(error);
}

/**
 * Reports requests the page cancelled itself, from CDP Network.loadingFailed with canceled.
 * The id is the Network request id, which Fetch.requestPaused also carries as networkId.
 */
export async function watchPageCancellations(
  session: CDPSession,
  onCancel: (networkId: string, url: string) => void,
): Promise<void> {
  const urls = new Map<string, string>();
  session.on('Network.requestWillBeSent', (event) => urls.set(event.requestId, event.request.url));
  session.on('Network.loadingFinished', (event) => urls.delete(event.requestId));
  session.on('Network.loadingFailed', (event) => {
    const url = urls.get(event.requestId);
    urls.delete(event.requestId);
    if (event.canceled === true && url !== undefined) onCancel(event.requestId, url);
  });
  await session.send('Network.enable');
}

/** Chromium Fetch interception includes redirect hops that Playwright route() auto-continues. */
export class ControlledNetwork {
  private readonly queue: InterceptedRequest[] = [];
  private readonly tasks = new Set<Promise<void>>();
  private readonly sessions = new Map<Page, Promise<void>>();
  /** Adapter work in progress by Network request id, so a page cancel can stop it. */
  private readonly inflight = new Map<
    string,
    { controller: AbortController; cancelled: boolean }
  >();
  private active = 0;
  private admitted = 0;
  private closed = false;

  constructor(
    private readonly adapter: NetworkAdapter,
    private readonly limits: Required<NetworkLimits>,
    private readonly diagnostics: Diagnostics,
    private readonly signal: AbortSignal,
  ) {}

  async attach(context: BrowserContext): Promise<void> {
    context.on('page', (page) => {
      void this.attachPage(page).catch(() => this.diagnostics.add('browser-failure', page.url()));
    });
    await context.routeWebSocket('**/*', (socket) => {
      this.diagnostics.add('unsupported-protocol', socket.url());
      socket.close();
    });
  }

  attachPage(page: Page): Promise<void> {
    const existing = this.sessions.get(page);
    if (existing) return existing;
    const attaching = this.intercept(page);
    this.sessions.set(page, attaching);
    return attaching;
  }

  private async intercept(page: Page): Promise<void> {
    const session = await page.context().newCDPSession(page);
    const redirects = new Map<string, number>();
    session.on('Fetch.requestPaused', (event) => {
      const count = event.redirectedRequestId
        ? (redirects.get(event.redirectedRequestId) ?? 0) + 1
        : 0;
      if (event.redirectedRequestId) redirects.delete(event.redirectedRequestId);
      const request = { event, session, redirects: count, redirectCounts: redirects };
      if (this.closed || this.signal.aborted) {
        void this.abort(request, 'aborted');
        return;
      }
      this.admitted++;
      if (this.admitted > this.limits.maxRequests) {
        void this.abort(request, 'resource-limit', 'requests');
        return;
      }
      this.queue.push(request);
      this.pump();
    });
    await watchPageCancellations(session, (networkId, url) => {
      this.diagnostics.cancelledByPage(url);
      const work = this.inflight.get(networkId);
      if (work !== undefined) {
        work.cancelled = true;
        work.controller.abort();
        return;
      }
      // Still waiting for a slot: drop it so the adapter is never asked for it.
      const index = this.queue.findIndex((queued) => queued.event.networkId === networkId);
      const [queued] = index === -1 ? [] : this.queue.splice(index, 1);
      if (queued !== undefined) void this.release(queued);
    });
    await session.send('Fetch.enable', {
      patterns: [{ urlPattern: '*', requestStage: 'Request' }],
    });
  }

  private pump(): void {
    while (!this.closed && !this.signal.aborted && this.active < this.limits.concurrency) {
      const request = this.queue.shift();
      if (request === undefined) return;
      this.active++;
      const task = this.handle(request).finally(() => {
        this.active--;
        this.tasks.delete(task);
        this.pump();
      });
      this.tasks.add(task);
    }
  }

  private async handle(intercepted: InterceptedRequest): Promise<void> {
    const { event, session, redirects, redirectCounts } = intercepted;
    const { request } = event;
    const controller = new AbortController();
    const work = { controller, cancelled: false };
    if (event.networkId !== undefined) this.inflight.set(event.networkId, work);
    const timeout = AbortSignal.timeout(this.limits.requestTimeoutMs);
    const signal = AbortSignal.any([this.signal, timeout, controller.signal]);
    let response: NetworkResponse;
    let body: Buffer;
    try {
      if (!/^https?:$/.test(new URL(request.url).protocol))
        throw new NetworkError('unsupported-protocol');
      if (redirects > this.limits.maxRedirects)
        throw new NetworkError('resource-limit', 'redirects');
      if (this.diagnostics.data.bytes >= this.limits.maxTotalBytes)
        throw new NetworkError('resource-limit', 'total-bytes');
      response = await withSignal(
        this.adapter({
          url: request.url,
          method: request.method,
          headers: request.headers,
          body: requestBody(request),
          resourceType: event.resourceType.toLowerCase(),
          signal,
        }),
        signal,
      );
      body = await this.readBody(response.body, signal);
      signal.throwIfAborted();
      if (!Number.isInteger(response.status) || response.status < 200 || response.status > 599)
        throw new NetworkError('browser-failure');
    } catch (error) {
      // The page cancelled it: Diagnostics already has the reason, only release the request.
      if (work.cancelled) await this.release(intercepted);
      else {
        const kind = failureKind(error, this.signal, timeout);
        await this.abort(
          intercepted,
          kind,
          error instanceof NetworkError ? error.limit : undefined,
          error instanceof NetworkError ? error.skippedReason : undefined,
        );
      }
      return;
    } finally {
      controller.abort();
      if (event.networkId !== undefined) this.inflight.delete(event.networkId);
    }
    if ([301, 302, 303, 307, 308].includes(response.status))
      redirectCounts.set(event.requestId, redirects);
    try {
      await session.send('Fetch.fulfillRequest', {
        requestId: event.requestId,
        responseCode: response.status,
        responseHeaders: Object.entries(response.headers ?? {}).flatMap(([name, value]) =>
          (Array.isArray(value) ? value : [value]).map((item) => ({ name, value: item })),
        ),
        body: body.toString('base64'),
      });
    } catch {
      // Fulfilling fails when Chromium no longer holds the request: the page cancelled it, it
      // navigated, or the context is closing. Playwright reports that request as failed, and
      // Diagnostics classifies it there, so recording a reason here would count it twice.
      await this.release(intercepted);
    }
  }

  /**
   * Lets a paused request go without a diagnostic of its own. `Failed`, not `Aborted`: Chromium
   * marks ERR_ABORTED as canceled, which would look like the page cancelling it.
   */
  private async release(request: InterceptedRequest): Promise<void> {
    await request.session
      .send('Fetch.failRequest', { requestId: request.event.requestId, errorReason: 'Failed' })
      .catch(() => {});
  }

  private async readBody(body: NetworkResponse['body'], signal: AbortSignal): Promise<Buffer> {
    const chunks: Uint8Array[] = [];
    let size = 0;
    const append = (chunk: Uint8Array) => {
      size += chunk.byteLength;
      this.diagnostics.data.bytes += chunk.byteLength;
      if (size > this.limits.maxResponseBytes)
        throw new NetworkError('resource-limit', 'response-bytes');
      if (this.diagnostics.data.bytes > this.limits.maxTotalBytes)
        throw new NetworkError('resource-limit', 'total-bytes');
      chunks.push(chunk);
    };
    if (body === undefined) return Buffer.alloc(0);
    if (typeof body === 'string' || body instanceof Uint8Array) {
      append(typeof body === 'string' ? Buffer.from(body) : body);
    } else {
      const iterator = body[Symbol.asyncIterator]();
      try {
        while (true) {
          const chunk = await withSignal(iterator.next(), signal);
          if (chunk.done) break;
          append(chunk.value);
        }
      } finally {
        void iterator.return?.().catch(() => {});
      }
    }
    return Buffer.concat(chunks, size);
  }

  private async abort(
    request: InterceptedRequest,
    kind: LoadIssueKind,
    limit?: LoadDiagnostic['limit'],
    skippedReason?: SkipReason,
  ): Promise<void> {
    this.diagnostics.failUrl(request.event.request.url, kind, limit, skippedReason);
    await request.session
      .send('Fetch.failRequest', {
        requestId: request.event.requestId,
        errorReason: 'BlockedByClient',
      })
      .catch(() => {});
  }

  async close(): Promise<void> {
    this.closed = true;
    await Promise.all(this.queue.splice(0).map((request) => this.abort(request, 'aborted')));
    await Promise.all(this.tasks);
  }
}

/** Abort without retaining caller reasons or leaving listeners attached. */
export async function withSignal<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    void operation.catch(() => {});
    throw new DOMException('Operation aborted', 'AbortError');
  }
  let onAbort: () => void = () => {};
  const aborted = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(new DOMException('Operation aborted', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
  });
  try {
    return await Promise.race([operation, aborted]);
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
}
