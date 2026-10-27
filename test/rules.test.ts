import { describe, expect, it } from 'vitest';
import type { Lang } from '../src/i18n.js';
import {
  adobeFonts,
  googleFonts,
  impressumLink,
  preConsentTrackers,
  privacyPolicyLink,
  thirdPartyCdns,
  thirdPartyEmbeds,
} from '../src/rules/index.js';
import type { Rule } from '../src/types.js';
import { cookie, request, SITE, snapshot } from './helpers.js';

const run = (rule: Rule, page = snapshot(), lang: Lang = 'en') =>
  rule.check({ siteUrl: SITE, page, lang });

describe('pre-consent-trackers', () => {
  it('does not turn failed requests into evidence in direct rule API calls', () => {
    const page = snapshot({
      requests: [
        { ...request('https://fonts.googleapis.com/css2'), outcome: 'failed' },
        { ...request('https://www.google-analytics.com/g/collect'), outcome: 'failed' },
        { ...request('https://cdn.jsdelivr.net/npm/x'), outcome: 'response', status: 503 },
        { ...request('https://www.youtube.com/embed/x'), outcome: 'pending' },
      ],
    });
    for (const rule of [preConsentTrackers, googleFonts, thirdPartyCdns, thirdPartyEmbeds]) {
      expect(run(rule, page)).toEqual([]);
    }
  });
  it('passes a clean page', () => {
    const page = snapshot({ requests: [request('https://example.de/app.js')] });
    expect(run(preConsentTrackers, page)).toEqual([]);
  });

  it('reports one finding per vendor with all evidence', () => {
    const findings = run(
      preConsentTrackers,
      snapshot({
        requests: [
          request('https://www.googletagmanager.com/gtag/js?id=G-1'),
          request('https://region1.google-analytics.com/g/collect?v=2'),
        ],
        cookies: [cookie('_ga'), cookie('_ga_XYZ')],
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ severity: 'error', ruleId: 'pre-consent-trackers' });
    expect(findings[0]?.evidence).toHaveLength(4);
  });

  it('catches third-party cookies by domain', () => {
    const page = snapshot({ cookies: [cookie('IDE', '.doubleclick.net')] });
    expect(run(preConsentTrackers, page)[0]?.message).toContain('Google Ads');
  });

  it('downgrades a bare tag manager to a warning', () => {
    const page = snapshot({
      requests: [request('https://www.googletagmanager.com/gtm.js?id=GTM-1')],
    });
    expect(run(preConsentTrackers, page)[0]?.severity).toBe('warning');
  });
});

describe('additional third-party embeds', () => {
  it.each([
    ['hCaptcha', 'https://js.hcaptcha.com/1/api.js'],
    ['Cloudflare Turnstile', 'https://challenges.cloudflare.com/turnstile/v0/api.js'],
    ['OpenStreetMap tiles', 'https://a.tile.openstreetmap.org/0/0/0.png'],
    ['TikTok embed', 'https://www.tiktok.com/embed.js'],
    ['TikTok embed', 'https://www.tiktok.com/player/v1/12345'],
    ['Calendly', 'https://assets.calendly.com/assets/external/widget.js'],
  ])('recognizes %s as an observed third-party resource', (vendor, url) => {
    expect(run(thirdPartyEmbeds, snapshot({ requests: [request(url)] }))).toMatchObject([
      { subject: vendor, ruleId: 'third-party-embeds' },
    ]);
  });
  it.each([
    'https://hcaptcha.com.evil.invalid/1/api.js',
    'https://challenges.cloudflare.com/something-else',
    'https://www.cloudflare.com/turnstile/v0/api.js',
    'https://www.openstreetmap.org/about',
    'https://www.tiktok.com/about',
    'https://www.tiktok.com/embedding',
    'https://calendly.com.evil.invalid/widget.js',
  ])('does not match unrelated content or lookalike hosts: %s', (url) => {
    expect(run(thirdPartyEmbeds, snapshot({ requests: [request(url)] }))).toEqual([]);
  });
});

describe('google-fonts', () => {
  it('flags font requests to Google', () => {
    const findings = run(
      googleFonts,
      snapshot({
        requests: [
          request('https://fonts.googleapis.com/css2?family=Inter', 'stylesheet'),
          request('https://fonts.gstatic.com/s/inter/v1/a.woff2', 'font'),
        ],
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('error');
    expect(findings[0]?.evidence).toHaveLength(2);
  });

  it('warns about a leftover preconnect', () => {
    const page = snapshot({
      resourceHints: [{ rel: 'preconnect', href: 'https://fonts.gstatic.com/' }],
    });
    expect(run(googleFonts, page)[0]?.severity).toBe('warning');
  });

  it('ignores dns-prefetch, which never contacts Google', () => {
    const page = snapshot({
      resourceHints: [{ rel: 'dns-prefetch', href: 'https://fonts.googleapis.com/' }],
    });
    expect(run(googleFonts, page)).toEqual([]);
  });

  it('passes self-hosted fonts', () => {
    const page = snapshot({ requests: [request('https://example.de/fonts/inter.woff2', 'font')] });
    expect(run(googleFonts, page)).toEqual([]);
  });
});

describe('adobe-fonts', () => {
  it('flags kit and page-view requests to Adobe', () => {
    const findings = run(
      adobeFonts,
      snapshot({
        requests: [
          request('https://use.typekit.net/abc1234.css', 'stylesheet'),
          request(
            'https://use.typekit.net/af/0a1b2c/000000000000000000000000/27/l?primer=x',
            'font',
          ),
          request('https://p.typekit.net/p.css?s=1&k=abc1234', 'stylesheet'),
        ],
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ ruleId: 'adobe-fonts', severity: 'error' });
    expect(findings[0]?.evidence).toHaveLength(3);
  });

  it('warns about a leftover preconnect', () => {
    const page = snapshot({
      resourceHints: [{ rel: 'preconnect', href: 'https://use.typekit.net/' }],
    });
    expect(run(adobeFonts, page)[0]?.severity).toBe('warning');
  });

  it('passes self-hosted fonts and other Adobe hosts', () => {
    const page = snapshot({
      requests: [
        request('https://example.de/fonts/source-sans.woff2', 'font'),
        request('https://www.adobe.com/content/dam/logo.svg', 'image'),
      ],
    });
    expect(run(adobeFonts, page)).toEqual([]);
  });

  it('explains in German that the font cannot simply be self-hosted', () => {
    const page = snapshot({ requests: [request('https://use.typekit.net/abc1234.css')] });
    expect(run(adobeFonts, page, 'de')[0]?.fix).toContain('nicht einfach selbst hosten');
  });
});

describe('impressum-link', () => {
  it.each([
    ['Impressum', 'https://example.de/kontakt'],
    ['Legal notice', 'https://example.de/legal'],
    ['', 'https://example.de/de/impressum/'],
    ['Mentions légales', 'https://example.fr/mentions'],
  ])('accepts a link labelled %j pointing to %s', (text, href) => {
    expect(run(impressumLink, snapshot({ links: [{ text, href }] }))).toEqual([]);
  });

  it('warns when no legal notice link exists', () => {
    const page = snapshot({
      links: [{ text: 'Datenschutz', href: 'https://example.de/datenschutz' }],
    });
    const findings = run(impressumLink, page);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('warning');
  });

  it('does not count a domain name that happens to contain the word', () => {
    const page = snapshot({
      links: [{ text: 'Start', href: 'https://impressum-agentur.de/' }],
    });
    expect(run(impressumLink, page)[0]?.severity).toBe('warning');
  });

  it('only notes a contact link, which can be enough within two clicks', () => {
    const page = snapshot({
      links: [{ text: 'Kontakt', href: 'https://example.de/kontakt' }],
    });
    expect(run(impressumLink, page)[0]?.severity).toBe('info');
  });
});

describe('third-party-embeds', () => {
  it('groups embed requests by vendor', () => {
    const page = snapshot({
      requests: [
        request('https://www.youtube-nocookie.com/embed/abc', 'document'),
        request('https://i.ytimg.com/vi/abc/hqdefault.jpg', 'image'),
        request('https://www.google.com/recaptcha/api.js'),
      ],
    });
    const findings = run(thirdPartyEmbeds, page);
    expect(findings.map((f) => f.subject)).toEqual(['YouTube', 'Google reCAPTCHA']);
    expect(findings[0]?.evidence).toHaveLength(2);
  });

  it('does not flag google.com search or the Meta pixel', () => {
    const page = snapshot({
      requests: [
        request('https://www.google.com/search?q=x'),
        request('https://www.facebook.com/tr?id=1'),
      ],
    });
    expect(run(thirdPartyEmbeds, page)).toEqual([]);
  });
});

describe('third-party-cdns', () => {
  it('notes public CDNs as info', () => {
    const page = snapshot({ requests: [request('https://cdn.jsdelivr.net/npm/alpinejs@3')] });
    expect(run(thirdPartyCdns, page)[0]).toMatchObject({ severity: 'info', subject: 'jsDelivr' });
  });
});

describe('privacy-policy-link', () => {
  it.each([
    ['Datenschutz', 'https://example.de/ds'],
    ['Privacy Policy', 'https://example.com/legal'],
    ['', 'https://example.de/datenschutzerklaerung/'],
  ])('accepts a link labelled %j pointing to %s', (text, href) => {
    expect(run(privacyPolicyLink, snapshot({ links: [{ text, href }] }))).toEqual([]);
  });

  it('warns when there is none', () => {
    const page = snapshot({ links: [{ text: 'Impressum', href: 'https://example.de/impressum' }] });
    expect(run(privacyPolicyLink, page)[0]?.severity).toBe('warning');
  });
});

describe('German messages', () => {
  it('translates message, fix and evidence', () => {
    const page = snapshot({
      requests: [request('https://fonts.googleapis.com/css2?family=Inter', 'stylesheet')],
    });
    const [finding] = run(googleFonts, page, 'de');
    expect(finding?.message).toBe('Schriften werden von Google geladen (1 Anfrage).');
    expect(finding?.fix).toContain('selbst hosten');
  });

  it('labels tracker categories and evidence in German', () => {
    const page = snapshot({
      requests: [request('https://www.googletagmanager.com/gtag/js?id=G-1')],
    });
    const [finding] = run(preConsentTrackers, page, 'de');
    expect(finding?.message).toBe(
      'Google Analytics (Analyse) läuft, bevor eine Einwilligung vorliegt.',
    );
    expect(finding?.evidence[0]).toMatch(/^Anfrage https:/);
  });

  it('keeps English as the default wording', () => {
    const [finding] = run(privacyPolicyLink, snapshot());
    expect(finding?.message).toBe('No link to a privacy policy was found on this page.');
  });
});
