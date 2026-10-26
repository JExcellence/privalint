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
  check({ page }) {
    const consent = page.consent;
    if (consent?.bannerFound !== true || consent.rejectLabel !== undefined) {
      return [];
    }
    const vendor = consent.cmp === undefined ? '' : ` (${consent.cmp})`;
    if (consent.payOrOk === true) {
      return [
        {
          ruleId: ID,
          severity: 'info',
          message: `The consent banner${vendor} offers "${consent.acceptLabel ?? 'accept'}" or a subscription instead of a reject button ("pay or OK").`,
          pageUrl: page.finalUrl,
          evidence: [`accept button: ${consent.acceptLabel ?? 'unlabelled'}`],
          fix: 'German regulators consider pay-or-OK generally permissible if the paid option is an equivalent, fairly priced alternative (DSK, 22.03.2023). For large platforms the EDPB is much stricter (Opinion 08/2024). privalint cannot judge this; have it assessed legally.',
        },
      ];
    }
    return [
      {
        ruleId: ID,
        severity: 'warning',
        message: `The consent banner${vendor} offers "${consent.acceptLabel ?? 'accept'}" but no reject button next to it.`,
        pageUrl: page.finalUrl,
        evidence: [`accept button: ${consent.acceptLabel ?? 'unlabelled'}`],
        fix: 'Add a button such as "Alle ablehnen" or "Nur notwendige" on the first layer, with the same size and prominence as the accept button.',
      },
    ];
  },
};
