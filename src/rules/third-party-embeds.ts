import { findEmbed } from '../data/third-parties.js';
import { say } from '../i18n.js';
import type { Finding, Rule } from '../types.js';
import { groupRequestsByVendor } from './third-party-hits.js';

const ID = 'third-party-embeds';

export const thirdPartyEmbeds: Rule = {
  id: ID,
  title: 'Embedded content loads before consent',
  description:
    'Videos, maps, captchas and social embeds contact their provider as soon as the page loads, ' +
    "which sends the visitor's IP address and often sets cookies. Load them only after the " +
    'visitor has agreed, typically with a click-to-load placeholder.',
  references: ['Art. 6(1) GDPR', '§ 25 Abs. 1 TDDDG'],
  check({ page, lang }) {
    return [...groupRequestsByVendor(page.requests, findEmbed)].map(
      ([vendor, evidence]): Finding => ({
        ruleId: ID,
        severity: 'warning',
        message: say(lang, {
          en: `${vendor} loads before the visitor has given consent.`,
          de: `${vendor} wird geladen, bevor eine Einwilligung vorliegt.`,
        }),
        pageUrl: page.finalUrl,
        subject: vendor,
        evidence,
        fix: say(lang, {
          en: `Show a placeholder and load ${vendor} only after a click or consent. youtube-nocookie.com alone is not enough, it still contacts Google on load.`,
          de: `Einen Platzhalter zeigen und ${vendor} erst nach Klick oder Einwilligung laden. youtube-nocookie.com allein reicht nicht, es kontaktiert Google trotzdem beim Laden.`,
        }),
      }),
    );
  },
};
