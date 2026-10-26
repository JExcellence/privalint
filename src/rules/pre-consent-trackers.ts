import { say } from '../i18n.js';
import type { Finding, Rule } from '../types.js';
import { categoryLabel, findTrackerHits } from './tracker-hits.js';

const ID = 'pre-consent-trackers';

export const preConsentTrackers: Rule = {
  id: ID,
  title: 'Trackers run before consent',
  description:
    'Analytics, advertising and session-replay tools must not load or set cookies until the ' +
    'visitor has opted in. The page is loaded without interacting with any consent banner, so ' +
    'everything reported here happened before consent.',
  references: [
    '§ 25 Abs. 1 TDDDG',
    'Art. 5(3) ePrivacy Directive',
    'Art. 6(1)(a) GDPR',
    'CJEU C-673/17 (Planet49)',
  ],
  check({ page, lang }) {
    const hits = findTrackerHits(page.requests, page.cookies, lang);
    return hits.map(({ tracker, evidence }): Finding => {
      const { vendor } = tracker;
      const isTagManager = tracker.category === 'tag-manager';
      const category = categoryLabel(tracker.category, lang);
      return {
        ruleId: ID,
        severity: isTagManager ? 'warning' : 'error',
        message: isTagManager
          ? say(lang, {
              en: `${vendor} loads before consent and sends the visitor's IP address to a third party.`,
              de: `${vendor} wird vor der Einwilligung geladen und überträgt die IP-Adresse an einen Dritten.`,
            })
          : say(lang, {
              en: `${vendor} (${category}) runs before the visitor has given consent.`,
              de: `${vendor} (${category}) läuft, bevor eine Einwilligung vorliegt.`,
            }),
        pageUrl: page.finalUrl,
        subject: vendor,
        evidence,
        fix: say(lang, {
          en: `Only load ${vendor} after opt-in, for example by letting your consent manager inject it or by using it in a consent mode that sends no requests until consent is given.`,
          de: `${vendor} erst nach der Einwilligung laden, zum Beispiel über das Consent-Tool, oder einen Consent-Modus nutzen, der vorher keine Anfragen sendet.`,
        }),
      };
    });
  },
};
