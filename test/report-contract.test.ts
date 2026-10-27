import { describe, expect, it } from 'vitest';
import { VERSION } from '../src/meta.js';
import { NetworkError } from '../src/network.js';
import { scan } from '../src/scanner.js';
import type { ScanProgressEvent } from '../src/types.js';

const origin = 'https://contract.invalid';
const html = (extra = '') => ({
  status: 200,
  headers: { 'content-type': 'text/html' },
  body: `<a href="/impressum">Impressum</a><a href="/privacy">Privacy policy</a>${extra}`,
});
const banner = '<div>Cookies <button>Accept all</button><button>Reject all</button></div>';

describe('versioned report contract', () => {
  it('partitions request failures from explicit skips and security blocks', async () => {
    const result = await scan(origin, {
      settleMs: 0,
      networkAdapter: async ({ url }) => {
        if (url === `${origin}/`)
          return html(
            '<script>navigator.sendBeacon("/beacon","hello");fetch("/broken");fetch("/blocked")</script>',
          );
        if (url.endsWith('/beacon')) throw new NetworkError('skipped', undefined, 'beacon');
        if (url.endsWith('/blocked')) throw new NetworkError('security-blocked');
        throw new NetworkError('connection');
      },
    });
    const diagnostics = result.pages[0]?.capture?.diagnostics;
    expect(diagnostics).toMatchObject({
      requests: 4,
      finished: 1,
      skippedRequests: 1,
      failedRequests: 1,
      securityBlockedRequests: 1,
      failed: 3,
    });
    expect(diagnostics?.issues).toContainEqual(
      expect.objectContaining({ kind: 'skipped', skippedReason: 'beacon' }),
    );
    expect(result.findings).toEqual([]);
    expect(
      result.pages[0]?.ruleEvaluations?.find((item) => item.ruleId === 'pre-consent-trackers'),
    ).toMatchObject({ outcome: 'not-evaluable', explanation: 'incomplete-observation' });
  });
  it('reports real progress in order with safe URLs, elapsed time and reproducible options', async () => {
    const events: ScanProgressEvent[] = [];
    const result = await scan(`${origin}/SECRET?token=SECRET`, {
      settleMs: 0,
      onProgress: (event) => events.push(event),
      networkAdapter: async () => html(banner),
    });
    expect(events.map((event) => event.stage)).toEqual([
      'starting',
      'loading-page',
      'checking-consent',
      'page-captured',
      'evaluating-rules',
      'completed',
    ]);
    expect(
      events.every((event, index) => event.elapsedMs >= (events[index - 1]?.elapsedMs ?? 0)),
    ).toBe(true);
    expect(JSON.stringify(events)).not.toContain('SECRET');
    expect(result).toMatchObject({
      schemaVersion: '1.1.0',
      scannerVersion: VERSION,
      options: {
        maxPages: 1,
        settleMs: 0,
        captureMode: 'adapter',
        networkLimits: { concurrency: 6 },
        consentCheck: true,
      },
    });
    expect(JSON.stringify(result.options)).not.toContain('SECRET');
    expect(result.consent).toMatchObject({
      outcome: 'reject-succeeded',
      reason: 'reject-clicked-and-reloaded',
    });
    expect(result.pages[0]?.ruleEvaluations).toContainEqual(
      expect.objectContaining({
        ruleId: 'impressum-link',
        outcome: 'checked-no-finding',
        findingCount: 0,
      }),
    );
  });
  it('reports a finding outcome independently of an empty result for other rules', async () => {
    const result = await scan(origin, {
      settleMs: 0,
      consentCheck: false,
      networkAdapter: async ({ url }) =>
        url === `${origin}/`
          ? html('<script src="https://fonts.googleapis.com/x"></script>')
          : { status: 200, body: '' },
    });
    expect(result.pages[0]?.ruleEvaluations).toContainEqual(
      expect.objectContaining({
        ruleId: 'google-fonts',
        outcome: 'finding-detected',
        explanation: 'positive-evidence',
        findingCount: 1,
      }),
    );
  });
  it('cleans up before propagating a progress callback failure and emits no completed event', async () => {
    const stages: string[] = [];
    const failure = new Error('consumer failed');
    await expect(
      scan(origin, {
        settleMs: 0,
        networkAdapter: async () => html(banner),
        onProgress: (event) => {
          stages.push(event.stage);
          if (event.stage === 'checking-consent') throw failure;
        },
      }),
    ).rejects.toBe(failure);
    expect(stages).not.toContain('completed');
  });
});

describe('additional CMP recognition', () => {
  it('reports unsupported consent UI without inventing a missing-reject privacy finding', async () => {
    const result = await scan(origin, {
      settleMs: 0,
      networkAdapter: async () =>
        html('<div role="dialog">Cookie preferences <button>Proceed</button></div>'),
    });
    expect(result.consent).toMatchObject({
      outcome: 'unsupported-banner',
      reason: 'unsupported-banner-markup',
    });
    expect(result.findings).toEqual([]);
    expect(result.pages[0]?.ruleEvaluations).toContainEqual(
      expect.objectContaining({
        ruleId: 'reject-option',
        outcome: 'not-evaluable',
        explanation: 'unsupported-banner-markup',
      }),
    );
  });
  it.each([
    [
      'CookieFirst',
      '<button data-cookiefirst-action="accept">Yes</button><button data-cookiefirst-action="reject">No</button>',
    ],
    [
      'CookieFirst',
      '<div id="cookiefirst-root"><button data-testid="actionButton-accept">Yes</button><button data-testid="actionButton-reject">No</button></div>',
    ],
    [
      'Osano',
      '<button class="osano-cm-accept-all">Yes</button><button class="osano-cm-deny-all">No</button>',
    ],
    [
      'Termly',
      '<button data-tid="banner-accept">Yes</button><button data-tid="banner-decline">No</button>',
    ],
    [
      'Sourcepoint',
      '<button class="sp_choice_type_11">Yes</button><button class="sp_choice_type_13">No</button>',
    ],
    [
      'Real Cookie Banner',
      '<script type="application/json">{"slug":"real-cookie-banner-pro"}</script>' + banner,
    ],
  ])('recognizes %s and tests rejection using existing APIs', async (cmp, markup) => {
    const result = await scan(origin, { settleMs: 0, networkAdapter: async () => html(markup) });
    expect(result.consent).toMatchObject({ cmp, outcome: 'reject-succeeded' });
  });
  it('recognizes Sourcepoint in an iframe and keeps both button locators in that frame', async () => {
    const result = await scan(origin, {
      settleMs: 0,
      networkAdapter: async ({ url }) =>
        url === `${origin}/`
          ? html('<iframe src="/cmp"></iframe>')
          : html(
              '<button class="sp_choice_type_11">Yes</button><button class="sp_choice_type_13">No</button>',
            ),
    });
    expect(result.consent).toMatchObject({ cmp: 'Sourcepoint', outcome: 'reject-succeeded' });
  });
  it('explains unsupported banners separately from absence or interaction failures', async () => {
    const result = await scan(origin, {
      settleMs: 0,
      networkAdapter: async () => html('<div>Cookies <button>Accept all</button></div>'),
    });
    expect(result.consent).toMatchObject({
      outcome: 'unsupported-banner',
      reason: 'no-supported-reject-control',
    });
    expect(result.pages[0]?.ruleEvaluations).toContainEqual(
      expect.objectContaining({
        ruleId: 'trackers-after-reject',
        outcome: 'not-evaluable',
        explanation: 'no-supported-reject-control',
      }),
    );
  });
});
