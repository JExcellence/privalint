import { describe, expect, it } from 'vitest';
import { openCookieDatabase } from '../src/data/open-cookie-database.js';
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

  it('does not report the Contentsquare opt-out cookie as tracking', () => {
    expect(findTrackerByCookie('_cs_optout')).toBeUndefined();
    expect(findTrackerByCookie('_cs_id')?.vendor).toBe('Contentsquare');
    expect(findTrackerByCookie('_cs_s')?.vendor).toBe('Contentsquare');
  });

  it('leaves unrelated cookies alone', () => {
    expect(findTrackerByCookie('session')).toBeUndefined();
  });
});

describe('session-replay tools', () => {
  it.each([
    ['https://edge.fullstory.com/s/fs.js', 'FullStory'],
    ['https://rs.fullstory.com/rec/page', 'FullStory'],
    ['https://cdn.mouseflow.com/projects/f2a6083d-2ff6-4fcc-a93f-418acf05a709.js', 'Mouseflow'],
    ['https://web-sdk.smartlook.com/recorder.js', 'Smartlook'],
    ['https://tools.luckyorange.com/core/lo.js', 'Lucky Orange'],
    ['https://t.contentsquare.net/uxa/355d5ac78f8a5.js', 'Contentsquare'],
    ['https://k-aeu1.contentsquare.net/v2/recording', 'Contentsquare'],
  ])('%s -> %s', (url, vendor) => {
    const tracker = findTrackerByUrl(url);
    expect(tracker?.vendor).toBe(vendor);
    expect(tracker?.category).toBe('session-replay');
  });

  it('leaves the vendor websites and lookalikes alone', () => {
    for (const url of [
      'https://www.fullstory.com/',
      'https://mouseflow.com/pricing/',
      'https://www.smartlook.com/',
      'https://contentsquare.com/',
      'https://smartlook.com.example.net/recorder.js',
    ]) {
      expect(findTrackerByUrl(url)).toBeUndefined();
    }
  });

  it('recognises Contentsquare cookies', () => {
    expect(findTrackerByCookie('_cs_id')?.vendor).toBe('Contentsquare');
  });
});

describe('ad-tech vendors', () => {
  // URLs as observed on German and international news sites on 2026-10-27.
  it.each([
    ['https://static.criteo.net/js/ld/publishertag.js', 'Criteo'],
    ['https://dis.criteo.com/dis/usersync.aspx?r=1', 'Criteo'],
    ['https://cdn.taboola.com/libtrc/eslmedia-theindependent/loader.js', 'Taboola'],
    ['https://trc.taboola.com/usatodaydemo/trc/3/json', 'Taboola'],
    ['https://widgets.outbrain.com/outbrain.js', 'Outbrain'],
    ['https://tr.outbrain.com/cachedClickId?marketerId=x', 'Outbrain'],
    ['https://track.adform.net/serving/cookie/?adfaction=getjs', 'Adform'],
    ['https://c1.adform.net/serving/cookie/match', 'Adform'],
    ['https://cms.quantserve.com/pixel/p-25CIknq_eSg16.gif', 'Quantcast'],
    ['https://secure.quantserve.com/quant.js', 'Quantcast'],
  ])('%s -> %s', (url, vendor) => {
    const tracker = findTrackerByUrl(url);
    expect(tracker?.vendor).toBe(vendor);
    expect(tracker?.category).toBe('advertising');
  });

  it('does not treat the Quantcast consent manager as a tracker', () => {
    expect(
      findTrackerByUrl('https://cmp.quantcast.com/choice/abc/www.example.com/choice.js'),
    ).toBeUndefined();
  });

  it('does not match lookalike domains', () => {
    expect(findTrackerByUrl('https://notcriteo.com/x.js')).toBeUndefined();
    expect(findTrackerByUrl('https://outbrain.example.com/x.js')).toBeUndefined();
  });

  it('recognises first-party ad-tech cookies', () => {
    expect(findTrackerByCookie('cto_bundle')?.vendor).toBe('Criteo');
    expect(findTrackerByCookie('__qca')?.vendor).toBe('Quantcast');
  });
});

describe('vendors from install and CSP documentation (2026-11-01)', () => {
  it.each([
    ['https://example.tt.omtrdc.net/rest/v1/delivery', 'Adobe Target', 'analytics'],
    ['https://example.sc.omtrdc.net/b/ss/rsid/1/JS-2.22.0/s123', 'Adobe Analytics', 'analytics'],
    ['https://example.112.2o7.net/b/ss/rsid/1', 'Adobe Analytics', 'analytics'],
    ['https://edge.adobedc.net/ee/v1/interact', 'Adobe Analytics', 'analytics'],
    ['https://dpm.demdex.net/id?d_visid_ver=5', 'Adobe Audience Manager', 'advertising'],
    ['https://cm.everesttech.net/cm/dd', 'Adobe Audience Manager', 'advertising'],
    [
      'https://assets.adobedtm.com/abc/launch-123.min.js',
      'Adobe Experience Platform Tags',
      'tag-manager',
    ],
    ['https://code.etracker.com/code/e.js', 'etracker', 'analytics'],
    ['https://www.etracker.de/dc.php', 'etracker', 'analytics'],
    ['https://script.ioam.de/iam.js', 'INFOnline', 'analytics'],
    ['https://de.ioam.de/tx.io?st=x', 'INFOnline', 'analytics'],
    ['https://at.iocnt.net/tx.io?st=x', 'INFOnline', 'analytics'],
    ['https://example.containers.piwik.pro/abc.js', 'Piwik PRO', 'analytics'],
    ['https://example.piwik.pro/ppms.php', 'Piwik PRO', 'analytics'],
    ['https://cdn.us.heap-api.com/config/1/heap_config.js', 'Heap', 'analytics'],
    ['https://c.eu.heap-api.com/api/track', 'Heap', 'analytics'],
    ['https://cdn.heapanalytics.com/js/heap-1.js', 'Heap', 'analytics'],
    ['https://cdn.pendo.io/agent/static/key/pendo.js', 'Pendo', 'analytics'],
    ['https://data.eu.pendo.io/data/ptm.gif', 'Pendo', 'analytics'],
    ['https://cdn.optimizely.com/js/123.js', 'Optimizely', 'analytics'],
    ['https://logx.optimizely.com/v1/events', 'Optimizely', 'analytics'],
    ['https://static.chartbeat.com/js/chartbeat.js', 'Chartbeat', 'analytics'],
    ['https://ping.chartbeat.net/ping?h=example.com', 'Chartbeat', 'analytics'],
    ['https://sb.scorecardresearch.com/cs/123/beacon.js', 'Comscore', 'analytics'],
  ])('%s -> %s', (url, vendor, category) => {
    expect(findTrackerByUrl(url)).toMatchObject({ vendor, category });
  });

  it('leaves vendor dashboards and lookalikes alone', () => {
    expect(findTrackerByUrl('https://app.pendo.io/login')).toBeUndefined();
    expect(findTrackerByUrl('https://heapanalytics.com/app')).toBeUndefined();
    expect(findTrackerByUrl('https://www.optimizely.com/')).toBeUndefined();
    expect(findTrackerByUrl('https://notdemdex.net/x')).toBeUndefined();
    expect(findTrackerByUrl('https://ioam.de.evil.invalid/x')).toBeUndefined();
  });

  it('tells the Facebook SDK apart from the Meta Pixel on connect.facebook.net', () => {
    expect(findTrackerByUrl('https://connect.facebook.net/de_DE/sdk.js')).toMatchObject({
      vendor: 'Facebook SDK',
      category: 'social',
    });
    expect(findTrackerByUrl('https://connect.facebook.net/en_US/all.js')?.vendor).toBe(
      'Facebook SDK',
    );
    expect(findTrackerByUrl('https://connect.facebook.net/en_US/fbevents.js')?.vendor).toBe(
      'Meta Pixel',
    );
    expect(findTrackerByUrl('https://connect.facebook.net/signals/config/123')?.vendor).toBe(
      'Meta Pixel',
    );
    expect(findTrackerByUrl('https://connect.facebook.net/de_DE/sdkx.js')?.vendor).toBe(
      'Meta Pixel',
    );
  });
});

describe('tracker list', () => {
  it('has a domain for every entry', () => {
    for (const tracker of trackers) {
      expect(tracker.domains.length, tracker.vendor).toBeGreaterThan(0);
    }
  });
});

describe('cookies from the Open Cookie Database', () => {
  it('recognises exact names the hand-maintained list does not know', () => {
    expect(findTrackerByCookie('__utma')).toEqual({
      vendor: 'Google Analytics',
      category: 'analytics',
    });
    expect(findTrackerByCookie('__gads')).toEqual({
      vendor: 'DoubleClick/Google Marketing',
      category: 'advertising',
    });
  });

  it('treats wildcard rows as prefixes', () => {
    expect(findTrackerByCookie('_sp_id.1fff')?.vendor).toBe('Snowplow');
    expect(findTrackerByCookie('AMCV_0123ABCD%40AdobeOrg')?.vendor).toBe('Adobe Audience Manager');
  });

  it('matches exact rows only exactly', () => {
    expect(findTrackerByCookie('__gads_backup')).toBeUndefined();
    expect(findTrackerByCookie('x__gads')).toBeUndefined();
  });

  it('lets the hand-maintained list win', () => {
    const ga = findTrackerByCookie('_ga');
    expect(ga?.vendor).toBe('Google Analytics');
    expect(trackers).toContain(ga);
    expect(trackers).toContain(findTrackerByCookie('_pk_id.1.abcd'));
    expect(findTrackerByCookie('_hjSessionUser_42')?.category).toBe('session-replay');
  });

  it('prefers a hand-maintained host over the generated list', () => {
    expect(findTrackerByCookie('__utma', '.criteo.com')?.vendor).toBe('Criteo');
    expect(findTrackerByCookie('__utma', 'example.com')?.vendor).toBe('Google Analytics');
  });

  it('leaves generic and consent cookies alone', () => {
    for (const name of ['session', 'sessionid', 'uid', 'user', 'token', 'lang', 'visitor']) {
      expect(findTrackerByCookie(name), name).toBeUndefined();
    }
    for (const name of ['euconsent', 'mtm_consent_removed', 'matomo_ignore', '__gpi_optout']) {
      expect(findTrackerByCookie(name), name).toBeUndefined();
    }
  });

  it('does not take a shop cookie such as put_cart for Magnite', () => {
    expect(findTrackerByCookie('put_cart')).toBeUndefined();
    expect(findTrackerByCookie('put_item_42')).toBeUndefined();
  });

  it('keeps vendor-specific short prefixes', () => {
    expect(findTrackerByCookie('dtPC')?.vendor).toBe('Dynatrace');
    expect(findTrackerByCookie('CFFC123')?.vendor).toBe('Adform');
  });

  it('only contains analytics and advertising cookies of a safe length', () => {
    for (const { vendor, category, names, prefixes } of openCookieDatabase) {
      expect(['analytics', 'advertising'], vendor).toContain(category);
      for (const name of [...names, ...prefixes]) {
        expect(name.length, `${vendor} ${name}`).toBeGreaterThanOrEqual(4);
      }
    }
  });
});

describe('vendors from install and CSP documentation (2026-11-06)', () => {
  it.each([
    ['https://www.google.com/pagead/1p-conversion/123/?random=1', 'Google Ads'],
    ['https://alb.reddit.com/rp.gif?ts=1&id=t2_abc&event=PageVisit', 'Reddit Pixel'],
    ['https://pixel-config.reddit.com/pixels/t2_abc/config', 'Reddit Pixel'],
    ['https://dev.visualwebsiteoptimizer.com/lib/123456.js', 'VWO'],
    ['https://edge.wingify.net/tag/123456.js', 'VWO'],
    ['https://r2.visualwebsiteoptimizer.com/events/t', 'VWO'],
    ['https://acdn.adnxs.com/dmp/up/pixie.js', 'Microsoft Xandr'],
    ['https://ib.adnxs.com/pixie?pi=abc&e=PageView&script=0', 'Microsoft Xandr'],
    ['https://z-na.amazon-adsystem.com/widgets/onejs?MarketPlace=US', 'Amazon Associates'],
  ])('%s -> %s', (url, vendor) => {
    expect(findTrackerByUrl(url)?.vendor).toBe(vendor);
  });

  it.each([
    'https://www.google.com/search?q=privalint',
    'https://www.google.com/maps/place/x',
    'https://www.reddit.com/r/privacy/',
    'https://www.redditstatic.com/shreddit/en-US/app.js',
    'https://visualwebsiteoptimizer.com.example.net/lib/1.js',
    'https://acdn.adnxs.com/ast/ast.js',
  ])('leaves %s alone', (url) => {
    expect(findTrackerByUrl(url)).toBeUndefined();
  });

  it('recognises VWO cookies', () => {
    expect(findTrackerByCookie('_vwo_uuid_v2')?.vendor).toBe('VWO');
    expect(findTrackerByCookie('_vis_opt_s')?.vendor).toBe('VWO');
  });
});
