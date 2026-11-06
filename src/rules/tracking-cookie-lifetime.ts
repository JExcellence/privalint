import { findTrackerByCookie } from '../data/trackers.js';
import { huArticle, say } from '../i18n.js';
import type { Finding, RecordedCookie, Rule } from '../types.js';

const ID = 'tracking-cookie-lifetime';

/** 13 months, the longest lifetime the CNIL recommends for tracking cookies. */
const MAX_DAYS = 395;
const DAY_SECONDS = 24 * 60 * 60;

export const trackingCookieLifetime: Rule = {
  id: ID,
  title: 'Tracking cookies kept longer than 13 months',
  description:
    'Personal data may only be kept as long as needed. The French regulator CNIL recommends at ' +
    'most 13 months for tracking cookies, and other regulators point to it. privalint notes ' +
    'cookies from the tracker list that the site sets for longer.',
  references: ['Art. 5(1)(e) GDPR', 'CNIL recommendation on cookies, 17.09.2020'],
  check({ page, lang }) {
    const now = Date.now() / 1000;
    const cookies: RecordedCookie[] = [
      ...page.cookies,
      ...(page.consent?.afterReject?.cookies ?? []),
    ];
    const byVendor = new Map<string, Map<string, number>>();
    for (const cookie of cookies) {
      if (cookie.expires < 0) continue;
      const days = Math.round((cookie.expires - now) / DAY_SECONDS);
      if (days <= MAX_DAYS) continue;
      const tracker = findTrackerByCookie(cookie.name, cookie.domain);
      if (tracker === undefined) continue;
      const found = byVendor.get(tracker.vendor) ?? new Map<string, number>();
      found.set(`${cookie.name} (${cookie.domain})`, days);
      byVendor.set(tracker.vendor, found);
    }
    return [...byVendor].map(
      ([vendor, found]): Finding => ({
        ruleId: ID,
        severity: 'info',
        subject: vendor,
        message: say(lang, {
          en: `${vendor} sets cookies that last longer than 13 months.`,
          de: `${vendor} setzt Cookies, die länger als 13 Monate gelten.`,
          hu: `${huArticle(vendor, true)} ${vendor} 13 hónapnál tovább érvényes sütiket állít be.`,
        }),
        pageUrl: page.finalUrl,
        evidence: [...found].map(([cookie, days]) =>
          say(lang, {
            en: `cookie ${cookie}: ${days} days`,
            de: `Cookie ${cookie}: ${days} Tage`,
            hu: `${cookie} süti: ${days} nap`,
          }),
        ),
        fix: say(lang, {
          en: `Set the cookie lifetime of ${vendor} to at most 13 months in its configuration, for Google Analytics the cookie_expires setting.`,
          de: `Die Cookie-Laufzeit von ${vendor} in seiner Konfiguration auf höchstens 13 Monate setzen, bei Google Analytics über die Einstellung cookie_expires.`,
          hu: `Állítsa ${huArticle(vendor)} ${vendor} sütijeinek élettartamát a beállításaiban legfeljebb 13 hónapra, Google Analytics esetén a cookie_expires beállítással.`,
        }),
      }),
    );
  },
};
