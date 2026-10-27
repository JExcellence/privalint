import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { scan } from '../src/scanner.js';

const FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url));
const TYPES: Record<string, string> = { '.html': 'text/html', '.css': 'text/css' };

let server: Server;
let origin: string;

beforeAll(async () => {
  server = createServer(async (req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (path === '/old-about') {
      res.writeHead(301, { location: '/clean/about.html' }).end();
      return;
    }
    if (path === '/download') {
      res.writeHead(200, {
        'content-type': 'application/octet-stream',
        'content-disposition': 'attachment; filename="preise.bin"',
      });
      res.end('binary');
      return;
    }
    const file = normalize(join(FIXTURES, path.endsWith('/') ? `${path}index.html` : path));
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'text/plain' });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

const options = { offline: true, settleMs: 500 };

describe('scan', () => {
  it('reports nothing for a clean page', async () => {
    const result = await scan(`${origin}/clean/`, options);
    expect(result.findings).toEqual([]);
    expect(result.pages).toHaveLength(1);
  });

  it('crawls same-host links up to maxPages and checks each page', async () => {
    const result = await scan(`${origin}/clean/`, { ...options, maxPages: 5 });
    const visited = result.pages.map((page) => new URL(page.url).pathname);

    expect(visited).toContain('/clean/about.html');
    expect(visited).not.toContain('/clean/broschuere.pdf');
    expect(result.findings).toEqual([
      expect.objectContaining({ ruleId: 'impressum-link', pageUrl: `${origin}/clean/about.html` }),
      expect.objectContaining({
        ruleId: 'privacy-policy-link',
        pageUrl: `${origin}/clean/about.html`,
      }),
    ]);
  });

  it('keeps crawling past downloads and lints redirect targets once', async () => {
    const result = await scan(`${origin}/messy/`, { ...options, maxPages: 10 });
    const download = result.pages.find((page) => page.url.endsWith('/download'));
    expect(download?.error).toBeDefined();

    const about = result.pages.filter((page) => page.finalUrl.endsWith('/clean/about.html'));
    expect(about).toHaveLength(1);
    const aboutFindings = result.findings.filter((f) => f.pageUrl.endsWith('/clean/about.html'));
    expect(aboutFindings.map((f) => f.ruleId)).toEqual(['impressum-link', 'privacy-policy-link']);
  });

  describe('with concurrency', () => {
    const summary = (result: Awaited<ReturnType<typeof scan>>) => ({
      pages: result.pages.map((page) => page.finalUrl),
      findings: result.findings.map((f) => `${f.ruleId} ${f.pageUrl}`),
    });

    it.each(['clean', 'messy'])(
      'crawls the %s fixture exactly like a sequential scan',
      async (fixture) => {
        const crawl = { ...options, maxPages: 10 };
        const sequential = await scan(`${origin}/${fixture}/`, crawl);
        const parallel = await scan(`${origin}/${fixture}/`, { ...crawl, concurrency: 3 });
        expect(summary(parallel)).toEqual(summary(sequential));
        expect(parallel.options?.concurrency).toBe(3);
      },
    );

    it('still stops at maxPages', async () => {
      const result = await scan(`${origin}/clean/`, { ...options, maxPages: 2, concurrency: 5 });
      expect(result.pages).toHaveLength(2);
    });

    it('rejects a concurrency below 1', async () => {
      await expect(scan(`${origin}/clean/`, { ...options, concurrency: 0 })).rejects.toThrow(
        /concurrency/,
      );
    });
  });

  it('fails when the start page cannot be loaded', async () => {
    await expect(scan(`${origin}/download`, options)).rejects.toThrow(/Could not load/);
  });

  it('catches fonts, trackers, cookies and delayed pixels on a leaky page', async () => {
    const result = await scan(`${origin}/leaky/`, options);
    const summary = result.findings.map(({ ruleId, severity }) => `${ruleId}:${severity}`);

    expect(summary).toEqual(
      expect.arrayContaining([
        'google-fonts:error',
        'pre-consent-trackers:error',
        'third-party-embeds:warning',
        'third-party-cdns:info',
        'impressum-link:warning',
        'privacy-policy-link:warning',
      ]),
    );

    const vendors = result.findings
      .filter((finding) => finding.ruleId === 'pre-consent-trackers')
      .map((finding) => finding.message);
    expect(vendors.some((message) => message.startsWith('Google Analytics'))).toBe(true);
    expect(vendors.some((message) => message.startsWith('Meta Pixel'))).toBe(true);
  });
});

describe('consent check', () => {
  it('names CookieFirst using vendor attributes rather than translated labels', async () => {
    const result = await scan(`${origin}/consent/cookiefirst.html`, options);
    expect(result.consent).toMatchObject({ cmp: 'CookieFirst', outcome: 'reject-succeeded' });
    expect(result.findings).toEqual([]);
  });
  it('finds the Osano reject button by its camelCase class', async () => {
    const result = await scan(`${origin}/consent/osano.html`, options);
    expect(result.consent).toMatchObject({
      cmp: 'Osano',
      outcome: 'reject-succeeded',
      rejectLabel: 'Nicht wesentliche Cookies ablehnen',
    });
  });
  const ruleIds = (findings: { ruleId: string }[]) => findings.map((f) => f.ruleId);

  it.each([
    ['good.html', 'Cookie-Einstellungen'],
    ['broken.html', 'Einstellungen'],
    ['cookiefirst.html', 'Cookie settings'],
  ])('finds the way back into the settings on %s', async (fixture, label) => {
    const result = await scan(`${origin}/consent/${fixture}`, options);
    expect(result.consent?.settingsControl).toEqual({ found: true, label });
  });

  it('warns when nothing reopens the settings after rejecting', async () => {
    const result = await scan(`${origin}/consent/osano.html`, options);
    expect(result.consent?.settingsControl).toEqual({ found: false });
    expect(result.findings).toEqual([
      expect.objectContaining({
        ruleId: 'consent-settings-link',
        severity: 'warning',
        evidence: [
          'Checked after clicking "Nicht wesentliche Cookies ablehnen" and reloading',
          'Consent manager: Osano',
        ],
      }),
    ]);
  });

  it('passes a banner whose reject button is respected', async () => {
    const result = await scan(`${origin}/consent/good.html`, options);
    expect(result.consent).toMatchObject({
      bannerFound: true,
      rejected: true,
      acceptLabel: 'Alle akzeptieren',
      rejectLabel: 'Alle ablehnen',
    });
    expect(result.findings).toEqual([]);
  });

  it('catches trackers that load after reject', async () => {
    const result = await scan(`${origin}/consent/broken.html`, options);
    expect(ruleIds(result.findings)).toEqual(['trackers-after-reject']);
    expect(result.findings[0]?.message).toContain('Alle ablehnen');
    expect(result.findings[0]?.evidence[0]).toContain('G-CONSENT');
  });

  it('warns when the banner has no reject button', async () => {
    const result = await scan(`${origin}/consent/accept-only.html`, options);
    expect(result.consent).toMatchObject({ bannerFound: true, rejected: false });
    expect(ruleIds(result.findings)).toEqual(['reject-option']);
  });

  it('reports pay-or-OK banners as info, not as a missing reject button', async () => {
    const result = await scan(`${origin}/consent/pay-or-ok.html`, options);
    expect(result.consent).toMatchObject({ bannerFound: true, payOrOk: true });
    expect(result.findings.map(({ ruleId, severity }) => `${ruleId}:${severity}`)).toEqual([
      'reject-option:info',
    ]);
  });

  it('ignores subscription links outside the banner', async () => {
    const result = await scan(`${origin}/consent/accept-only.html`, options);
    expect(result.consent?.payOrOk).toBeUndefined();
  });

  it('can be skipped', async () => {
    const result = await scan(`${origin}/consent/broken.html`, { ...options, consentCheck: false });
    expect(result.consent).toBeUndefined();
    expect(result.findings).toEqual([]);
  });

  it('reports no banner on a page without one', async () => {
    const result = await scan(`${origin}/clean/`, options);
    expect(result.consent).toMatchObject({
      bannerFound: false,
      rejected: false,
      state: 'not-detected',
      outcome: 'no-banner-detected',
      reason: 'no-supported-banner',
    });
  });
});

describe('demo page', () => {
  // docs/demo.svg is rendered from this page. If this test fails, run `npm run demo`.
  it('produces the findings shown in the README image', async () => {
    const result = await scan(`${origin}/demo/`, options);
    expect(result.findings.map(({ ruleId, severity }) => `${ruleId}:${severity}`)).toEqual([
      'trackers-after-reject:error',
      'google-fonts:error',
      'third-party-embeds:warning',
    ]);
  });
});

describe('sandbox', () => {
  // Opt-in: GitHub's Ubuntu runners restrict the user namespaces the sandbox needs.
  it.runIf(process.env.PRIVALINT_TEST_SANDBOX)('scans with the Chromium sandbox on', async () => {
    const result = await scan(`${origin}/consent/broken.html`, { ...options, sandbox: true });
    expect(result.options?.sandbox).toBe(true);
    expect(result.findings.map((f) => f.ruleId)).toEqual(['trackers-after-reject']);
  });

  it('records that the sandbox was off', async () => {
    const result = await scan(`${origin}/clean/`, options);
    expect(result.options?.sandbox).toBe(false);
  });
});

describe('headed mode', () => {
  // Opt-in: needs a display, and some machines block the bundled Chromium.
  // PRIVALINT_TEST_HEADED=1 runs it; PRIVALINT_TEST_CHANNEL=msedge picks an installed browser.
  it.runIf(process.env.PRIVALINT_TEST_HEADED)(
    'runs the same checks in a visible window',
    async () => {
      const result = await scan(`${origin}/consent/broken.html`, {
        ...options,
        headed: true,
        channel: process.env.PRIVALINT_TEST_CHANNEL,
      });
      expect(result.findings.map((f) => f.ruleId)).toEqual(['trackers-after-reject']);
    },
  );
});
