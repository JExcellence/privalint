import { findTrackerByCookie } from '../data/trackers.js';
import { huArticle, plPlural, say } from '../i18n.js';
import type { Finding, RecordedCookie, Rule } from '../types.js';

const ID = 'tracking-cookie-lifetime';

/** The CNIL's lifetime for consent-exempt audience measurement cookies, used as a benchmark. */
const MAX_MONTHS = 13;
const DAY_SECONDS = 24 * 60 * 60;

export const trackingCookieLifetime: Rule = {
  id: ID,
  title: 'Tracking cookies kept longer than 13 months',
  description:
    'Personal data may only be kept as long as needed. The French regulator CNIL sets 13 months ' +
    'for cookies of audience measurement without consent, a common benchmark for tracking ' +
    'cookies. privalint notes ' +
    'cookies from the tracker list that the site sets for longer.',
  references: ['Art. 5(1)(e) GDPR', 'CNIL recommendation on cookies, 17.09.2020'],
  check({ page, lang }) {
    const now = Date.now() / 1000;
    // Calendar months, so a cookie set for exactly 13 months passes whatever the month lengths.
    const limit = new Date();
    limit.setMonth(limit.getMonth() + MAX_MONTHS);
    const limitSeconds = limit.getTime() / 1000 + DAY_SECONDS;
    const cookies: RecordedCookie[] = [
      ...page.cookies,
      ...(page.consent?.afterReject?.cookies ?? []),
    ];
    const byVendor = new Map<string, Map<string, number>>();
    for (const cookie of cookies) {
      if (cookie.expires < 0) continue;
      if (cookie.expires <= limitSeconds) continue;
      const days = Math.round((cookie.expires - now) / DAY_SECONDS);
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
          fr: `${vendor} pose des cookies dont la durée dépasse 13 mois.`,
          it: `${vendor} imposta cookie che durano più di 13 mesi.`,
          es: `${vendor} instala cookies que duran más de 13 meses.`,
          pl: `${vendor} ustawia pliki cookie ważne dłużej niż 13 miesięcy.`,
        }),
        pageUrl: page.finalUrl,
        evidence: [...found].map(([cookie, days]) =>
          say(lang, {
            en: `cookie ${cookie}: ${days} days`,
            de: `Cookie ${cookie}: ${days} Tage`,
            hu: `${cookie} süti: ${days} nap`,
            fr: `cookie ${cookie} : ${days} jours`,
            it: `cookie ${cookie}: ${days} giorni`,
            es: `cookie ${cookie}: ${days} días`,
            pl: `cookie ${cookie}: ${days} ${plPlural(days, 'dzień', 'dni', 'dni')}`,
          }),
        ),
        fix: say(lang, {
          en: `Set the cookie lifetime of ${vendor} to at most 13 months in its configuration, for Google Analytics the cookie_expires setting.`,
          de: `Die Cookie-Laufzeit von ${vendor} in seiner Konfiguration auf höchstens 13 Monate setzen, bei Google Analytics über die Einstellung cookie_expires.`,
          hu: `Állítsa ${huArticle(vendor)} ${vendor} sütijeinek élettartamát a beállításaiban legfeljebb 13 hónapra, Google Analytics esetén a cookie_expires beállítással.`,
          fr: `Limitez à 13 mois au plus la durée des cookies de ${vendor} dans sa configuration, pour Google Analytics avec le réglage cookie_expires.`,
          it: `Imposta la durata dei cookie di ${vendor} a non più di 13 mesi nella sua configurazione; per Google Analytics è l'impostazione cookie_expires.`,
          es: `Fija la duración de las cookies de ${vendor} en 13 meses como máximo en su configuración; en Google Analytics, el ajuste cookie_expires.`,
          pl: `Ustaw w konfiguracji ${vendor} czas życia plików cookie na najwyżej 13 miesięcy; w Google Analytics służy do tego ustawienie cookie_expires.`,
        }),
      }),
    );
  },
};
