import { describe, expect, it } from 'vitest';
import type { Lang } from '../src/i18n.js';
import {
  adobeFonts,
  consentSettingsLink,
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

  it('catches first-party cookies known from the Open Cookie Database', () => {
    const page = snapshot({ cookies: [cookie('_sp_id.1fff')] });
    const findings = run(preConsentTrackers, page);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain('Snowplow');
  });

  it('downgrades a bare tag manager to a warning', () => {
    const page = snapshot({
      requests: [request('https://www.googletagmanager.com/gtm.js?id=GTM-1')],
    });
    expect(run(preConsentTrackers, page)[0]?.severity).toBe('warning');
  });
});

const intercomMessengerHosts = [
  ['app.intercom.io', 'https://app.intercom.io/messenger/'],
  ['widget.intercom.io', 'https://widget.intercom.io/widget/tx2p130c'],
  ['js.intercomcdn.com', 'https://js.intercomcdn.com/widget/abc.js'],
  ['via.intercom.io', 'https://via.intercom.io/messenger'],
  ['api.intercom.io', 'https://api.intercom.io/messenger'],
  ['api.au.intercom.io', 'https://api.au.intercom.io/messenger'],
  ['api.eu.intercom.io', 'https://api.eu.intercom.io/messenger'],
  ['api-iam.intercom.io', 'https://api-iam.intercom.io/messenger'],
  ['api-iam.eu.intercom.io', 'https://api-iam.eu.intercom.io/messenger'],
  ['api-iam.au.intercom.io', 'https://api-iam.au.intercom.io/messenger'],
  ['api-ping.intercom.io', 'https://api-ping.intercom.io/messenger'],
  ['intercom-messenger.com', 'https://realtime.intercom-messenger.com/connect'],
  ['nexus-websocket-a.intercom.io', 'https://nexus-websocket-a.intercom.io/socket'],
  ['nexus-websocket-b.intercom.io', 'https://nexus-websocket-b.intercom.io/socket'],
  ['nexus-europe-websocket.intercom.io', 'https://nexus-europe-websocket.intercom.io/socket'],
  ['nexus-australia-websocket.intercom.io', 'https://nexus-australia-websocket.intercom.io/socket'],
  ['uploads.intercomcdn.com', 'https://uploads.intercomcdn.com/file'],
  ['uploads.intercomcdn.eu', 'https://uploads.intercomcdn.eu/file'],
  ['uploads.au.intercomcdn.com', 'https://uploads.au.intercomcdn.com/file'],
  ['uploads.eu.intercomcdn.com', 'https://uploads.eu.intercomcdn.com/file'],
  ['uploads.intercomusercontent.com', 'https://uploads.intercomusercontent.com/file'],
  ['intercom-sheets.com', 'https://intercom-sheets.com/sheet'],
  ['www.intercom-reporting.com', 'https://www.intercom-reporting.com/report'],
  ['fonts.intercomcdn.com', 'https://fonts.intercomcdn.com/font.woff2'],
  ['intercom.help', 'https://intercom.help/contact'],
  ['downloads.intercomcdn.com', 'https://downloads.intercomcdn.com/file'],
  ['downloads.intercomcdn.eu', 'https://downloads.intercomcdn.eu/file'],
  ['downloads.au.intercomcdn.com', 'https://downloads.au.intercomcdn.com/file'],
  ['static.intercomassets.com', 'https://static.intercomassets.com/icon.svg'],
  ['gifs.intercomcdn.com', 'https://gifs.intercomcdn.com/reaction.gif'],
  ['video-messages.intercomcdn.com', 'https://video-messages.intercomcdn.com/video.mp4'],
  ['messenger-apps.intercom.io', 'https://messenger-apps.intercom.io/app.js'],
  ['messenger-apps.eu.intercom.io', 'https://messenger-apps.eu.intercom.io/app.js'],
  ['messenger-apps.au.intercom.io', 'https://messenger-apps.au.intercom.io/app.js'],
  ['intercom-attachments-1.com', 'https://files.intercom-attachments-1.com/file'],
  ['intercom-attachments.eu', 'https://files.intercom-attachments.eu/file'],
  ['au.intercom-attachments.com', 'https://files.au.intercom-attachments.com/file'],
  ['intercom-attachments-2.com', 'https://files.intercom-attachments-2.com/file'],
  ['intercom-attachments-3.com', 'https://files.intercom-attachments-3.com/file'],
  ['intercom-attachments-4.com', 'https://files.intercom-attachments-4.com/file'],
  ['intercom-attachments-5.com', 'https://files.intercom-attachments-5.com/file'],
  ['intercom-attachments-6.com', 'https://files.intercom-attachments-6.com/file'],
  ['intercom-attachments-7.com', 'https://files.intercom-attachments-7.com/file'],
  ['intercom-attachments-8.com', 'https://files.intercom-attachments-8.com/file'],
  ['intercom-attachments-9.com', 'https://files.intercom-attachments-9.com/file'],
  ['static.intercomassets.eu', 'https://static.intercomassets.eu/icon.svg'],
  ['static.au.intercomassets.com', 'https://static.au.intercomassets.com/icon.svg'],
] as const;

describe('additional third-party embeds', () => {
  it.each([
    ['hCaptcha', 'https://js.hcaptcha.com/1/api.js'],
    ['Cloudflare Turnstile', 'https://challenges.cloudflare.com/turnstile/v0/api.js'],
    ['OpenStreetMap tiles', 'https://a.tile.openstreetmap.org/0/0/0.png'],
    ['TikTok embed', 'https://www.tiktok.com/embed.js'],
    ['TikTok embed', 'https://www.tiktok.com/player/v1/12345'],
    ['Calendly', 'https://assets.calendly.com/assets/external/widget.js'],
    ['Tawk.to', 'https://embed.tawk.to/521727297ca1334016000005/18nms7gql'],
    ['Zendesk Web Widget', 'https://static.zdassets.com/ekr/snippet.js?key=abc'],
    ['Zendesk Web Widget', 'https://ekr.zdassets.com/compose/abc'],
    ['Zendesk Web Widget', 'https://v2.zopim.com/w?abc'],
    ['Trustpilot widget', 'https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js'],
    ['Typeform', 'https://embed.typeform.com/next/embed.js'],
    ['Typeform', 'https://form.typeform.com/to/abc123'],
  ])('recognizes %s as an observed third-party resource', (vendor, url) => {
  it.each(intercomMessengerHosts)(
    'recognizes Intercom Messenger host %s',
    (_host, url) => {
      expect(run(thirdPartyEmbeds, snapshot({ requests: [request(url)] }))).toMatchObject([
        { subject: 'Intercom', ruleId: 'third-party-embeds' },
      ]);
    },
  );
  it.each(intercomMessengerHosts)(
    'does not match a lookalike of Intercom Messenger host %s',
    (_host, url) => {
      const host = new URL(url).hostname;
      expect(
        run(thirdPartyEmbeds, snapshot({ requests: [request(`https://${host}.evil.invalid/`)] })),
      ).toEqual([]);
    },
  );
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
    'https://www.intercom.com/pricing',
    'https://app.intercom.com/',
    'https://app.eu.intercom.com/',
    'https://app.au.intercom.com/',
    'https://www.trustpilot.com/review/example.com',
    'https://www.typeform.com/',
    'https://tawk.to.example.net/embed.js',
    'https://static.zdassets.com/hc/theming_assets/01HZ/style.css',
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

describe('consent-settings-link', () => {
  const rejected = { bannerFound: true, rejected: true, rejectLabel: 'Alle ablehnen' };

  it('warns when no settings control was found after rejecting', () => {
    const page = snapshot({ consent: { ...rejected, settingsControl: { found: false } } });
    const [finding] = run(consentSettingsLink, page, 'de');
    expect(finding?.severity).toBe('warning');
    expect(finding?.evidence).toEqual(['Geprüft nach Klick auf „Alle ablehnen“ und Neuladen']);
  });

  it.each([
    ['a control was found', { ...rejected, settingsControl: { found: true, label: 'Cookies' } }],
    ['reject was not tested', { bannerFound: true, rejected: false }],
    ['the check did not run', rejected],
  ])('stays quiet when %s', (_, consent) => {
    expect(run(consentSettingsLink, snapshot({ consent }))).toEqual([]);
  });
});

describe('impressum-link', () => {
  it.each([
    ['Impressum', 'https://example.de/kontakt'],
    ['Legal notice', 'https://example.de/legal'],
    ['', 'https://example.de/de/impressum/'],
    ['Mentions légales', 'https://example.fr/mentions'],
    ['Impresszum', 'https://example.hu/rolunk'],
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
    ['Adatkezelési tájékoztató', 'https://example.hu/dokumentumok'],
    ['Adatvédelem', 'https://example.hu/jog'],
    ['', 'https://example.hu/adatvedelmi-tajekoztato/'],
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
