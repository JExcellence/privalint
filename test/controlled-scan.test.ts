import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { describe, expect, it } from 'vitest';
import { assessCoverage } from '../src/coverage.js';
import { classifyLoadError, diagnosticUrl } from '../src/diagnostics.js';
import { type NetworkAdapter, NetworkError } from '../src/network.js';
import type { ScanOptions } from '../src/scanner.js';
import { scan } from '../src/scanner.js';

const origin = 'https://scanner.invalid';
const links = '<a href="/impressum">Impressum</a><a href="/privacy">Datenschutz</a>';
const html = (body = '') => ({
  status: 200,
  headers: { 'content-type': 'text/html' },
  body: `<!doctype html>${links}${body}`,
});
const settings: ScanOptions = { settleMs: 0, timeoutMs: 3_000, captureTimeoutMs: 10_000 };

describe('https-transport in adapter scans', () => {
  it('is skipped by design and keeps the coverage complete', async () => {
    const result = await scan(origin, { ...settings, networkAdapter: async () => html() });
    expect(result.pages[0]?.ruleEvaluations).toContainEqual(
      expect.objectContaining({ ruleId: 'https-transport', reason: 'transport-not-checked' }),
    );
    expect(result.coverage).toBe('complete');
    expect(assessCoverage(result).complete).toBe(true);
  });
});

describe('labels in link fixes', () => {
  it('follow the language the page declares, not only the region', async () => {
    const result = await scan(origin, {
      ...settings,
      region: 'hu',
      networkAdapter: async () => ({
        status: 200,
        headers: { 'content-type': 'text/html' },
        body: '<!doctype html><html lang="en-GB"><a href="/about">About</a></html>',
      }),
    });
    const fix = (ruleId: string) => result.findings.find((f) => f.ruleId === ruleId)?.fix;
    expect(fix('impressum-link')).toContain('"Legal notice"');
    expect(fix('privacy-policy-link')).toContain('"Privacy policy"');
  });
});

describe('links that redirect to another site', () => {
  it('are listed, not scanned, and leave room for site pages', async () => {
    const result = await scan(origin, {
      ...settings,
      maxPages: 2,
      networkAdapter: async ({ url }) => {
        const { host, pathname } = new URL(url);
        if (pathname === '/repo') {
          return { status: 302, headers: { location: 'https://code.invalid/org/repo' } };
        }
        if (host === 'code.invalid') {
          return {
            ...html('<script src="https://www.google-analytics.com/analytics.js"></script>'),
            headers: { 'content-type': 'text/html', 'set-cookie': '_octo=1; Path=/' },
          };
        }
        // The redirecting link comes first, so it is crawled before /about.
        const body = pathname === '/' ? '<a href="/repo">Repo</a><a href="/about">About</a>' : '';
        return { ...html(), body: `<!doctype html>${body}${links}` };
      },
    });
    expect(result.pages.map((page) => new URL(page.url).host)).toEqual([
      'scanner.invalid',
      'scanner.invalid',
    ]);
    expect(result.offSiteRedirects).toEqual([
      { url: 'https://scanner.invalid/[redacted]', finalUrl: 'https://code.invalid/[redacted]' },
    ]);
    expect(result.findings.filter((finding) => finding.ruleId === 'pre-consent-trackers')).toEqual(
      [],
    );
    expect(result.coverage).toBe('complete');
  });
});

describe('requests from iframes and workers', () => {
  // A cross-origin iframe runs in its own renderer process (site isolation) and a worker is its own
  // target; both must still go through the adapter, never around it.
  const frameOrigin = 'https://frame.invalid';
  const pages: Record<
    string,
    ReturnType<typeof html> | { status: number; headers: Record<string, string>; body: string }
  > = {
    [`${origin}/`]: html(
      `<iframe src="${frameOrigin}/"></iframe>` + '<script>new Worker("/worker.js")</script>',
    ),
    [`${frameOrigin}/`]: html(`<script src="${frameOrigin}/inner.js"></script>`),
    [`${frameOrigin}/inner.js`]: {
      status: 200,
      headers: { 'content-type': 'text/javascript' },
      body: '',
    },
    [`${origin}/worker.js`]: {
      status: 200,
      headers: { 'content-type': 'text/javascript' },
      body: 'fetch("/from-worker")',
    },
    [`${origin}/from-worker`]: { status: 200, headers: { 'content-type': 'text/plain' }, body: '' },
  };

  it('sends every iframe and worker request through the adapter', async () => {
    const seen: string[] = [];
    const result = await scan(origin, {
      ...settings,
      settleMs: 500,
      consentCheck: false,
      networkAdapter: async ({ url }) => {
        seen.push(url);
        return pages[url] ?? { status: 404, body: '' };
      },
    });
    expect(seen).toEqual(
      expect.arrayContaining([
        `${frameOrigin}/`,
        `${frameOrigin}/inner.js`,
        `${origin}/worker.js`,
        `${origin}/from-worker`,
      ]),
    );
    expect(result.pages[0]?.capture?.diagnostics.issues).toEqual([]);
  });
});

describe('controlled capture', () => {
  it('queues a burst of 48 requests instead of rejecting busy slots', async () => {
    let active = 0;
    let peak = 0;
    let calls = 0;
    const adapter: NetworkAdapter = async ({ url, signal }) => {
      calls++;
      active++;
      peak = Math.max(peak, active);
      try {
        await delay(10, undefined, { signal });
        return url === `${origin}/`
          ? html(
              Array.from(
                { length: 47 },
                (_, i) => `<script async src="/resource-${i}.js"></script>`,
              ).join(''),
            )
          : { status: 200, body: '', headers: { 'content-type': 'text/javascript' } };
      } finally {
        active--;
      }
    };
    const result = await scan(origin, {
      ...settings,
      networkAdapter: adapter,
      networkLimits: { concurrency: 2 },
    });
    expect(calls).toBe(48);
    expect(peak).toBe(2);
    expect(active).toBe(0);
    expect(result.pages[0]?.capture).toMatchObject({
      complete: true,
      diagnostics: {
        requests: 48,
        responses: 48,
        finished: 48,
        failed: 0,
        issueCount: 0,
      },
    });
    expect(result.findings).toEqual([]);
  });

  it('explains 21 failed requests without converting safety blocks to findings', async () => {
    const adapter: NetworkAdapter = async ({ url }) => {
      if (url === `${origin}/`)
        return html(
          Array.from(
            { length: 47 },
            (_, i) =>
              `<script async src="https://${i < 21 ? 'fonts.googleapis.com' : 'assets.invalid'}/private/${i}?token=SECRET"></script>`,
          ).join(''),
        );
      if (url.includes('fonts.googleapis.com')) throw new NetworkError('security-blocked');
      return { status: 200, body: '' };
    };
    const result = await scan(`${origin}/?token=SECRET`, {
      ...settings,
      // Use the same fixture for a credential-bearing start URL.
      networkAdapter: (request) =>
        adapter({ ...request, url: request.url.startsWith(origin) ? `${origin}/` : request.url }),
      maxDiagnostics: 5,
    });
    expect(result.pages[0]?.capture).toMatchObject({
      complete: false,
      diagnostics: {
        requests: 48,
        responses: 27,
        finished: 27,
        failed: 21,
        blocked: 21,
        issueCount: 21,
        dropped: 16,
      },
    });
    expect(result.findings).toEqual([]);
    expect(result.coverage).toBe('partial');
    expect(result.consent?.state).toBe('not-detected');
    expect(result.pages[0]?.ruleEvaluations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: 'impressum-link', status: 'not-evaluable' }),
        expect.objectContaining({
          ruleId: 'pre-consent-trackers',
          status: 'executed',
          partial: true,
        }),
        expect.objectContaining({ ruleId: 'trackers-after-reject', status: 'not-evaluable' }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain('SECRET');
    expect(JSON.stringify(result)).not.toContain('/private/');
  });

  it('sends every redirect hop through the adapter, including rejected destinations', async () => {
    const calls: string[] = [];
    const result = await scan(origin, {
      ...settings,
      networkAdapter: async ({ url }) => {
        calls.push(url);
        if (url === `${origin}/`) return { status: 302, headers: { location: '/next' } };
        if (url === `${origin}/next`)
          return { status: 307, headers: { location: 'http://127.0.0.1/private?secret=value' } };
        throw new NetworkError('security-blocked');
      },
    });
    expect(calls).toEqual([
      `${origin}/`,
      `${origin}/next`,
      'http://127.0.0.1/private?secret=value',
    ]);
    expect(result.pages[0]?.capture?.diagnostics.blocked).toBe(1);
    expect(result.pages[0]?.capture?.diagnostics).toMatchObject({
      requests: 3,
      responses: 2,
      finished: 2,
      failed: 1,
    });
    expect(result.findings).toEqual([]);
    expect(result.coverage).toBe('partial');
  });

  it('bounds redirect chains independently of the request budget', async () => {
    const calls: string[] = [];
    const result = await scan(origin, {
      ...settings,
      networkLimits: { maxRedirects: 1 },
      networkAdapter: async ({ url }) => {
        calls.push(url);
        return { status: 302, headers: { location: `${origin}/${calls.length}` } };
      },
    });
    expect(calls).toHaveLength(2);
    expect(result.pages[0]?.capture?.diagnostics.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'resource-limit', limit: 'redirects' }),
      ]),
    );
  });

  it('aborts active and queued resources and does not expose the abort reason', async () => {
    const controller = new AbortController();
    let active = 0;
    let calls = 0;
    const operation = scan(origin, {
      ...settings,
      signal: controller.signal,
      networkLimits: { concurrency: 1 },
      networkAdapter: async ({ url, signal }) => {
        calls++;
        if (url === `${origin}/`)
          return html('<script async src="/slow"></script><script async src="/queued"></script>');
        active++;
        controller.abort('SECRET');
        try {
          await delay(5_000, undefined, { signal });
        } finally {
          active--;
        }
        return { status: 200 };
      },
    });
    await expect(operation).rejects.toMatchObject({ name: 'AbortError', message: 'Scan aborted' });
    expect(active).toBe(0);
    expect(calls).toBe(2);
  });

  it('returns timeout diagnostics and aborts transport operations at the capture deadline', async () => {
    let cancelled = false;
    const result = await scan(origin, {
      ...settings,
      captureTimeoutMs: 1_000,
      networkAdapter: async ({ signal }) => {
        try {
          await delay(5_000, undefined, { signal });
        } finally {
          cancelled = signal.aborted;
        }
        return html();
      },
    });
    expect(cancelled).toBe(true);
    expect(result.coverage).toBe('partial');
    expect(result.pages[0]?.error).toBe('timeout');
  });

  it('keeps the execution timeout separate from queue wait', async () => {
    const result = await scan(origin, {
      ...settings,
      networkLimits: { requestTimeoutMs: 50 },
      networkAdapter: async ({ signal }) => {
        await delay(2_000, undefined, { signal });
        return html();
      },
    });
    expect(result.pages[0]?.capture?.diagnostics.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'timeout' })]),
    );
  });

  it('says where the time went: load, network idle, queue peak and timeout stage', async () => {
    const result = await scan(origin, {
      ...settings,
      captureTimeoutMs: 1_500,
      networkLimits: { concurrency: 1 },
      networkAdapter: async ({ url, signal }) => {
        if (url === `${origin}/`) {
          return html('<script>for (let i = 0; i < 4; i++) fetch("/slow" + i)</script>');
        }
        await delay(10_000, undefined, { signal });
        return { status: 200, body: '' };
      },
    });
    const diagnostics = result.pages[0]?.capture?.diagnostics;
    expect(diagnostics?.timing).toMatchObject({
      loadMs: expect.any(Number),
      networkIdleMs: expect.any(Number),
    });
    expect(diagnostics?.timing?.peakQueued).toBeGreaterThanOrEqual(3);
    const stages = diagnostics?.issues
      .filter((issue) => issue.kind === 'timeout')
      .map((issue) => issue.stage);
    expect(stages).toContain('fetching');
    expect(stages).toContain('queued');
  });

  it('bounds streamed response bytes and cancels the adapter signal', async () => {
    let signal: AbortSignal | undefined;
    let returned = false;
    const result = await scan(origin, {
      ...settings,
      networkLimits: { maxResponseBytes: 5 },
      networkAdapter: async (request) => {
        signal = request.signal;
        return {
          status: 200,
          body: (async function* () {
            try {
              yield Buffer.from('1234');
              yield Buffer.from('5678');
            } finally {
              returned = true;
            }
          })(),
        };
      },
    });
    expect(signal?.aborted).toBe(true);
    expect(returned).toBe(true);
    expect(result.pages[0]?.capture?.diagnostics).toMatchObject({
      bytes: 8,
      issues: [expect.objectContaining({ kind: 'resource-limit', limit: 'response-bytes' })],
    });
  });

  it('enforces the total response budget independently of individual body size', async () => {
    const result = await scan(origin, {
      ...settings,
      networkLimits: { maxResponseBytes: 10_000, maxTotalBytes: 1_000 },
      networkAdapter: async ({ url }) =>
        url === `${origin}/`
          ? html('<script src="/large"></script>')
          : { status: 200, body: 'x'.repeat(1_000) },
    });
    expect(result.pages[0]?.capture?.diagnostics.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'resource-limit', limit: 'total-bytes' }),
      ]),
    );
  });

  it('counts HTTP errors as responses and separately reports a request-count limit', async () => {
    const result = await scan(origin, {
      ...settings,
      networkLimits: { maxRequests: 2 },
      networkAdapter: async ({ url }) =>
        url === `${origin}/`
          ? html('<script async src="/one"></script><script async src="/two"></script>')
          : { status: 503 },
    });
    expect(result.pages[0]?.capture?.diagnostics).toMatchObject({
      requests: 3,
      responses: 2,
      httpErrors: 1,
      failed: 2,
    });
    expect(result.pages[0]?.capture?.diagnostics.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'http-error', status: 503 }),
        expect.objectContaining({ kind: 'resource-limit', limit: 'requests' }),
      ]),
    );
  });

  it('blocks WebSocket traffic rather than falling back to an uncontrolled connection', async () => {
    const result = await scan(origin, {
      ...settings,
      networkAdapter: async () =>
        html('<script>new WebSocket("wss://socket.invalid/private?secret=SECRET")</script>'),
    });
    expect(result.pages[0]?.capture?.diagnostics.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'unsupported-protocol' })]),
    );
    expect(JSON.stringify(result)).not.toContain('SECRET');
  });

  it('preserves structured adapter reasons and sanitizes arbitrary transport errors', async () => {
    const result = await scan(origin, {
      ...settings,
      networkAdapter: async ({ url, method }) => {
        if (url === `${origin}/`)
          return html('<script>fetch("/post",{method:"POST"});fetch("/dns")</script>');
        if (method === 'POST') throw new NetworkError('unsupported-method');
        throw new Error('ENOTFOUND https://user:SECRET@private.invalid/private?token=SECRET');
      },
    });
    expect(result.pages[0]?.capture?.diagnostics.issues.map((issue) => issue.kind).sort()).toEqual([
      'dns',
      'unsupported-method',
    ]);
    expect(JSON.stringify(result)).not.toContain('SECRET');
  });
});

describe('skipped error-monitoring reports', () => {
  // Read-only adapters, like public scanners, refuse every POST.
  const readOnly =
    (target: string): NetworkAdapter =>
    async ({ url, method }) => {
      if (url === `${origin}/`) {
        return html(
          `<script>fetch(${JSON.stringify(target)},{method:"POST",body:"{}"}).catch(()=>{})</script>`,
        );
      }
      if (method === 'POST') throw new NetworkError('unsupported-method');
      return { status: 200, body: '' };
    };

  it.each([
    'https://o4511755310006272.ingest.us.sentry.io/api/1/envelope/',
    'https://o42.ingest.sentry.io/api/1/envelope/',
    'https://o42.ingest.de.sentry.io/api/1/envelope/',
    'https://notify.bugsnag.com/',
    'https://sessions.bugsnag.com/',
    'https://notify.bugsnag.smartbear.com/',
    'https://sessions.bugsnag.smartbear.com/',
    'https://api.rollbar.com/api/1/item/',
    'https://browser-intake-datadoghq.com/api/v2/rum?ddsource=browser',
    'https://browser-intake-us5-datadoghq.com/api/v2/logs?ddsource=browser',
    'https://browser-intake-ap1-datadoghq.com/api/v2/rum?ddsource=browser',
    'https://browser-intake-datadoghq.eu/api/v2/rum?ddsource=browser',
    'https://browser-intake-us2-ddog-gov.com/api/v2/rum?ddsource=browser',
    'https://quota.browser-intake-datadoghq.com/api/v2/profiling/quota',
  ])('keeps the capture complete when a report to %s is skipped', async (target) => {
    const result = await scan(origin, {
      ...settings,
      networkAdapter: readOnly(target),
      consentCheck: false,
    });
    const capture = result.pages[0]?.capture;
    expect(capture?.complete).toBe(true);
    expect(capture?.diagnostics.issues).toEqual([
      expect.objectContaining({ kind: 'unsupported-method' }),
    ]);
  });

  it.each([
    'https://api.example.org/graphql',
    'https://sentry.io.evil.invalid/api/1/envelope/',
    'https://ingest.sentry.io.evil.invalid/api/1/envelope/',
    'https://app.bugsnag.com/api',
    'https://notify.bugsnag.com.evil.invalid/',
    'https://rollbar.com/api/1/item/',
    'https://api.rollbar.com.evil.invalid/api/1/item/',
    'https://app.datadoghq.com/api/v2/rum',
    'https://browser-intake-datadoghq.com.evil.invalid/api/v2/rum',
    'https://browser-intake-evil-datadoghq.com/api/v2/rum',
  ])('still treats a skipped POST to %s as incomplete', async (target) => {
    const result = await scan(origin, {
      ...settings,
      networkAdapter: readOnly(target),
      consentCheck: false,
    });
    expect(result.pages[0]?.capture?.complete).toBe(false);
  });
});

describe('requests the page cancels itself', () => {
  // The page starts a fetch and aborts it after 100 ms; the adapter needs 800 ms for it.
  const cancelling = html(
    "<script>const c=new AbortController();fetch('/slow',{signal:c.signal}).catch(()=>{});setTimeout(()=>c.abort(),100)</script>",
  );
  const slow =
    (onAbort?: (afterMs: number) => void): NetworkAdapter =>
    async ({ url, signal }) => {
      if (url !== `${origin}/slow`) return cancelling;
      const started = Date.now();
      signal.addEventListener('abort', () => onAbort?.(Date.now() - started), { once: true });
      await delay(800, undefined, { signal });
      return { status: 200, body: '{}', headers: { 'content-type': 'application/json' } };
    };

  it('keeps the capture complete and lists the request as cancelled by the page', async () => {
    const result = await scan(origin, { ...settings, networkAdapter: slow(), consentCheck: false });
    const capture = result.pages[0]?.capture;
    expect(capture?.complete).toBe(true);
    expect(capture?.diagnostics).toMatchObject({ failedRequests: 0, skippedRequests: 1 });
    expect(capture?.diagnostics.issues).toEqual([
      expect.objectContaining({ kind: 'skipped', skippedReason: 'cancelled-by-page' }),
    ]);
  });

  it('stops the adapter request when the page cancels it', async () => {
    // The page cancels /slow only once the adapter has started it: /ping waits for that.
    let started!: () => void;
    const slowStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    let abortedAt = Number.POSITIVE_INFINITY;
    const adapter: NetworkAdapter = async ({ url, signal }) => {
      if (url === `${origin}/ping`) {
        await slowStarted;
        return { status: 200, body: '' };
      }
      if (url !== `${origin}/slow`) {
        return html(
          "<script>const c=new AbortController();fetch('/slow',{signal:c.signal}).catch(()=>{});fetch('/ping').then(()=>c.abort())</script>",
        );
      }
      signal.addEventListener(
        'abort',
        () => {
          abortedAt = Date.now();
        },
        { once: true },
      );
      started();
      await delay(5_000, undefined, { signal });
      return { status: 200, body: '' };
    };
    await scan(origin, { ...settings, networkAdapter: adapter, consentCheck: false });
    // Teardown would abort it too, but only as the scan ends, after 500 ms of network idle.
    expect(Date.now() - abortedAt).toBeGreaterThan(300);
  });

  it.each([
    ['throws', async () => Promise.reject(new Error('socket hang up'))],
    ['times out', ({ signal }: { signal: AbortSignal }) => delay(5_000, undefined, { signal })],
  ])('still treats an adapter that %s as incomplete', async (_, failing) => {
    const adapter: NetworkAdapter = async (request) => {
      if (request.url !== `${origin}/data`) return html("<script>fetch('/data')</script>");
      await failing(request);
      return { status: 200, body: '' };
    };
    const result = await scan(origin, {
      ...settings,
      networkAdapter: adapter,
      networkLimits: { requestTimeoutMs: 500 },
      consentCheck: false,
    });
    expect(result.pages[0]?.capture?.complete).toBe(false);
    expect(result.pages[0]?.capture?.diagnostics.failedRequests).toBe(1);
  });
});

describe('consent with controlled capture', () => {
  it('keeps initial load failures separate from a completed reject observation', async () => {
    let documents = 0;
    const result = await scan(origin, {
      ...settings,
      networkAdapter: async ({ url }) => {
        if (url !== `${origin}/`) throw new NetworkError('security-blocked');
        documents++;
        return html(
          '<div>Cookies <button>Accept all</button><button>Reject all</button></div>' +
            (documents === 1 ? '<script src="/blocked"></script>' : ''),
        );
      },
    });
    expect(result.pages[0]?.capture?.beforeConsentComplete).toBe(false);
    expect(result.consent).toMatchObject({ state: 'reject-tested', afterRejectComplete: true });
    expect(result.pages[0]?.ruleEvaluations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'trackers-after-reject',
          status: 'executed',
          partial: false,
        }),
      ]),
    );
  });
  it.each([
    ['good.html', 'reject-tested'],
    ['accept-only.html', 'reject-unavailable'],
  ])('uses existing banner heuristics for %s', async (fixture, state) => {
    const body = await readFile(new URL(`./fixtures/consent/${fixture}`, import.meta.url), 'utf8');
    const result = await scan(origin, { ...settings, networkAdapter: async () => html(body) });
    expect(result.consent?.state).toBe(state);
  });

  it('uses existing Cookiebot selectors even without matching button labels', async () => {
    const result = await scan(origin, {
      ...settings,
      networkAdapter: async () =>
        html(
          '<button id="CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll">Yes</button>' +
            '<button id="CybotCookiebotDialogBodyButtonDecline" onclick="this.remove()">No</button>',
        ),
    });
    expect(result.consent).toMatchObject({
      state: 'reject-tested',
      cmp: 'Cookiebot',
      afterRejectComplete: true,
    });
    expect(result.coverage).toBe('complete');
  });

  it('distinguishes a failed reject reload from a missing or unsupported banner', async () => {
    let count = 0;
    const result = await scan(origin, {
      ...settings,
      networkAdapter: async () => {
        if (++count > 1) throw new NetworkError('connection');
        return html('<div>Cookies <button>Accept all</button><button>Reject all</button></div>');
      },
    });
    expect(result.consent?.state).toBe('interaction-failed');
    expect(result.consent?.rejected).toBe(false);
    expect(result.pages[0]?.capture?.diagnostics.issues[0]?.phase).toBe('after-reject');
  });
});

describe('diagnostic privacy and classification', () => {
  it('classifies transport error causes without retaining their messages', () => {
    expect(
      classifyLoadError(
        new Error('fetch failed', {
          cause: Object.assign(new Error('SECRET'), { code: 'ENOTFOUND' }),
        }),
      ),
    ).toBe('dns');
  });
  it.each([
    ['net::ERR_NAME_NOT_RESOLVED', 'dns'],
    ['ENOTFOUND', 'dns'],
    ['net::ERR_CERT_AUTHORITY_INVALID', 'tls'],
    ['net::ERR_CONNECTION_RESET', 'connection'],
    ['ETIMEDOUT', 'timeout'],
    ['unknown secret response body', 'browser-failure'],
  ])('classifies %s without retaining raw data', (code, kind) => {
    expect(classifyLoadError(new Error(code))).toBe(kind);
  });
  it('removes all sensitive URL components', () => {
    expect(diagnosticUrl('https://user:pass@example.org/reset/SECRET?token=SECRET#SECRET')).toBe(
      'https://example.org/[redacted]',
    );
  });
  it('rejects pre-aborted scans without exposing the reason', async () => {
    await expect(scan(origin, { signal: AbortSignal.abort('SECRET') })).rejects.toMatchObject({
      name: 'AbortError',
      message: 'Scan aborted',
    });
  });
});
