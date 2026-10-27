import { describe, expect, it } from 'vitest';
import { formatMarkdown, formatSarif, formatText } from '../src/reporters/index.js';
import { scan } from '../src/scanner.js';
import type { ScanProgressEvent } from '../src/types.js';

describe('opaque page identity', () => {
  it('correlates multiple redacted pages and redirected attempts without hashing their paths', async () => {
    const events: ScanProgressEvent[] = [];
    const origin = 'https://identity.invalid';
    const result = await scan(`${origin}/SECRET?token=SECRET`, {
      maxPages: 4,
      settleMs: 0,
      consentCheck: false,
      onProgress: (event) => events.push(event),
      networkAdapter: async ({ url }) => {
        const path = new URL(url).pathname;
        if (path === '/alias') return { status: 302, headers: { location: '/second' } };
        const body =
          path === '/second'
            ? '<p>Second</p>'
            : '<a href="/alias">Alias</a><a href="/second">Second</a>';
        return { status: 200, headers: { 'content-type': 'text/html' }, body };
      },
    });
    expect(result.pages).toHaveLength(2);
    expect(new Set(result.pages.map((page) => page.pageId)).size).toBe(2);
    expect(new Set(result.pages.map((page) => page.url)).size).toBe(1);
    const captures = events.filter((event) => event.stage === 'page-captured');
    expect(captures).toHaveLength(3);
    expect(captures[1]?.pageId).toBe(captures[2]?.pageId);
    expect(captures[1]?.captureId).not.toBe(captures[2]?.captureId);
    expect(events.every((event) => event.scanId === result.scanId)).toBe(true);
    for (const page of result.pages) {
      expect(page.ruleEvaluations?.every((rule) => rule.pageId === page.pageId)).toBe(true);
      expect(result.findings.filter((finding) => finding.pageId === page.pageId)).toHaveLength(2);
    }
    expect(JSON.stringify(result)).not.toContain('SECRET');
    expect(JSON.stringify(events)).not.toContain('SECRET');
    expect([...formatMarkdown(result).matchAll(/#### /g)]).toHaveLength(2);
    for (const page of result.pages) {
      expect(formatText(result)).toContain(page.pageId);
      expect(formatMarkdown(result)).toContain(page.pageId);
    }
    const run = JSON.parse(formatSarif(result)).runs[0];
    expect(
      new Set(
        run.results.map(
          (item: {
            locations: Array<{ physicalLocation: { artifactLocation: { uri: string } } }>;
          }) => item.locations[0]?.physicalLocation.artifactLocation.uri,
        ),
      ).size,
    ).toBe(2);
    expect(
      run.results.every(
        (item: { properties: { pageId: string }; partialFingerprints?: unknown }) =>
          result.pages.some((page) => page.pageId === item.properties.pageId) &&
          item.partialFingerprints === undefined,
      ),
    ).toBe(true);
  });
  it('does not claim cross-scan stability for IDs derived independently of URL data', async () => {
    const options = {
      settleMs: 0,
      consentCheck: false,
      rules: [],
      networkAdapter: async () => ({ status: 200, body: '<p>Example</p>' }),
    };
    const first = await scan('https://identity.invalid', options);
    const second = await scan('https://identity.invalid', options);
    expect(first.scanId).not.toBe(second.scanId);
    expect(first.pages[0]?.pageId).not.toBe(second.pages[0]?.pageId);
  });
});
