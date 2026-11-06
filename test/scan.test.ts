import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assessCoverage } from '../src/coverage.js';
import { scan } from '../src/scanner.js';
import type { ScanResult } from '../src/types.js';

const FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url));
const TYPES: Record<string, string> = { '.html': 'text/html', '.css': 'text/css' };

let server: Server;
let origin: string;
let onceServed = false;

beforeAll(async () => {
  server = createServer(async (req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (path === '/old-about') {
      res.writeHead(301, { location: '/clean/about.html' }).end();
      return;
    }
    if (path === '/events') {
      // Server-Sent Events: answers at once, then stays open like a live-update or chat stream.
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
      res.write('data: hello\n\n');
      return;
    }
    if (path === '/banner-once') {
      // The banner shows only on the first request, like a geo- or A/B-dependent consent manager.
      const file = onceServed ? 'clean/index.html' : 'consent/settings-good.html';
      onceServed = true;
      res.writeHead(200, { 'content-type': 'text/html' }).end(await readFile(join(FIXTURES, file)));
      return;
    }
    if (path === '/hang') {
      // Never answers, like a stuck backend.
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

afterAll(
  () =>
    new Promise<void>((resolve) => {
      server.close(() => resolve());
      // The event stream and the hanging request keep their connections open.
      server.closeAllConnections();
    }),
);

const options = { offline: true, settleMs: 500 };

describe('scan', () => {
  it('reports nothing for a clean page', async () => {
    const result = await scan(`${origin}/clean/`, options);
    expect(result.findings).toEqual([]);
    expect(result.pages).toHaveLength(1);
  });

  it('keeps a capture complete while a Server-Sent Events stream stays open', async () => {
    const stream = await scan(`${origin}/stream/`, {
      ...options,
      consentCheck: false,
      timeoutMs: 3_000,
    });
    const capture = stream.pages[0]?.capture;
    expect(capture?.diagnostics.issues).toEqual([]);
    expect(capture?.complete).toBe(true);

    // A request that never answers can't be told apart from a stuck backend: still incomplete.
    const hang = await scan(`${origin}/stream/hang.html`, {
      ...options,
      consentCheck: false,
      timeoutMs: 3_000,
    });
    expect(hang.pages[0]?.capture?.complete).toBe(false);
  });

  it('notes a contact form without a privacy link next to it', async () => {
    const result = await scan(`${origin}/forms/`, { ...options, consentCheck: false });
    expect(result.findings).toEqual([
      expect.objectContaining({
        ruleId: 'form-privacy-notice',
        severity: 'info',
        message: expect.stringContaining('1 form(s) collecting personal data (contact or sign-up)'),
        evidence: ['3 forms with email, phone or password fields checked'],
      }),
    ]);
  });

  it('recognises a tracker by its localStorage key, not only by cookies', async () => {
    const result = await scan(`${origin}/storage/`, { ...options, consentCheck: false });
    expect(result.findings).toEqual([
      expect.objectContaining({
        ruleId: 'pre-consent-trackers',
        subject: 'Hotjar',
        evidence: ['localStorage _hjSessionUser_123'],
      }),
    ]);
  });

  it('never puts URL credentials into the report', async () => {
    const withAuth = origin.replace('http://', 'http://scanner:s3cret@');
    const result = await scan(`${withAuth}/leaky/`, options);
    expect(JSON.stringify(result)).not.toContain('s3cret');
    expect(result.siteUrl).toBe(`${origin}/leaky/`);
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('records the page a JavaScript redirect lands on while settling', async () => {
    const result = await scan(`${origin}/redirect/`, options);
    expect(result.pages[0]?.finalUrl).toBe(`${origin}/clean/index.html`);
    expect(result.findings).toEqual([]);
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
    // Trackers run and there is no banner at all: named once, next to the per-tracker errors.
    expect(result.findings.filter((f) => f.ruleId === 'consent-banner-missing')).toEqual([
      expect.objectContaining({
        severity: 'warning',
        message: expect.stringContaining('No consent banner was found'),
      }),
    ]);

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
  it.each([
    ['axeptio.html', 'Axeptio', 'No, thanks'],
    ['trustarc.html', 'TrustArc', 'REJECT OPTIONAL'],
    ['cookiehub.html', 'CookieHub', 'Alle ablehnen'],
    ['cookie-information.html', 'Cookie Information', 'Decline all'],
    ['cookie-script.html', 'Cookie-Script', 'Decline all'],
  ])('recognises %s by its selectors and tests reject', async (fixture, cmp, rejectLabel) => {
    const result = await scan(`${origin}/consent/${fixture}`, options);
    expect(result.consent).toMatchObject({ cmp, outcome: 'reject-succeeded', rejectLabel });
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

  it('does not mistake accept and reject buttons outside a banner for consent', async () => {
    const result = await scan(`${origin}/consent/not-a-banner.html`, options);
    expect(result.consent).toMatchObject({ bannerFound: false });
    expect(result.findings).toEqual([]);
  });

  it('finds the reject button by label when a known selector is out of date', async () => {
    const result = await scan(`${origin}/consent/stale-reject-selector.html`, options);
    expect(result.consent).toMatchObject({
      cmp: 'OneTrust',
      rejected: true,
      rejectLabel: 'Alle ablehnen',
    });
    expect(result.findings).toEqual([]);
  });

  it('waits up to one more settle period for a banner that appears late', async () => {
    const late = await scan(`${origin}/consent/late.html`, { ...options, settleMs: 1_500 });
    // On a loaded machine the banner may already be there at the first look; either way it is found.
    expect(late.consent).toMatchObject({ bannerFound: true, rejected: true });
    expect(late.consent?.bannerWaitMs).toBeGreaterThanOrEqual(0);

    // --settle 0 means no extra wait, so fast runs stay fast. A 10 s delay keeps the banner away.
    const quick = await scan(`${origin}/consent/late.html?delay=10000`, {
      ...options,
      settleMs: 0,
    });
    expect(quick.consent).toMatchObject({ bannerFound: false, bannerWaitMs: 0 });
  });

  it('says how long it looked when no banner appeared', async () => {
    const result = await scan(`${origin}/consent/not-a-banner.html`, options);
    expect(result.consent?.bannerFound).toBe(false);
    expect(result.consent?.bannerWaitMs).toBeGreaterThanOrEqual(400);
    expect(result.consent?.bannerWaitMs).toBeLessThan(2_000);
  });

  it('handles a self-built banner inside an open shadow root', async () => {
    const result = await scan(`${origin}/consent/shadow-banner.html`, {
      ...options,
      settingsCheck: true,
    });
    expect(result.consent).toMatchObject({
      bannerFound: true,
      rejected: true,
      acceptLabel: 'Alle akzeptieren',
      rejectLabel: 'Alle ablehnen',
      settings: {
        outcome: 'saved',
        openLabel: 'Einstellungen',
        saveLabel: 'Auswahl speichern',
        switchedOff: 2,
        preselected: ['Statistik', 'Marketing'],
      },
    });
    expect(result.findings.map((f) => f.ruleId)).toEqual(['consent-preselected']);

    // The words that tell a consent banner from other buttons are only inside the shadow root.
    const hidden = await scan(`${origin}/consent/shadow-banner-only.html`, {
      ...options,
      settingsCheck: true,
    });
    expect(hidden.consent).toMatchObject({
      bannerFound: true,
      rejected: true,
      settings: { outcome: 'saved', switchedOff: 2 },
    });
  });

  it('reads the IAB TCF API after rejecting too', async () => {
    const clean = await scan(`${origin}/consent/settings-tcf.html`, options);
    expect(clean.consent).toMatchObject({
      rejected: true,
      tcf: { purposesOn: [], legitimateInterestsOn: [], vendorConsents: 0 },
    });
    expect(clean.findings.map((f) => f.ruleId)).not.toContain('trackers-after-reject');

    const consent = await scan(`${origin}/consent/settings-tcf.html?keep=consent`, options);
    expect(consent.findings).toContainEqual(
      expect.objectContaining({
        ruleId: 'trackers-after-reject',
        severity: 'error',
        subject: 'IAB TCF',
        message: expect.stringContaining('after clicking "Alle ablehnen"'),
      }),
    );

    const li = await scan(`${origin}/consent/settings-tcf.html?keep=li`, {
      ...options,
      lang: 'de',
    });
    expect(li.findings).toContainEqual(
      expect.objectContaining({
        ruleId: 'trackers-after-reject',
        severity: 'warning',
        message: expect.stringContaining('Obwohl „Alle ablehnen“ geklickt wurde'),
      }),
    );
  });

  it('asks a full-screen banner to link the privacy policy and the Impressum', async () => {
    const without = await scan(`${origin}/consent/blocking.html`, options);
    expect(without.findings).toEqual([
      expect.objectContaining({
        ruleId: 'banner-legal-links',
        severity: 'warning',
        message: expect.stringContaining('privacy policy and Impressum'),
      }),
    ]);
    const withLinks = await scan(`${origin}/consent/blocking-links.html`, options);
    expect(withLinks.findings).toEqual([]);
    // A small banner leaves the footer usable, so it isn't asked for its own links.
    const small = await scan(`${origin}/consent/good.html`, options);
    expect(small.findings).toEqual([]);
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

  describe('settings layer', () => {
    const settingsOptions = { ...options, settingsCheck: true };

    it('is skipped unless enabled', async () => {
      const result = await scan(`${origin}/consent/settings-broken.html`, options);
      expect(result.consent?.settings).toBeUndefined();
      expect(result.options?.settingsCheck).toBe(false);
      const evaluation = result.pages[0]?.ruleEvaluations?.find(
        (rule) => rule.ruleId === 'trackers-after-settings',
      );
      expect(evaluation).toMatchObject({ status: 'skipped', reason: 'settings-check-disabled' });
    });

    it('switches everything off, saves and passes a page that respects it', async () => {
      const result = await scan(`${origin}/consent/settings-good.html`, settingsOptions);
      expect(result.consent?.settings).toMatchObject({
        outcome: 'saved',
        reason: 'settings-saved-and-reloaded',
        openLabel: 'Einstellungen',
        saveLabel: 'Auswahl speichern',
        switchedOff: 2,
        preselected: ['Statistik', 'Marketing'],
        afterSaveComplete: true,
      });
      // The page loads nothing after saving, but it ticked both optional categories in advance.
      expect(ruleIds(result.findings)).toEqual(['consent-preselected']);
      expect(result.findings[0]).toMatchObject({ severity: 'error' });
      expect(result.findings[0]?.message).toContain('"Statistik", "Marketing"');
    });

    it('passes a layer that starts with every optional category off', async () => {
      const result = await scan(`${origin}/consent/settings-good.html?unticked`, settingsOptions);
      expect(result.consent?.settings).toMatchObject({ outcome: 'saved', switchedOff: 0 });
      expect(result.consent?.settings?.preselected ?? []).toEqual([]);
      expect(result.findings).toEqual([]);
    });

    describe('objecting to legitimate interest', () => {
      it('uses the "object to all" button in the legitimate-interest tab', async () => {
        const result = await scan(
          `${origin}/consent/settings-tcf-li.html?object=all`,
          settingsOptions,
        );
        expect(result.consent?.settings).toMatchObject({
          outcome: 'saved',
          legitimateInterest: {
            openLabel: 'Berechtigtes Interesse',
            objectAllLabel: 'Allen widersprechen',
          },
          tcf: { purposesOn: [], legitimateInterestsOn: [] },
        });
        expect(result.findings.map((f) => f.ruleId)).not.toContain('trackers-after-settings');
      });

      it("finds a plain legitimate-interest button and Quantcast's Hungarian labels", async () => {
        const result = await scan(
          `${origin}/consent/settings-tcf-li.html?quantcast`,
          settingsOptions,
        );
        expect(result.consent?.settings).toMatchObject({
          legitimateInterest: {
            openLabel: 'JOGOS ÉRDEK',
            objectAllLabel: 'TILTAKOZÁS AZ ÖSSZES ELLEN',
          },
          tcf: { legitimateInterestsOn: [] },
        });
      });

      it('switches the toggles in the tab off when there is no such button', async () => {
        const result = await scan(`${origin}/consent/settings-tcf-li.html`, settingsOptions);
        expect(result.consent?.settings).toMatchObject({
          outcome: 'saved',
          legitimateInterest: { openLabel: 'Berechtigtes Interesse', switchedOff: 2 },
          tcf: { legitimateInterestsOn: [] },
        });
        expect(result.findings.map((f) => f.ruleId)).not.toContain('trackers-after-settings');
      });
    });

    describe('IAB TCF readout', () => {
      it('records an empty TCF state and passes when everything is off', async () => {
        const result = await scan(`${origin}/consent/settings-tcf.html`, settingsOptions);
        expect(result.consent?.settings?.tcf).toEqual({
          purposesOn: [],
          legitimateInterestsOn: [],
          vendorConsents: 0,
          vendorLegitimateInterests: 0,
        });
        expect(ruleIds(result.findings)).toEqual(['consent-preselected']);
      });

      it('reports consent the TCF API still holds as an error', async () => {
        const result = await scan(
          `${origin}/consent/settings-tcf.html?keep=consent`,
          settingsOptions,
        );
        expect(result.consent?.settings?.tcf).toMatchObject({ purposesOn: [1], vendorConsents: 1 });
        // The reject path reports the same stored consent under trackers-after-reject.
        expect(result.findings.filter((f) => f.ruleId === 'trackers-after-settings')).toEqual([
          expect.objectContaining({
            ruleId: 'trackers-after-settings',
            severity: 'error',
            subject: 'IAB TCF',
            evidence: expect.arrayContaining(['TCF purpose consents: 1']),
          }),
        ]);
      });

      it('reports legitimate interest left on as a warning', async () => {
        const result = await scan(`${origin}/consent/settings-tcf.html?keep=li`, settingsOptions);
        expect(result.consent?.settings?.tcf).toMatchObject({
          legitimateInterestsOn: [2, 7],
          vendorLegitimateInterests: 1,
        });
        const settings = result.findings.filter((f) => f.ruleId === 'trackers-after-settings');
        expect(settings).toEqual([
          expect.objectContaining({ severity: 'warning', subject: 'IAB TCF' }),
        ]);
        expect(settings[0]?.message).toContain('purposes 2, 7');
      });
    });

    it('saves with "Elfogadom a kiválasztottakat" (telekom.hu)', async () => {
      const result = await scan(`${origin}/consent/settings-hu-selected.html`, {
        ...settingsOptions,
        region: 'hu',
      });
      expect(result.consent?.settings).toMatchObject({
        outcome: 'saved',
        openLabel: 'Testreszabás',
        saveLabel: 'Elfogadom a kiválasztottakat',
        switchedOff: 2,
      });
      expect(ruleIds(result.findings)).toEqual(['consent-preselected']);
    });

    it('picks the narrowest level when categories are radio buttons (otpbank.hu)', async () => {
      const result = await scan(`${origin}/consent/settings-radio-levels.html`, {
        ...settingsOptions,
        region: 'hu',
      });
      expect(result.consent?.settings).toMatchObject({
        outcome: 'saved',
        saveLabel: 'Elfogadom a fenti sütibeállítások használatát',
        switchedOff: 1,
        preselected: ['Legbővebb szint: Statisztikai és reklám célú sütik'],
      });
      expect(result.findings.map((f) => f.ruleId)).not.toContain('trackers-after-settings');
    });

    it('says the banner did not show in the second browser, not that the browser failed', async () => {
      onceServed = false;
      const result = await scan(`${origin}/banner-once`, settingsOptions);
      expect(result.consent?.bannerFound).toBe(true);
      expect(result.consent?.settings).toEqual({
        outcome: 'banner-not-shown',
        reason: 'banner-not-shown',
      });
      const evaluation = result.pages[0]?.ruleEvaluations?.find(
        (rule) => rule.ruleId === 'trackers-after-settings',
      );
      expect(evaluation).toMatchObject({
        outcome: 'not-evaluable',
        explanation: 'banner-not-shown',
      });
    });

    it('leaves checkboxes outside the consent layer alone', async () => {
      const result = await scan(`${origin}/consent/settings-with-login.html`, settingsOptions);
      expect(result.consent?.settings).toMatchObject({ outcome: 'saved', switchedOff: 2 });
      expect(ruleIds(result.findings)).toEqual(['consent-preselected']);
    });

    it('never saves with a button that confirms all, whatever its verb', async () => {
      const result = await scan(`${origin}/consent/settings-confirm-all.html`, settingsOptions);
      expect(result.consent?.settings).toMatchObject({
        outcome: 'saved',
        saveLabel: 'Auswahl bestätigen',
        switchedOff: 2,
      });
      expect(ruleIds(result.findings)).toEqual(['consent-preselected']);
    });

    it('names the Usercentrics v3 banner and uses its own settings and save buttons', async () => {
      const result = await scan(`${origin}/consent/usercentrics-v3.html`, settingsOptions);
      expect(result.consent).toMatchObject({
        cmp: 'Usercentrics',
        outcome: 'reject-succeeded',
        rejectLabel: 'Ablehnen',
      });
      expect(result.consent?.settings).toMatchObject({
        outcome: 'saved',
        openLabel: 'Cookie Einstellungen',
        saveLabel: 'Einstellungen speichern',
        switchedOff: 1,
      });
      expect(result.findings.map((f) => f.ruleId)).not.toContain('trackers-after-settings');
    });

    it('catches trackers that load after saving with everything off', async () => {
      const result = await scan(`${origin}/consent/settings-broken.html`, settingsOptions);
      expect(ruleIds(result.findings)).toEqual(['trackers-after-settings', 'consent-preselected']);
      expect(result.findings[0]?.message).toContain('Auswahl speichern');
      expect(result.findings[0]?.evidence[0]).toContain('G-SETTINGS');
    });

    it('understands a Hungarian banner, its settings and its links', async () => {
      const result = await scan(`${origin}/consent/hungarian.html`, {
        ...settingsOptions,
        region: 'hu',
      });
      expect(result.consent).toMatchObject({
        rejected: true,
        acceptLabel: 'Elfogadom',
        rejectLabel: 'Elutasítom',
        settingsControl: { found: true, label: 'Süti beállítások' },
        settings: {
          outcome: 'saved',
          openLabel: 'Beállítások',
          saveLabel: 'Beállítások mentése',
          switchedOff: 2,
        },
      });
      expect(result.region).toBe('hu');
      expect(ruleIds(result.findings)).toEqual(['consent-preselected']);
    });

    it('reports a banner without a settings control', async () => {
      const result = await scan(`${origin}/consent/good.html`, settingsOptions);
      expect(result.consent?.settings).toMatchObject({ outcome: 'no-settings-control' });
      const evaluation = result.pages[0]?.ruleEvaluations?.find(
        (rule) => rule.ruleId === 'trackers-after-settings',
      );
      expect(evaluation).toMatchObject({
        status: 'not-evaluable',
        explanation: 'no-settings-control',
      });
    });
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

  describe('a reject control less prominent than accept', () => {
    const prominence = (result: ScanResult) =>
      result.findings.filter((f) => f.ruleId === 'reject-less-prominent');

    it('passes two buttons of the same style', async () => {
      const result = await scan(`${origin}/consent/prominence.html`, options);
      expect(result.consent).toMatchObject({ rejected: true, rejectLabel: 'Reject all' });
      expect(result.findings).toEqual([]);
    });

    it('notes a reject text link next to an accept button, with the measurements', async () => {
      const result = await scan(`${origin}/consent/prominence.html?variant=link`, options);
      const [finding] = prominence(result);
      expect(finding).toMatchObject({ severity: 'info' });
      expect(finding?.message).toContain('shown as plain text');
      expect(finding?.message).toContain('times its size');
      expect(finding?.evidence[0]).toMatch(
        /^accept "Accept all": button, \d+×\d+ px, contrast [\d.]+:1$/,
      );
      expect(finding?.evidence[1]).toMatch(/^reject "Reject all": plain text, /);
    });

    it('notes a light-grey reject button', async () => {
      const result = await scan(`${origin}/consent/prominence.html?variant=grey`, options);
      const [finding] = prominence(result);
      expect(finding?.message).toContain('low text contrast');
      expect(finding?.message).not.toContain('plain text');
    });
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

  const bannerRules = ['trackers-after-reject', 'reject-option', 'consent-settings-link'];
  const startEvaluations = (result: Awaited<ReturnType<typeof scan>>) =>
    (result.pages[0]?.ruleEvaluations ?? []).filter((e) => bannerRules.includes(e.ruleId));

  it('skips the banner rules when no banner is needed', async () => {
    const result = await scan(`${origin}/clean/`, options);
    expect(startEvaluations(result).map((e) => [e.ruleId, e.status, e.reason])).toEqual(
      bannerRules.map((ruleId) => [ruleId, 'skipped', 'no-consent-needed']),
    );
    expect(assessCoverage(result).complete).toBe(true);
  });

  it('keeps them not evaluable when something needing consent loaded without a banner', async () => {
    const result = await scan(`${origin}/leaky/`, options);
    expect(result.consent?.bannerFound).toBe(false);
    expect(startEvaluations(result).every((e) => e.status === 'not-evaluable')).toBe(true);
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
