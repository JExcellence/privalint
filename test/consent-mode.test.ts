import { describe, expect, it } from 'vitest';
import { describeConsentMode, readConsentMode } from '../src/consent-mode.js';
import { preConsentTrackers } from '../src/rules/pre-consent-trackers.js';
import { trackersAfterClose } from '../src/rules/trackers-after-close.js';
import { trackersAfterReject } from '../src/rules/trackers-after-reject.js';
import { trackersAfterSettings } from '../src/rules/trackers-after-settings.js';
import type { PageSnapshot, Rule } from '../src/types.js';
import { request, SITE, snapshot } from './helpers.js';

/** GA4 hits as gtag.js sent them in the 2026-11-17 check, one per Consent Mode state. */
const collect = (gcs: string) =>
  request(
    `https://region1.google-analytics.com/g/collect?v=2&tid=G-0000000000&gcs=${gcs}&gcd=13p3p3p2p5l1&en=page_view`,
    'fetch',
  );

const run = (rule: Rule, page: PageSnapshot, lang: 'en' | 'de' = 'en') =>
  rule.check({ siteUrl: SITE, page, lang });

describe('readConsentMode', () => {
  it.each([
    ['G100', false, false],
    ['G101', false, true],
    ['G110', true, false],
    ['G111', true, true],
  ])('reads %s as ad_storage %s, analytics_storage %s', (gcs, adStorage, analyticsStorage) => {
    expect(readConsentMode(collect(gcs).url)).toEqual({ gcs, adStorage, analyticsStorage });
  });

  it('leaves a type that was not set undefined', () => {
    expect(readConsentMode(collect('G1-1').url)).toEqual({ gcs: 'G1-1', analyticsStorage: true });
  });

  it.each([
    'https://region1.google-analytics.com/g/collect?v=2',
    'https://region1.google-analytics.com/g/collect?gcs=G2',
    'https://region1.google-analytics.com/g/collect?gcs=G1000',
    'not a url',
  ])('finds no state in %s', (url) => {
    expect(readConsentMode(url)).toBeUndefined();
  });

  it('describes a state in the report language', () => {
    const state = readConsentMode(collect('G101').url);
    if (state === undefined) throw new Error('no state');
    expect(describeConsentMode(state, 'de')).toBe(
      'Consent Mode: ad_storage abgelehnt, analytics_storage erlaubt (gcs=G101)',
    );
  });
});

describe('Consent Mode before consent', () => {
  it('explains pings with storage denied, which still reach Google', () => {
    const [finding] = run(preConsentTrackers, snapshot({ requests: [collect('G100')] }));
    expect(finding).toMatchObject({ severity: 'error', subject: 'Google Analytics' });
    expect(finding?.message).toContain('Consent Mode pings before the visitor has given consent');
    expect(finding?.evidence[0]).toBe(
      'Consent Mode: ad_storage denied, analytics_storage denied (gcs=G100)',
    );
    expect(finding?.fix).toContain('they do not replace consent');
  });

  it('reports storage granted before any choice with its own message', () => {
    const [finding] = run(
      preConsentTrackers,
      snapshot({ requests: [collect('G100'), collect('G111')] }),
      'de',
    );
    expect(finding?.severity).toBe('error');
    expect(finding?.message).toBe(
      'Google Analytics meldet Google eine erteilte Einwilligung, bevor der Besucher etwas ausgewählt hat (Google Consent Mode).',
    );
    expect(finding?.evidence.slice(0, 2)).toEqual([
      'Consent Mode: ad_storage erlaubt, analytics_storage erlaubt (gcs=G111)',
      'Consent Mode: ad_storage abgelehnt, analytics_storage abgelehnt (gcs=G100)',
    ]);
    expect(finding?.fix).toContain('„denied“');
  });

  it('does not call a state that sets neither type denied', () => {
    const [finding] = run(preConsentTrackers, snapshot({ requests: [collect('G1--')] }));
    expect(finding?.message).toBe(
      'Google Analytics (analytics) runs before the visitor has given consent.',
    );
    expect(finding?.evidence[0]).toBe(
      'Consent Mode: ad_storage not set, analytics_storage not set (gcs=G1--)',
    );
  });

  it('keeps the plain message for requests without Consent Mode', () => {
    const [finding] = run(
      preConsentTrackers,
      snapshot({ requests: [request('https://region1.google-analytics.com/g/collect?v=2')] }),
    );
    expect(finding?.message).toBe(
      'Google Analytics (analytics) runs before the visitor has given consent.',
    );
    expect(finding?.fix).not.toContain('Consent Mode pings');
  });
});

describe('Consent Mode after a choice', () => {
  const after = (gcs: string) => ({ requests: [collect(gcs)], cookies: [], storage: [] });
  const consent = { bannerFound: true, rejectLabel: 'Ablehnen' } as const;

  it('reports storage granted after rejecting as consent the visitor never gave', () => {
    const page = snapshot({
      consent: { ...consent, rejected: true, afterReject: after('G111') },
    });
    const [finding] = run(trackersAfterReject, page);
    expect(finding?.message).toBe(
      'Google Analytics tells Google that consent was granted, although the visitor clicked "Ablehnen" (Google Consent Mode).',
    );
    expect(finding?.severity).toBe('error');
  });

  it('explains denied pings after rejecting', () => {
    const page = snapshot({
      consent: { ...consent, rejected: true, afterReject: after('G100') },
    });
    const [finding] = run(trackersAfterReject, page);
    expect(finding?.message).toContain('still sends Google Consent Mode pings after clicking');
    expect(finding?.fix).toContain('they do not replace consent');
  });

  it('reports granted storage after saving switched-off settings and after closing', () => {
    const settings = snapshot({
      consent: {
        ...consent,
        rejected: false,
        settings: {
          outcome: 'saved',
          reason: 'settings-saved-and-reloaded',
          saveLabel: 'Speichern',
          afterSave: after('G110'),
        },
      },
    });
    expect(run(trackersAfterSettings, settings)[0]?.message).toContain(
      'tells Google that consent was granted',
    );
    const close = snapshot({
      consent: {
        ...consent,
        rejected: false,
        close: {
          outcome: 'closed',
          reason: 'banner-closed-and-reloaded',
          closeLabel: '×',
          afterClose: after('G101'),
        },
      },
    });
    expect(run(trackersAfterClose, close)[0]).toMatchObject({
      message: expect.stringContaining('tells Google that consent was granted'),
      fix: expect.stringContaining('closing the banner must not update it to "granted"'),
    });
    expect(run(trackersAfterSettings, settings)[0]?.fix).toContain('when the settings are saved');
  });
});
