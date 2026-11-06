import { describe, expect, it } from 'vitest';
import { huArticle, type Lang } from '../src/i18n.js';
import type { Region } from '../src/legal.js';
import {
  accessibilityStatement,
  adobeFonts,
  consentBannerMissing,
  consentPreselected,
  consentSettingsLink,
  googleFonts,
  impressumLink,
  legalNoticeContent,
  preConsentTrackers,
  privacyPolicyLink,
  privacyPolicyVendors,
  rejectLessProminent,
  thirdCountryProviders,
  thirdPartyCdns,
  thirdPartyEmbeds,
  trackersAfterReject,
  trackingCookieLifetime,
  withdrawalButton,
} from '../src/rules/index.js';
import { newStorageKeys } from '../src/storage.js';
import type { ControlLook, PageSnapshot, Rule } from '../src/types.js';
import { cookie, request, SITE, snapshot } from './helpers.js';

const run = (rule: Rule, page = snapshot(), lang: Lang = 'en') =>
  rule.check({ siteUrl: SITE, page, lang });

describe('shop duties', () => {
  const cart = { text: 'Warenkorb', href: 'https://example.de/warenkorb' };
  const shop = (...links: { text: string; href: string }[]) =>
    snapshot({ links: [cart, ...links] });

  it('asks a shop for a withdrawal function, not other sites', () => {
    expect(run(withdrawalButton, shop())).toMatchObject([{ severity: 'warning' }]);
    expect(run(withdrawalButton, snapshot({ links: [] }))).toEqual([]);
  });

  it.each([
    ['Vertrag widerrufen', 'https://example.de/widerruf'],
    ['Withdraw from contract here', 'https://example.com/withdraw'],
    ['Vertrag hier widerrufen', 'https://example.de/w'],
  ])('accepts %j', (text, href) => {
    expect(run(withdrawalButton, shop({ text, href }))).toEqual([]);
  });

  it('does not take the cancellation policy for the withdrawal function', () => {
    const policy = { text: 'Widerrufsbelehrung', href: 'https://example.de/widerrufsbelehrung' };
    expect(run(withdrawalButton, shop(policy))).toHaveLength(1);
  });

  it('recognises a Shopify store by its scripts', () => {
    const page = snapshot({ requests: [request('https://cdn.shopify.com/s/files/1/theme.js')] });
    expect(run(withdrawalButton, page)).toHaveLength(1);
  });

  it('only checks the start page', () => {
    const page = snapshot({ links: [cart], finalUrl: 'https://example.de/produkte' });
    expect(run(withdrawalButton, page)).toEqual([]);
  });

  it('notes missing accessibility information as info, since the AGB may hold it', () => {
    expect(run(accessibilityStatement, shop())).toMatchObject([{ severity: 'info' }]);
    const statement = { text: 'Barrierefreiheitserklärung', href: 'https://example.de/b' };
    expect(run(accessibilityStatement, shop(statement))).toEqual([]);
    expect(run(accessibilityStatement, snapshot())).toEqual([]);
  });
});

describe('Web Storage keys', () => {
  it('reports a tracker key that appears after rejecting', () => {
    const page = snapshot({
      consent: {
        bannerFound: true,
        rejected: true,
        state: 'reject-tested',
        outcome: 'reject-succeeded',
        reason: 'reject-clicked-and-reloaded',
        rejectLabel: 'Alle ablehnen',
        afterReject: {
          requests: [],
          cookies: [],
          storage: [
            { area: 'local', name: 'ajs_anonymous_id' },
            { area: 'local', name: 'consent' },
          ],
        },
      },
    });
    expect(run(trackersAfterReject, page)).toEqual([
      expect.objectContaining({ subject: 'Segment', evidence: ['localStorage ajs_anonymous_id'] }),
    ]);
  });

  it('only counts keys that were not there before', () => {
    const before = [{ area: 'local', name: 'a' }] as const;
    const after = [
      { area: 'local', name: 'a' },
      { area: 'session', name: 'a' },
    ] as const;
    expect(newStorageKeys(before, after)).toEqual([{ area: 'session', name: 'a' }]);
  });
});

describe('consent-banner-missing', () => {
  const noBanner = {
    bannerFound: false,
    rejected: false,
    state: 'not-detected',
    outcome: 'no-banner-detected',
    reason: 'no-supported-banner',
    bannerWaitMs: 2000,
  } as const;

  it('names the missing banner when trackers run', () => {
    const page = snapshot({
      requests: [request('https://www.google-analytics.com/g/collect')],
      cookies: [cookie('_hjSessionUser_1')],
      consent: noBanner,
    });
    const [finding] = run(consentBannerMissing, page);
    expect(finding).toMatchObject({ severity: 'warning', ruleId: 'consent-banner-missing' });
    expect(finding?.message).toContain('Google Analytics, Hotjar');
    expect(finding?.evidence[0]).toContain('2000 ms');
  });

  it('stays quiet with a banner, without trackers, or with a tag manager alone', () => {
    const tracker = [request('https://www.google-analytics.com/g/collect')];
    const banner = { ...noBanner, bannerFound: true, state: 'reject-tested' } as const;
    expect(run(consentBannerMissing, snapshot({ requests: tracker, consent: banner }))).toEqual([]);
    expect(run(consentBannerMissing, snapshot({ consent: noBanner }))).toEqual([]);
    const gtm = [request('https://www.googletagmanager.com/gtm.js?id=GTM-1')];
    expect(run(consentBannerMissing, snapshot({ requests: gtm, consent: noBanner }))).toEqual([]);
  });
});

describe('pre-consent-trackers', () => {
  it('does not turn failed requests into evidence in direct rule API calls', () => {
    const page = snapshot({
      requests: [
        { ...request('https://fonts.googleapis.com/css2'), outcome: 'failed' },
        { ...request('https://www.google-analytics.com/g/collect'), outcome: 'failed' },
        { ...request('https://www.youtube.com/embed/x'), outcome: 'pending' },
      ],
    });
    for (const rule of [preConsentTrackers, googleFonts, thirdPartyCdns, thirdPartyEmbeds]) {
      expect(run(rule, page)).toEqual([]);
    }
  });
  it('counts HTTP error responses: the vendor still received the request', () => {
    const page = snapshot({
      requests: [
        { ...request('https://www.facebook.com/tr?id=1'), outcome: 'response', status: 403 },
        { ...request('https://cdn.jsdelivr.net/npm/x'), outcome: 'response', status: 503 },
      ],
    });
    expect(run(preConsentTrackers, page)[0]?.message).toContain('Meta');
    expect(run(thirdPartyCdns, page)).toHaveLength(1);
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
    [
      'SoundCloud embed',
      'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1',
    ],
    ['SoundCloud embed', 'https://w.soundcloud.com/player/api.js'],
    ['Mapbox', 'https://api.mapbox.com/styles/v1/mapbox/streets-v12'],
    ['Mapbox', 'https://events.mapbox.com/events/v2'],
    ['Trusted Shops', 'https://widgets.trustedshops.com/js/X0123456789.js'],
    ['Pinterest widgets', 'https://assets.pinterest.com/js/pinit.js'],
    ['Google Calendar embed', 'https://calendar.google.com/calendar/embed?src=x'],
  ])('recognizes %s as an observed third-party resource', (vendor, url) => {
    expect(run(thirdPartyEmbeds, snapshot({ requests: [request(url)] }))).toMatchObject([
      { subject: vendor, ruleId: 'third-party-embeds' },
    ]);
  });
  it.each(intercomMessengerHosts)('recognizes Intercom Messenger host %s', (_host, url) => {
    expect(run(thirdPartyEmbeds, snapshot({ requests: [request(url)] }))).toMatchObject([
      { subject: 'Intercom', ruleId: 'third-party-embeds' },
    ]);
  });
  it.each(intercomMessengerHosts)(
    'does not match a lookalike of Intercom Messenger host %s',
    (_host, url) => {
      const host = new URL(url).hostname;
      expect(
        run(thirdPartyEmbeds, snapshot({ requests: [request(`https://${host}.evil.invalid/`)] })),
      ).toEqual([]);
    },
  );
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

  it.each([
    ['Jogi tudnivalók', 'https://www.telekom.hu/jogi-tudnivalok'],
    ['Rechtliche Hinweise', 'https://example.de/rechtliches'],
    ['Legal', 'https://example.com/legal'],
  ])('notes a vague legal link %j as info, not as a missing Impressum', (text, href) => {
    const [finding] = run(impressumLink, snapshot({ links: [{ text, href }] }));
    expect(finding?.severity).toBe('info');
    expect(finding?.message).toContain(text);
  });

  it('does not take "legally" or "Paralegal" for a legal page', () => {
    const page = snapshot({ links: [{ text: 'Paralegal jobs', href: 'https://example.de/jobs' }] });
    expect(run(impressumLink, page)[0]?.severity).toBe('warning');
  });

  it('only notes a contact link, which can be enough within two clicks', () => {
    const page = snapshot({
      links: [{ text: 'Kontakt', href: 'https://example.de/kontakt' }],
    });
    expect(run(impressumLink, page)[0]?.severity).toBe('info');
  });

  it.each([
    ['Contact block', 'https://docs.example.com/blocks/contact', 'warning'],
    ['Pricing', 'https://example.com/contact-sales/team', 'warning'],
    ['', 'https://example.com/contact', 'info'],
    ['Write to us', 'https://example.com/en/contact-us/', 'info'],
    ['Kapcsolat', 'https://example.hu/rolunk', 'info'],
    ['', 'https://example.hu/kapcsolat.html', 'info'],
  ])('takes %j at %s for a contact page only when it is one (%s)', (text, href, severity) => {
    const page = snapshot({ links: [{ text, href }] });
    expect(run(impressumLink, page)[0]?.severity).toBe(severity);
  });
});

describe('legal link labels', () => {
  const check = (rule: Rule, language: string | undefined, region: Region) =>
    rule.check({
      siteUrl: SITE,
      page: snapshot({ ...(language === undefined ? {} : { language }) }),
      lang: 'en',
      region,
    })[0];

  it.each([
    ['en', 'hu', 'Legal notice', 'Privacy policy'],
    ['en', 'de', 'Legal notice', 'Privacy policy'],
    ['hu', 'hu', 'Impresszum', 'Adatkezelési tájékoztató'],
    ['de', 'eu', 'Impressum', 'Datenschutzerklärung'],
    [undefined, 'hu', 'Impresszum', 'Adatkezelési tájékoztató'],
    [undefined, 'at', 'Impressum', 'Datenschutzerklärung'],
    [undefined, 'eu', 'Legal notice', 'Privacy policy'],
    ['ja', 'eu', 'Legal notice', 'Privacy policy'],
  ] as const)(
    'suggests the labels of a %s page in region %s',
    (language, region, notice, privacy) => {
      expect(check(impressumLink, language, region)?.fix).toContain(`"${notice}"`);
      expect(check(privacyPolicyLink, language, region)?.fix).toContain(`"${privacy}"`);
    },
  );

  it('cites the German two-click ruling only for German sites', () => {
    const contact = (region: Region) =>
      impressumLink.check({
        siteUrl: SITE,
        page: snapshot({ language: 'en', links: [{ text: 'Contact', href: SITE.href }] }),
        lang: 'en',
        region,
      })[0]?.fix;
    expect(contact('de')).toContain('BGH I ZR 228/03');
    for (const region of ['at', 'ch', 'hu', 'eu'] as const) {
      expect(contact(region)).not.toContain('BGH');
      expect(contact(region)).toContain('"Legal notice"');
    }
  });

  it('keeps the German labels when no region is passed, as before', () => {
    const fix = impressumLink.check({ siteUrl: SITE, page: snapshot(), lang: 'de' })[0]?.fix;
    expect(fix).toContain('„Impressum“');
  });
});

describe('tracking-cookie-lifetime', () => {
  const inDays = (days: number) => ({
    ...cookie('_ga'),
    expires: Math.round(Date.now() / 1000) + days * 24 * 60 * 60,
  });

  it('notes a tracker cookie that lasts two years, with its lifetime', () => {
    const [finding] = run(trackingCookieLifetime, snapshot({ cookies: [inDays(730)] }));
    expect(finding).toMatchObject({ severity: 'info', subject: 'Google Analytics' });
    expect(finding?.evidence[0]).toMatch(/_ga .*: 730 days/);
  });

  it.each([
    ['13 months', inDays(390)],
    [
      'exactly 13 calendar months',
      (() => {
        const date = new Date();
        date.setMonth(date.getMonth() + 13);
        return { ...cookie('_ga'), expires: Math.round(date.getTime() / 1000) };
      })(),
    ],
    ['a session cookie', { ...cookie('_ga'), expires: -1 }],
    ['a cookie not on the tracker list', { ...inDays(730), name: 'cart_id' }],
  ])('leaves %s alone', (_, entry) => {
    expect(run(trackingCookieLifetime, snapshot({ cookies: [entry] }))).toEqual([]);
  });

  it('also looks at cookies set after rejecting', () => {
    const page = snapshot({
      consent: {
        bannerFound: true,
        rejected: true,
        state: 'reject-tested',
        afterReject: { requests: [], cookies: [inDays(500)] },
      },
    });
    expect(run(trackingCookieLifetime, page)).toHaveLength(1);
  });
});

describe('Hungarian text', () => {
  it('picks "a" or "az" by the first sound', () => {
    expect(
      ['Adobe Fonts', 'YouTube', '„Impresszum”', 'Elutasítom', 'Hotjar'].map((w) => huArticle(w)),
    ).toEqual(['az', 'a', 'az', 'az', 'a']);
    expect(huArticle('Intercom', true)).toBe('Az');
    expect(['X', 'SE', 'RD Station', 'Kft.', 'SAP', 'GTM'].map((w) => huArticle(w))).toEqual([
      'az',
      'az',
      'az',
      'a',
      'az',
      'a',
    ]);
    expect(['1', '5', '10', '1000', '2'].map((w) => huArticle(w))).toEqual([
      'az',
      'az',
      'a',
      'az',
      'a',
    ]);
  });

  it('writes findings and fixes in Hungarian', () => {
    const [missing] = impressumLink.check({
      siteUrl: SITE,
      page: snapshot(),
      lang: 'hu',
      region: 'hu',
    });
    expect(missing?.message).toBe('Nem található hivatkozás impresszumra vagy jogi nyilatkozatra.');
    expect(missing?.fix).toContain('„Impresszum” feliratú hivatkozást');
    const [tracker] = run(
      preConsentTrackers,
      snapshot({ requests: [request('https://www.google-analytics.com/g/collect')] }),
      'hu',
    );
    expect(tracker?.message).toBe(
      'A Google Analytics (analitika) fut, mielőtt a látogató hozzájárult volna.',
    );
  });
});

describe('privacy-policy-vendors', () => {
  const POLICY = 'https://example.de/datenschutz';
  const page = (text: string, overrides: Partial<PageSnapshot> = {}) =>
    snapshot({ privacyPolicy: { url: POLICY, text, mailto: false }, ...overrides });
  const subjects = (findings: { severity: string; subject?: string }[]) =>
    findings.map((f) => `${f.severity}:${f.subject}`);

  it('warns about a tracker and an embed that sets cookies, notes a font service', () => {
    const findings = run(
      privacyPolicyVendors,
      page('Wir nutzen Google Analytics.', {
        requests: [
          request('https://www.google-analytics.com/g/collect'),
          request('https://www.youtube.com/embed/abc', 'document'),
          request('https://connect.facebook.net/en_US/fbevents.js'),
          request('https://fonts.gstatic.com/s/lora.woff2', 'font'),
        ],
        cookies: [cookie('YSC', '.youtube.com')],
      }),
    );
    expect(subjects(findings)).toEqual([
      'warning:YouTube',
      'warning:Meta Pixel',
      'info:Google Fonts',
    ]);
    expect(findings[0]?.evidence).toEqual([
      `privacy policy: ${POLICY}`,
      'https://www.youtube.com/embed/abc',
    ]);
  });

  it.each([
    ['spacing and hyphens', 'Google-Analytics', 'https://www.google-analytics.com/g/collect'],
    ['an alias', 'the Facebook Pixel', 'https://connect.facebook.net/en_US/fbevents.js'],
    ['the name without "embed"', 'Videos von YouTube', 'https://www.youtube.com/embed/abc'],
    ['the host', 'cdn.jsdelivr.net', 'https://cdn.jsdelivr.net/npm/x.js'],
  ])('accepts %s', (_, text, url) => {
    expect(run(privacyPolicyVendors, page(text, { requests: [request(url)] }))).toEqual([]);
  });

  it.each([
    ['__gads', 'Wir nutzen Google AdSense und Google Ad Manager (DoubleClick).'],
    ['MUID', 'Microsoft Advertising (Bing Ads)'],
    ['guest_id', 'Twitter-Button von X (vormals Twitter)'],
  ])('finds the vendor of cookie %s in "%s"', (name, text) => {
    const domain = name === 'MUID' ? '.bing.com' : name === 'guest_id' ? '.x.com' : '.example.de';
    const findings = run(privacyPolicyVendors, page(text, { cookies: [cookie(name, domain)] }));
    expect(findings).toEqual([]);
  });

  it('matches whole words only', () => {
    const findings = run(
      privacyPolicyVendors,
      page('Metadaten werden gespeichert.', {
        requests: [request('https://connect.facebook.net/en_US/sdk.js')],
      }),
    );
    expect(subjects(findings)).toEqual(['warning:Facebook SDK']);
  });

  it('only notes missing names when part of the policy could not be read', () => {
    const findings = run(
      privacyPolicyVendors,
      snapshot({
        privacyPolicy: {
          url: POLICY,
          text: 'Details in our cookie policy.',
          mailto: false,
          unread: ['https://example.de/cookie-policy.pdf'],
        },
        requests: [request('https://www.google-analytics.com/g/collect')],
      }),
    );
    expect(subjects(findings)).toEqual(['info:Google Analytics']);
    expect(findings[0]?.evidence.at(-1)).toBe('not read: https://example.de/cookie-policy.pdf');
  });

  it('notes an embed without cookies as info, and stays quiet without a policy', () => {
    const requests = [request('https://player.vimeo.com/video/1', 'document')];
    expect(subjects(run(privacyPolicyVendors, page('Nothing here.', { requests })))).toEqual([
      'info:Vimeo',
    ]);
    expect(run(privacyPolicyVendors, snapshot({ requests }))).toEqual([]);
  });
});

describe('legal-notice-content', () => {
  const check = (text: string, region: Region = 'de', mailto = false) =>
    legalNoticeContent.check({
      siteUrl: SITE,
      page: snapshot({ legalNotice: { url: 'https://example.de/impressum', text, mailto } }),
      lang: 'en',
      region,
    });
  const summary = (findings: { severity: string; subject?: string }[]) =>
    findings.map((f) => `${f.severity}:${f.subject}`);

  it.each<[string, Region, string]>([
    [
      'de',
      'de',
      'Beispiel GmbH\nMusterstraße 12\n10115 Berlin\ninfo@example.de\nAmtsgericht Berlin, HRB 12345',
    ],
    [
      'at',
      'at',
      'Beispiel GmbH\nMariahilfer Straße 1\nA-1060 Wien\noffice (at) example.at\nFN 123456a, Handelsgericht Wien',
    ],
    [
      'ch',
      'ch',
      'Beispiel AG\nBahnhofstrasse 10\n8001 Zürich\ninfo@example.ch\nUID CHE-123.456.789',
    ],
    [
      'hu',
      'hu',
      'Példa Kft.\n1051 Budapest, Váci út 1.\nE-mail: info@example.hu\nCégjegyzékszám: Cg. 01-09-123456',
    ],
    [
      'en, Hungarian address',
      'hu',
      'Example Kft.\nAndrássy út 12, Budapest, 1061\nhello@example.com\nCompany registration number: 01-09-123456',
    ],
  ])('passes a complete legal notice (%s)', (_, region, text) => {
    expect(check(text, region)).toEqual([]);
  });

  it('warns when the address is missing and accepts a mailto link as the e-mail', () => {
    const findings = check(
      'Beispiel e.K.\nInhaber: Max Muster\nAmtsgericht Köln, HRA 1',
      'de',
      true,
    );
    expect(summary(findings)).toEqual(['warning:contact']);
    expect(findings[0]?.message).toBe('The legal notice gives no postal address.');
  });

  it('warns about a contact form instead of details and notes the missing register entry', () => {
    const findings = check('Example Ltd.\nPlease use our contact form.', 'eu');
    expect(summary(findings)).toEqual(['warning:contact', 'info:register']);
    expect(findings[0]?.message).toBe(
      'The legal notice gives no postal address and no e-mail address.',
    );
    expect(findings[1]?.evidence).toEqual([
      'legal notice: https://example.de/impressum',
      'legal form: Ltd.',
    ]);
  });

  it.each<[string, string]>([
    [
      'a UK address',
      'Example Ltd\n10 Downing Street\nLondon SW1A 2AA\nhello@example.co.uk\nCompany number 01234567',
    ],
    [
      'an Irish address',
      'Example Limited\n1 Merrion Square\nDublin 2, D02 X285\nhello@example.ie\nRegistered in Ireland, number 123456',
    ],
    ['a floor written as OG', 'Max Muster\nMusterstraße 12/3. OG\n1010 Wien\nmax@muster.at'],
    [
      'a hoster with a legal form',
      'Max Muster\nMusterweg 3\n50667 Köln\nmail@muster.de\nHosting: IONOS SE, Montabaur',
    ],
  ])('passes %s', (_, text) => {
    expect(check(text, 'eu')).toEqual([]);
  });

  it('does not take a copyright year and a phone number for an address', () => {
    const findings = check('© 2025 Musterfirma\nTelefon 030 123456\ninfo@musterfirma.de');
    expect(findings[0]?.message).toBe('The legal notice gives no postal address.');
  });

  it('does not take "at office. Hours" for an e-mail address', () => {
    const findings = check('Musterweg 3\n50667 Köln\nYou can reach us at office. Hours vary.');
    expect(findings[0]?.message).toBe('The legal notice gives no e-mail address.');
  });

  it('does not ask a sole trader without a legal form for a register entry', () => {
    expect(check('Max Muster\nMusterweg 3\n50667 Köln\nmail@muster.de')).toEqual([]);
  });

  it('stays quiet on pages that are not the legal notice', () => {
    expect(run(legalNoticeContent, snapshot())).toEqual([]);
  });
});

describe('third-country-providers', () => {
  const page = (...urls: string[]) => snapshot({ requests: urls.map((url) => request(url)) });

  it('lists Sentry in the US with its hosts, once per vendor', () => {
    const findings = run(
      thirdCountryProviders,
      page(
        'https://o123.ingest.us.sentry.io/api/4/envelope/?sentry_key=abc',
        'https://o123.ingest.us.sentry.io/api/4/envelope/',
        'https://browser.sentry-cdn.com/8.0.0/bundle.min.js',
      ),
    );
    expect(findings).toEqual([
      expect.objectContaining({
        ruleId: 'third-country-providers',
        severity: 'info',
        subject: 'Sentry',
        evidence: ['o123.ingest.us.sentry.io', 'browser.sentry-cdn.com'],
      }),
    ]);
    expect(findings[0]?.message).toBe(
      'Sentry (USA) receives data before consent. Transfers outside the EU/EEA need a legal basis.',
    );
  });

  it.each([
    ['Sentry in Frankfurt', 'https://o123.ingest.de.sentry.io/api/4/envelope/'],
    ['Datadog EU1', 'https://browser-intake-datadoghq.eu/api/v2/rum'],
    ['an unknown host', 'https://api.example-backend.io/v1'],
  ])('leaves %s alone', (_, url) => {
    expect(run(thirdCountryProviders, page(url))).toEqual([]);
  });

  it('lists a Supabase project and cites the Swiss rules for ch', () => {
    const [finding] = thirdCountryProviders.check({
      siteUrl: SITE,
      page: page('https://abcdefgh.supabase.co/rest/v1/items'),
      lang: 'en',
      region: 'ch',
    });
    expect(finding?.subject).toBe('Supabase');
    expect(finding?.message).toContain('Transfers abroad');
    expect(finding?.fix).toContain('Art. 16 DSG');
  });
});

describe('reject-less-prominent', () => {
  const button = { style: 'button', width: 120, height: 40, contrast: 7 } as const;
  const page = (reject: ControlLook, accept: ControlLook = button) =>
    snapshot({
      consent: {
        bannerFound: true,
        rejected: true,
        state: 'reject-tested',
        acceptLabel: 'Accept all',
        rejectLabel: 'Reject all',
        bannerControls: { accept, reject },
      },
    });

  it('passes controls of the same style, size and contrast', () => {
    expect(run(rejectLessProminent, page({ ...button, width: 110 }))).toEqual([]);
  });

  it('notes a text link, with the measurements as evidence', () => {
    const [finding] = run(
      rejectLessProminent,
      page({ style: 'text', width: 70, height: 20, contrast: 6 }),
    );
    expect(finding).toMatchObject({ ruleId: 'reject-less-prominent', severity: 'info' });
    expect(finding?.message).toBe(
      'The reject control "Reject all" is less prominent than "Accept all": shown as plain text; the accept button is 3.4 times its size.',
    );
    expect(finding?.evidence).toEqual([
      'accept "Accept all": button, 120×40 px, contrast 7:1',
      'reject "Reject all": plain text, 70×20 px, contrast 6:1',
    ]);
  });

  it('notes low contrast only when accept is readable', () => {
    const grey = { ...button, contrast: 1.6 };
    expect(run(rejectLessProminent, page(grey))[0]?.message).toContain('low text contrast (1.6:1)');
    expect(run(rejectLessProminent, page(grey, { ...button, contrast: 2 }))).toEqual([]);
    expect(run(rejectLessProminent, page({ style: 'button', width: 120, height: 40 }))).toEqual([]);
  });

  it('says it in German', () => {
    const [finding] = run(rejectLessProminent, page({ ...button, contrast: 2 }), 'de');
    expect(finding?.message).toBe(
      'Die Ablehnen-Steuerung „Reject all“ fällt weniger auf als „Accept all“: geringer Textkontrast (2:1).',
    );
  });

  it('stays quiet without measurements', () => {
    expect(run(rejectLessProminent, snapshot())).toEqual([]);
  });
});

describe('consent-preselected', () => {
  const page = (preselected?: string[]) =>
    snapshot({
      consent: {
        bannerFound: true,
        rejected: true,
        state: 'reject-tested',
        settings: {
          outcome: 'saved',
          reason: 'settings-saved-and-reloaded',
          openLabel: 'Settings',
          switchedOff: preselected?.length ?? 0,
          ...(preselected === undefined ? {} : { preselected }),
        },
      },
    });

  it('reports categories ticked in advance as an error, with their names', () => {
    const [finding] = run(consentPreselected, page(['Statistics', 'Marketing']));
    expect(finding).toMatchObject({ ruleId: 'consent-preselected', severity: 'error' });
    expect(finding?.message).toBe(
      '2 optional categories are switched on in the cookie settings before the visitor chooses: "Statistics", "Marketing".',
    );
    expect(finding?.evidence).toEqual([
      'settings opened with "Settings"',
      'Statistics',
      'Marketing',
    ]);
  });

  it('counts a switch without a readable label', () => {
    const [finding] = run(consentPreselected, page(['']), 'de');
    expect(finding?.message).toBe(
      'In den Cookie-Einstellungen ist 1 optionale Kategorie schon vor der Wahl der Besucher eingeschaltet.',
    );
  });

  it.each([
    ['nothing ticked', page([])],
    ['an older report without the field', page()],
    ['no settings check', snapshot()],
  ])('passes with %s', (_, snap) => {
    expect(run(consentPreselected, snap)).toEqual([]);
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
    expect(finding?.message).toBe('No link to a privacy policy was found.');
  });
});
