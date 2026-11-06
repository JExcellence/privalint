import { say } from '../i18n.js';
import type { Rule } from '../types.js';

const ID = 'reject-option';

export const rejectOption: Rule = {
  id: ID,
  title: 'No supported reject control detected on the first layer of the banner',
  description:
    'Rejecting cookies must be as easy as accepting them. Most European regulators treat a banner ' +
    'that offers "accept" on its first layer, but hides "reject" in the settings or behind a ' +
    'link, as invalid consent.',
  references: [
    'EDPB Cookie Banner Taskforce report, 17.01.2023',
    'DSK-Beschluss, 22.03.2023: Bewertung von Pur-Abo-Modellen auf Websites',
    'EDPB Opinion 08/2024 on consent or pay models',
    'Art. 4(11) GDPR',
    '§ 25 Abs. 1 TDDDG',
  ],
  check({ page, lang }) {
    const consent = page.consent;
    if (
      consent?.bannerFound !== true ||
      consent.acceptLabel === undefined ||
      consent.rejectLabel !== undefined
    ) {
      return [];
    }
    const vendor = consent.cmp === undefined ? '' : ` (${consent.cmp})`;
    const accept =
      consent.acceptLabel ?? say(lang, { en: 'accept', de: 'Zustimmen', hu: 'elfogadás' });
    const evidence = [
      say(lang, {
        en: `accept button: ${consent.acceptLabel ?? 'unlabelled'}`,
        de: `Zustimmen-Button: ${consent.acceptLabel ?? 'ohne Beschriftung'}`,
        hu: `elfogadás gomb: ${consent.acceptLabel ?? 'felirat nélkül'}`,
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
            hu: `A sütibanner${vendor} „${accept}” mellett előfizetést kínál elutasítás gomb helyett („fizess vagy fogadd el”).`,
          }),
          pageUrl: page.finalUrl,
          evidence,
          fix: say(lang, {
            en: 'German regulators consider pay-or-OK generally permissible if the paid option is an equivalent, fairly priced alternative (DSK, 22.03.2023). For large platforms the EDPB is much stricter (Opinion 08/2024). privalint cannot judge this; have it assessed legally.',
            de: 'Deutsche Aufsichtsbehörden halten Pur-Abo-Modelle grundsätzlich für zulässig, wenn das Bezahlangebot eine gleichwertige Alternative zu einem angemessenen Preis ist (DSK, 22.03.2023). Für große Plattformen ist der EDSA deutlich strenger (Stellungnahme 08/2024). privalint kann das nicht beurteilen; bitte rechtlich prüfen lassen.',
            hu: 'A német adatvédelmi hatóságok a „fizess vagy fogadd el” modellt általában megengedhetőnek tartják, ha a fizetős lehetőség egyenértékű, méltányos árú alternatíva (DSK, 2023.03.22.). Nagy platformokra az EDPB jóval szigorúbb (08/2024. sz. vélemény). A privalint ezt nem tudja megítélni; kérjen jogi értékelést.',
          }),
        },
      ];
    }
    return [
      {
        ruleId: ID,
        severity: 'warning',
        message: say(lang, {
          en: `The consent banner${vendor} offers "${accept}"; no supported first-layer reject control was detected. Verify the banner manually.`,
          de: `Das Cookie-Banner${vendor} bietet „${accept}“; eine unterstützte Ablehnen-Steuerung auf der ersten Ebene wurde nicht erkannt. Das Banner manuell prüfen.`,
          hu: `A sütibanner${vendor} „${accept}” lehetőséget kínál, de az első szinten nem található támogatott elutasítási lehetőség. Ellenőrizze a bannert kézzel.`,
        }),
        pageUrl: page.finalUrl,
        evidence,
        fix: say(lang, {
          en: 'Add a button such as "Alle ablehnen" or "Nur notwendige" on the first layer, with the same size and prominence as the accept button.',
          de: 'Einen Button wie „Alle ablehnen“ oder „Nur notwendige“ auf die erste Ebene setzen, gleich groß und gleich auffällig wie den Zustimmen-Button.',
          hu: 'Helyezzen el az első szinten egy „Az összes elutasítása” vagy „Csak a szükségesek” gombot, ugyanakkora méretben és ugyanolyan feltűnően, mint az elfogadás gombot.',
        }),
      },
    ];
  },
};
