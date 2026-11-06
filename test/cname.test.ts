import { describe, expect, it } from 'vitest';
import { findCnameCloaks } from '../src/cname.js';
import { preConsentTrackers } from '../src/rules/index.js';
import { request, SITE, snapshot } from './helpers.js';

const records: Record<string, string[]> = {
  'metrics.example.de': ['example.de.eulerian.net.'],
  'example.de.eulerian.net': [],
  'smetrics.example.de': ['example.de.sc.omtrdc.net'],
  'cdn.example.de': ['example.de.cdn.cloudflare.net'],
  'shop.example.de': [],
};
const stub = async (host: string) => records[host] ?? [];

describe('CNAME cloaking', () => {
  it('finds first-party subdomains whose CNAME chain reaches a tracker', async () => {
    const page = snapshot({
      requests: [
        request('https://metrics.example.de/col?x=1'),
        request('https://smetrics.example.de/b/ss/rsid/1'),
        request('https://cdn.example.de/app.js'),
        request('https://shop.example.de/'),
        request('https://example.de/style.css'),
      ],
    });
    await findCnameCloaks([page], SITE, stub);
    expect(page.cnameCloaks).toEqual([
      {
        host: 'metrics.example.de',
        chain: ['example.de.eulerian.net'],
        vendor: 'Eulerian',
        category: 'analytics',
      },
      {
        host: 'smetrics.example.de',
        chain: ['example.de.sc.omtrdc.net'],
        vendor: 'Adobe Experience Cloud',
        category: 'analytics',
      },
    ]);
  });

  it('reports cloaked requests as the tracker behind them, with the chain as evidence', async () => {
    const page = snapshot({ requests: [request('https://metrics.example.de/col?x=1')] });
    await findCnameCloaks([page], SITE, stub);
    const findings = preConsentTrackers.check({ page, siteUrl: SITE, lang: 'en', region: 'de' });
    expect(findings).toEqual([
      expect.objectContaining({
        subject: 'Eulerian',
        severity: 'error',
        evidence: [
          'request https://metrics.example.de/col?x=1 (CNAME metrics.example.de → example.de.eulerian.net)',
        ],
      }),
    ]);
  });

  it('survives resolver errors and loops', async () => {
    const page = snapshot({
      requests: [request('https://a.example.de/'), request('https://b.example.de/')],
    });
    await findCnameCloaks([page], SITE, async (host) => {
      if (host === 'a.example.de') throw new Error('ENOTFOUND');
      return host === 'b.example.de' ? ['c.example.net'] : ['b.example.de'];
    });
    expect(page.cnameCloaks).toBeUndefined();
  });
});
