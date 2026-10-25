import { describe, expect, it } from 'vitest';
import { findTrackerByCookie, findTrackerByUrl, trackers } from '../src/data/trackers.js';

describe('findTrackerByUrl', () => {
  it('matches subdomains of a listed domain', () => {
    expect(findTrackerByUrl('https://region1.google-analytics.com/g/collect')?.vendor).toBe(
      'Google Analytics',
    );
  });

  it('tells gtag.js apart from a plain GTM container', () => {
    expect(findTrackerByUrl('https://www.googletagmanager.com/gtag/js?id=G-1')?.vendor).toBe(
      'Google Analytics',
    );
    expect(findTrackerByUrl('https://www.googletagmanager.com/gtm.js?id=GTM-1')?.vendor).toBe(
      'Google Tag Manager',
    );
  });

  it('only flags the pixel endpoint on facebook.com, not every embed', () => {
    expect(findTrackerByUrl('https://www.facebook.com/tr?id=1&ev=PageView')?.vendor).toBe(
      'Meta Pixel',
    );
    expect(findTrackerByUrl('https://www.facebook.com/plugins/page.php')).toBeUndefined();
    expect(findTrackerByUrl('https://www.facebook.com/translations/')).toBeUndefined();
    expect(findTrackerByUrl('https://www.facebook.com/tr/')?.vendor).toBe('Meta Pixel');
  });

  it('does not match lookalike hosts', () => {
    expect(findTrackerByUrl('https://notgoogle-analytics.com/x.js')).toBeUndefined();
  });

  it('ignores garbage input', () => {
    expect(findTrackerByUrl('not a url')).toBeUndefined();
  });
});

describe('findTrackerByCookie', () => {
  it('matches by prefix', () => {
    expect(findTrackerByCookie('_ga_ABC123')?.vendor).toBe('Google Analytics');
    expect(findTrackerByCookie('_hjSessionUser_42')?.vendor).toBe('Hotjar');
  });

  it('uses patterns where a prefix would be too broad', () => {
    expect(findTrackerByCookie('mp_0123abcd_mixpanel')?.vendor).toBe('Mixpanel');
    expect(findTrackerByCookie('mp_session')).toBeUndefined();
  });

  it('leaves unrelated cookies alone', () => {
    expect(findTrackerByCookie('session')).toBeUndefined();
  });
});

describe('tracker list', () => {
  it('has a domain for every entry', () => {
    for (const tracker of trackers) {
      expect(tracker.domains.length, tracker.vendor).toBeGreaterThan(0);
    }
  });
});
