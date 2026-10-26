import { say } from '../i18n.js';
import type { Rule } from '../types.js';

const ID = 'reject-option';

export const rejectOption: Rule = {
  id: ID,
  title: 'No way to reject on the first layer of the banner',
  description:
    'Rejecting cookies must be as easy as accepting them. Most European regulators treat a banner ' +
    'that offers "accept" on its first layer, but hides "reject" in the settings or behind a ' +
    'link, as invalid consent.',
  references: [
    'EDPB Cookie Banner Taskforce report, 17.01.2023',
    'DSK-Beschluss, 22.03.2023: Bewertung von Pur-Abo-Modellen auf Websites',
    'EDPB Opinion 08/2024 on consent or pay models',
    'Art. 4(11) GDPR',
    'Art. 7(3) GDPR',
    '§ 25 Abs. 1 TDDDG',
  ],
  check({ page, lang }) {
    const consent = page.consent;
    if (consent?.bannerFound !== true || consent.rejectLabel !== undefined) {
      return [];
    }
    const vendor = consent.cmp === undefined ? '' : ` (${consent.cmp})`;
    const accept = consent.acceptLabel ?? say(lang, { en: 'accept', de: 'Zustimmen' });
    const evidence = [
      say(lang, {
        en: `accept button: ${consent.acceptLabel ?? 'unlabelled'}`,
        de: `Zustimmen-Button: ${consent.acceptLabel ?? 'ohne Beschriftung'}`,
      }),
    ];
    if (consent.payOrOk === true) {
      return [
        {
          ruleId: ID,
          severity: 'info',
          message: say(lang, {
            en: `The consent banner${vendor} offers "${accept}" or a subscription instead of a reject button ("pay or OK").`,
            de: `Das Cookie-Banner${vendor} bietet „${accept}“ oder ein Abo statt eines Ablehnen-Buttons (Pur-Abo-Modell).`,
          }),
          pageUrl: page.finalUrl,
          evidence,
          fix: say(lang, {
            en: 'German regulators consider pay-or-OK generally permissible if the paid option is an equivalent, fairly priced alternative (DSK, 22.03.2023). For large platforms the EDPB is much stricter (Opinion 08/2024). privalint cannot judge this; have it assessed legally.',
            de: 'Deutsche Aufsichtsbehörden halten Pur-Abo-Modelle grundsätzlich für zulässig, wenn das Bezahlangebot eine gleichwertige Alternative zu einem angemessenen Preis ist (DSK, 22.03.2023). Für große Plattformen ist der EDSA deutlich strenger (Stellungnahme 08/2024). privalint kann das nicht beurteilen; bitte rechtlich prüfen lassen.',
          }),
        },
      ];
    }
    return [
      {
        ruleId: ID,
        severity: 'warning',
        message: say(lang, {
          en: `The consent banner${vendor} offers "${accept}" but no reject button next to it.`,
          de: `Das Cookie-Banner${vendor} bietet „${accept}“, aber keinen Ablehnen-Button daneben.`,
        }),
        pageUrl: page.finalUrl,
        evidence,
        fix: say(lang, {
          en: 'Add a button such as "Alle ablehnen" or "Nur notwendige" on the first layer, with the same size and prominence as the accept button.',
          de: 'Einen Button wie „Alle ablehnen“ oder „Nur notwendige“ auf die erste Ebene setzen, gleich groß und gleich auffällig wie den Zustimmen-Button.',
        }),
      },
    ];
  },
};
