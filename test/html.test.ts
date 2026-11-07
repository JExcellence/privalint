import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { applyBaseline } from '../src/baseline.js';
import { escape, formatHtml } from '../src/reporters/html.js';
import { format } from '../src/reporters/index.js';
import type { Finding, ScanResult } from '../src/types.js';

const hostile = '"><script>alert(1)</script><img src=x onerror=alert(2)>';

const finding = (overrides: Partial<Finding> = {}): Finding => ({
  ruleId: 'pre-consent-trackers',
  severity: 'error',
  message: `Google Analytics loads before consent ${hostile}`,
  pageUrl: `https://example.de/?q=${hostile}`,
  evidence: [`request https://www.google-analytics.com/g/collect?x=${hostile}`],
  fix: 'Load it only after consent.',
  references: ['§ 25 Abs. 1 TDDDG'],
  subject: 'Google Analytics',
  ...overrides,
});

const result = (findings: Finding[], extra: Partial<ScanResult> = {}): ScanResult => ({
  schemaVersion: '1.5.0',
  scannerVersion: '0.9.1',
  siteUrl: 'https://example.de/',
  lang: 'en',
  region: 'de',
  scannedAt: '2026-11-06T00:00:00.000Z',
  durationMs: 2500,
  pages: [],
  findings,
  rules: [],
  ...extra,
});

/** Anything in a tag that would make a browser fetch or run something. */
const ACTIVE = /<script|<img|<link|<iframe|<object|<embed|\ssrc=|\shref=|url\(|@import|\son\w+=/i;
/** The real tags of the markup; escaped scanned text has no "<" left. */
const activeTags = (html: string) =>
  (html.match(/<[^>]+>/g) ?? []).filter((tag) => ACTIVE.test(tag));

describe('formatHtml', () => {
  it('escapes every scanned value and loads nothing', () => {
    const html = formatHtml(
      result([finding(), finding({ severity: 'info', ruleId: 'google-fonts', subject: 'x' })], {
        thirdParties: [
          {
            host: `evil.example${hostile}`,
            site: 'evil.example',
            phases: ['before-consent'],
            requests: 2,
            vendor: hostile,
          },
        ],
        pages: [
          {
            url: `https://example.de/broken${hostile}`,
            finalUrl: 'https://example.de/broken',
            status: null,
            error: hostile,
            requestCount: 0,
            cookieCount: 0,
          } as ScanResult['pages'][number],
        ],
      }),
    );
    expect(activeTags(html)).toEqual([]);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain(
      `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">`,
    );
  });

  it('shows findings with severity, evidence, fix, legal basis and the disclaimer', () => {
    const html = formatHtml(result([finding({ message: 'GA before consent' })]));
    expect(html).toMatch(/^<!doctype html>\n<html lang="en">/);
    expect(html).toContain('<span class="badge error">Error</span> GA before consent');
    expect(html).toContain('<details><summary>Evidence (1)</summary>');
    expect(html).toContain('<strong>fix:</strong> Load it only after consent.');
    expect(html).toContain('legal basis: § 25 Abs. 1 TDDDG');
    expect(html).toContain('A clean result is not proof of GDPR compliance.');
    expect(html).toContain('prefers-color-scheme:dark');
  });

  it('marks new findings when compared with a baseline, and reports a clean scan', () => {
    const compared = applyBaseline(result([finding()]), []);
    expect(formatHtml(compared)).toContain('<span class="new">new</span>');
    expect(formatHtml(compared)).toContain(
      'Compared with the baseline: 1 new, 0 existing, 0 fixed',
    );
    const clean = formatHtml({ ...result([]), lang: 'de' });
    expect(clean).toContain('<html lang="de">');
    expect(clean).toContain('class="clean"');
  });

  it('is reachable through the format switch and renders a real report fixture', async () => {
    const report = JSON.parse(
      await readFile(new URL('./fixtures/reports/policy-overridden.json', import.meta.url), 'utf8'),
    ) as ScanResult;
    const html = format(report, 'html');
    expect(activeTags(html)).toEqual([]);
    expect(html).toContain('Google Analytics');
  });

  it('is exported from the package entry with the other formatters', async () => {
    const entry = await import('../src/index.js');
    expect(entry.formatHtml).toBe(formatHtml);
    expect(entry.FORMATS).toContain('html');
    expect(typeof entry.format).toBe('function');
  });

  it('escapes the five HTML special characters', () => {
    expect(escape(`<a href="x" title='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });
});
