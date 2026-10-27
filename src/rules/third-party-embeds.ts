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
          en: `Review the purpose and legal basis for ${vendor}. Where consent is required, use a click-to-load placeholder or block the resource until consent. Security widgets may need a separate necessity assessment.`,
          de: `Zweck und Rechtsgrundlage für ${vendor} prüfen. Soweit Einwilligung erforderlich ist, einen Platzhalter verwenden oder bis zur Einwilligung blockieren. Sicherheits-Widgets benötigen gegebenenfalls eine gesonderte Erforderlichkeitsprüfung.`,
        }),
      }),
    );
  },
};
