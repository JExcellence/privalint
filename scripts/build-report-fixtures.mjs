import { mkdir, writeFile } from 'node:fs/promises';
import { NetworkError, scan } from '../dist/index.js';

// Build first. All resources are synthetic adapter responses; there is no internet dependency.
const origin = 'https://fixtures.invalid';
const root = new URL('../test/fixtures/reports/', import.meta.url);
await mkdir(root, { recursive: true });
const links = '<a href="/impressum">Impressum</a><a href="/privacy">Privacy policy</a>';
const banner =
  '<div role="dialog">Cookies <button>Accept all</button><button>Reject all</button></div>';
const html = (extra) => ({
  status: 200,
  headers: { 'content-type': 'text/html' },
  body: links + banner + extra,
});
for (const scenario of ['complete', 'partial', 'skipped', 'policy-overridden']) {
  const report = await scan(origin, {
    settleMs: 0,
    ...(scenario === 'policy-overridden' ? { allow: { vendors: ['Google Analytics'] } } : {}),
    networkAdapter: async ({ url }) => {
      if (url !== `${origin}/`) {
        if (scenario === 'partial') throw new NetworkError('security-blocked');
        if (scenario === 'skipped') throw new NetworkError('skipped', undefined, 'beacon');
        return { status: 200, headers: { 'content-type': 'text/javascript' }, body: '' };
      }
      if (scenario === 'partial') return html('<script src="/blocked.js"></script>');
      if (scenario === 'skipped')
        return html('<script>navigator.sendBeacon("/beacon","example")</script>');
      if (scenario === 'policy-overridden')
        return html('<script src="https://www.google-analytics.com/g.js"></script>');
      return html('');
    },
  });
  const pageIds = new Map(
    report.pages.map((page, index) => [
      page.pageId,
      `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    ]),
  );
  report.scanId = '00000000-0000-4000-8000-000000000000';
  report.scannedAt = '2026-10-27T00:00:00.000Z';
  report.durationMs = 0;
  for (const page of report.pages) {
    page.pageId = pageIds.get(page.pageId);
    for (const evaluation of page.ruleEvaluations) evaluation.pageId = page.pageId;
  }
  for (const finding of report.findings) finding.pageId = pageIds.get(finding.pageId);
  await writeFile(new URL(`${scenario}.json`, root), `${JSON.stringify(report, null, 2)}\n`);
  if (scenario === 'complete') {
    const previous = structuredClone(report);
    previous.schemaVersion = '1.0.0';
    delete previous.scanId;
    for (const page of previous.pages) {
      delete page.pageId;
      for (const evaluation of page.ruleEvaluations) delete evaluation.pageId;
    }
    for (const finding of previous.findings) delete finding.pageId;
    await writeFile(new URL('v1.0.0.json', root), `${JSON.stringify(previous, null, 2)}\n`);
  }
}
const legacy = {
  siteUrl: 'https://fixtures.invalid/',
  lang: 'en',
  region: 'de',
  scannedAt: '2026-10-27T00:00:00.000Z',
  durationMs: 0,
  pages: [
    {
      url: 'https://fixtures.invalid/',
      finalUrl: 'https://fixtures.invalid/',
      status: 200,
      requestCount: 1,
      cookieCount: 0,
    },
  ],
  findings: [],
  rules: [],
};
await writeFile(new URL('legacy.json', root), `${JSON.stringify(legacy, null, 2)}\n`);
