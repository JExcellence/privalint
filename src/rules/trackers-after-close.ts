import { huArticle, say } from '../i18n.js';
import type { Finding, Rule } from '../types.js';
import { categoryLabel, findTrackerHits } from './tracker-hits.js';

const ID = 'trackers-after-close';

export const trackersAfterClose: Rule = {
  id: ID,
  title: 'Closing the banner counts as consent',
  description:
    'Opt-in check. privalint closes the consent banner on the start page with its close button ' +
    '("×", "Schließen") in a fresh browser, reloads the page and records what loads. Closing a ' +
    'banner is no choice, so trackers that run afterwards treat it as consent.',
  references: ['Art. 4(11) GDPR', '§ 25 Abs. 1 TDDDG'],
  requires: ['after-close'],
  check({ page, lang }) {
    const close = page.consent?.close;
    const after = close?.afterClose;
    if (after === undefined) return [];
    const button = close?.closeLabel ?? '×';
    return findTrackerHits(after.requests, after.cookies, lang, after.storage).map(
      ({ tracker, evidence }): Finding => {
        const { vendor } = tracker;
        const category = categoryLabel(tracker.category, lang);
        return {
          ruleId: ID,
          // As in trackers-after-reject: a tag manager alone may still be configured correctly.
          severity: tracker.category === 'tag-manager' ? 'warning' : 'error',
          message: say(lang, {
            en: `${vendor} (${category}) runs after closing the banner with "${button}".`,
            de: `${vendor} (${category}) läuft, nachdem das Banner mit „${button}“ geschlossen wurde.`,
            hu: `${huArticle(vendor, true)} ${vendor} (${category}) fut, miután a bannert ${huArticle(button)} „${button}” gombbal bezárták.`,
          }),
          pageUrl: page.finalUrl,
          subject: vendor,
          evidence,
          fix: say(lang, {
            en: `Treat closing the banner like no choice: keep ${vendor} blocked until the visitor accepts, or remove the close button.`,
            de: `Das Schließen des Banners wie keine Entscheidung behandeln: ${vendor} blockiert lassen, bis der Besucher zustimmt, oder die Schließen-Schaltfläche entfernen.`,
            hu: `A banner bezárását kezelje döntés hiányaként: ${huArticle(vendor)} ${vendor} maradjon blokkolva, amíg a látogató el nem fogadja, vagy távolítsa el a bezárás gombot.`,
          }),
        };
      },
    );
  },
};
