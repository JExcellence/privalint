import { describe, expect, it } from 'vitest';
import { findCnameCloaks } from '../src/cname.js';
import { preConsentTrackers, trackersAfterReject } from '../src/rules/index.js';
import { trackersAfterClose } from '../src/rules/trackers-after-close.js';
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

  it('finds cloaked trackers that load only after a consent choice', async () => {
    const after = (url: string) => ({ requests: [request(url)], cookies: [], storage: [] });
    const page = snapshot({
      consent: {
        bannerFound: true,
        rejectLabel: 'Ablehnen',
        rejected: true,
        afterReject: after('https://metrics.example.de/col?after=reject'),
        close: {
          outcome: 'closed',
          reason: 'banner-closed-and-reloaded',
          closeLabel: '×',
          afterClose: after('https://smetrics.example.de/b/ss/rsid/1'),
        },
      },
    });
    await findCnameCloaks([page], SITE, stub);
    expect(page.cnameCloaks?.map((cloak) => cloak.host)).toEqual([
      'metrics.example.de',
      'smetrics.example.de',
    ]);
    const context = { page, siteUrl: SITE, lang: 'en', region: 'de' } as const;
    // Neither host loaded before the choice, so nothing counts as before consent.
    expect(preConsentTrackers.check(context)).toEqual([]);
    expect(trackersAfterReject.check(context)).toEqual([
      expect.objectContaining({
        subject: 'Eulerian',
        evidence: [
          'request https://metrics.example.de/col?after=reject (CNAME metrics.example.de → example.de.eulerian.net)',
        ],
      }),
    ]);
    expect(trackersAfterClose.check(context)).toEqual([
      expect.objectContaining({ subject: 'Adobe Experience Cloud' }),
    ]);
  });

  it('leaves loads after accepting out', async () => {
    const page = snapshot({
      consent: {
        bannerFound: true,
        rejected: false,
        accept: {
          outcome: 'accepted',
          reason: 'accept-clicked-and-reloaded',
          acceptLabel: 'Akzeptieren',
          afterAccept: {
            requests: [request('https://metrics.example.de/col')],
            cookies: [],
            storage: [],
          },
        },
      },
    });
    await findCnameCloaks([page], SITE, stub);
    expect(page.cnameCloaks).toBeUndefined();
  });

  it('stops resolving when the scan is aborted', async () => {
    const page = snapshot({
      requests: [request('https://metrics.example.de/'), request('https://smetrics.example.de/')],
    });
    const controller = new AbortController();
    const resolved: string[] = [];
    await findCnameCloaks(
      [page],
      SITE,
      async (host) => {
        resolved.push(host);
        controller.abort();
        return records[host] ?? [];
      },
      controller.signal,
    );
    expect(resolved).toEqual(['metrics.example.de', 'example.de.eulerian.net']);
    expect(page.cnameCloaks).toBeUndefined();
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
