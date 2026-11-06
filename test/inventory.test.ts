import { describe, expect, it } from 'vitest';
import { formatMarkdown } from '../src/reporters/index.js';
import { thirdPartyInventory } from '../src/third-party-inventory.js';
import type { ScanResult } from '../src/types.js';
import { request, SITE, snapshot } from './helpers.js';

describe('third-party inventory', () => {
  it('lists hosts outside the site with phases, counts and known vendors, busiest first', () => {
    const start = snapshot({
      pageId: 'p1',
      requests: [
        request('https://example.de/app.js'),
        request('https://cdn.example.de/img.png'),
        request('https://www.google-analytics.com/g/collect?v=2'),
        request('https://www.google-analytics.com/g/collect?v=2&en=scroll'),
        request('https://unknown-widget.example.net/w.js?user=jane%40example.org'),
      ],
      consent: {
        bannerFound: true,
        rejected: true,
        afterReject: {
          requests: [request('https://www.google-analytics.com/g/collect?v=2')],
          cookies: [],
        },
      },
    });
    const second = snapshot({
      pageId: 'p2',
      url: 'https://example.de/kontakt',
      finalUrl: 'https://example.de/kontakt',
      requests: [request('https://fonts.gstatic.com/s/roboto.woff2')],
    });
    expect(thirdPartyInventory([start, second], SITE)).toEqual([
      {
        host: 'www.google-analytics.com',
        site: 'google-analytics.com',
        firstPageId: 'p1',
        phases: ['before-consent', 'after-reject'],
        requests: 3,
        vendor: 'Google Analytics',
      },
      {
        host: 'fonts.gstatic.com',
        site: 'gstatic.com',
        firstPageId: 'p2',
        phases: ['before-consent'],
        requests: 1,
        vendor: 'Google Fonts',
      },
      {
        host: 'unknown-widget.example.net',
        site: 'example.net',
        firstPageId: 'p1',
        phases: ['before-consent'],
        requests: 1,
      },
    ]);
  });

  it('shows the inventory as a collapsed table in Markdown, hosts only', () => {
    const result = {
      siteUrl: 'https://example.de/',
      lang: 'en',
      region: 'de',
      scannedAt: '2026-01-01T00:00:00.000Z',
      durationMs: 1000,
      pages: [],
      findings: [],
      rules: [],
      thirdParties: [
        {
          host: 'unknown-widget.example.net',
          site: 'example.net',
          phases: ['before-consent'],
          requests: 2,
        },
      ],
    } as unknown as ScanResult;
    const output = formatMarkdown(result);
    expect(output).toContain('<details><summary>Hosts outside the site (1)</summary>');
    expect(output).toContain('| `unknown-widget.example.net` |  | 2 | before-consent |');
  });
});
