import { describe, expect, it } from 'vitest';
import { assessPage } from '../src/assessment.js';
import { defaultRules } from '../src/rules/index.js';
import { newStorageKeys } from '../src/storage.js';
import type { PageSnapshot, RuleEvaluation } from '../src/types.js';
import { SITE, snapshot } from './helpers.js';

const context = { lang: 'en', region: 'de', isStart: false, consentEnabled: false } as const;

function evaluation(page: PageSnapshot, ruleId: string): RuleEvaluation | undefined {
  return assessPage(page, defaultRules, SITE, context).evaluations.find(
    (result) => result.ruleId === ruleId,
  );
}

describe('a page read that failed', () => {
  const privacyLink = [{ text: 'Datenschutz', href: 'https://example.de/datenschutz' }];

  it('counts as checked when the forms were read and none lack a privacy link', () => {
    const page = snapshot({ links: privacyLink, forms: [] });
    expect(evaluation(page, 'form-privacy-notice')).toMatchObject({
      outcome: 'checked-no-finding',
      partial: false,
    });
  });

  it.each([
    ['forms', 'form-privacy-notice'],
    ['forms', 'form-preticked-consent'],
    ['forms', 'mixed-content'],
    ['security', 'mixed-content'],
    ['security', 'referrer-policy'],
    ['fingerprinting', 'fingerprinting'],
    ['storage', 'pre-consent-trackers'],
  ] as const)('leaves %s unread, so %s proves nothing', (read, ruleId) => {
    const page = snapshot({ links: privacyLink, unreadParts: [read] });
    expect(evaluation(page, ruleId)).toMatchObject({
      status: 'executed',
      partial: true,
      outcome: 'not-evaluable',
      explanation: 'incomplete-observation',
    });
  });

  it('does not touch rules that never use the failed read', () => {
    const page = snapshot({ links: privacyLink, unreadParts: ['forms'] });
    expect(evaluation(page, 'privacy-policy-link')).toMatchObject({
      outcome: 'checked-no-finding',
      partial: false,
    });
  });

  it('keeps what a rule did see, marked partial', () => {
    const page = snapshot({
      links: privacyLink,
      insecureResources: ['http://img.example.de/logo.png'],
      unreadParts: ['forms'],
    });
    expect(evaluation(page, 'mixed-content')).toMatchObject({
      outcome: 'finding-detected',
      partial: true,
    });
  });

  it('stays partial when the DOM was read but a request never finished', () => {
    const page = snapshot({
      links: privacyLink,
      unreadParts: ['forms'],
      capture: {
        complete: false,
        beforeConsentComplete: false,
        document: true,
        diagnostics: {} as never,
      },
    });
    expect(evaluation(page, 'form-privacy-notice')?.outcome).toBe('not-evaluable');
  });
});

describe('a banner read that failed', () => {
  const start = { ...context, isStart: true, consentEnabled: true };
  const banner = {
    bannerFound: true,
    rejected: false,
    acceptLabel: 'Alle akzeptieren',
    rejectLabel: 'Ablehnen',
  };
  const outcome = (page: PageSnapshot, ruleId: string) =>
    assessPage(page, defaultRules, SITE, start).evaluations.find((e) => e.ruleId === ruleId);

  it.each([
    ['layout', 'banner-legal-links'],
    ['layout', 'banner-language'],
    ['controls', 'reject-less-prominent'],
    ['keyboard', 'banner-keyboard'],
  ] as const)('leaves the %s unread, so %s proves nothing', (read, ruleId) => {
    const page = snapshot({ language: 'de', consent: { ...banner, bannerUnread: [read] } });
    expect(outcome(page, ruleId)).toMatchObject({ partial: true, outcome: 'not-evaluable' });
  });

  it('does not call a failed search after rejecting a missing settings link', () => {
    const page = snapshot({
      consent: {
        ...banner,
        rejected: true,
        afterReject: { requests: [], cookies: [], storage: [] },
        afterRejectComplete: true,
        bannerUnread: ['settings-control'],
      },
    });
    expect(outcome(page, 'consent-settings-link')).toMatchObject({
      partial: true,
      outcome: 'not-evaluable',
    });
  });

  it('still counts a banner whose reads all worked as checked', () => {
    const page = snapshot({ language: 'de', consent: { ...banner } });
    expect(outcome(page, 'banner-keyboard')).toMatchObject({
      partial: false,
      outcome: 'checked-no-finding',
    });
  });
});

describe('newStorageKeys', () => {
  const keys = [{ area: 'local' as const, name: '_ga' }];

  it('knows nothing new when either read failed', () => {
    expect(newStorageKeys(undefined, keys)).toBeUndefined();
    expect(newStorageKeys(keys, undefined)).toBeUndefined();
  });

  it('knows nothing new when a read hit the cap of 200 keys', () => {
    const full = Array.from({ length: 200 }, (_, i) => ({ area: 'local' as const, name: `k${i}` }));
    expect(newStorageKeys(full, [...full.slice(1), ...keys])).toBeUndefined();
    expect(newStorageKeys(keys, [...keys, { area: 'session', name: 'new' }])).toEqual([
      { area: 'session', name: 'new' },
    ]);
  });
});
