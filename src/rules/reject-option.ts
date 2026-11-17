import { say, type Text } from '../i18n.js';
import type { Rule } from '../types.js';

const ID = 'reject-option';

/**
 * Italy accepts a command such as an "X" that closes the banner and keeps the default settings as
 * the way to refuse (Garante privacy, cookie guidelines of 10.06.2021, § 7.1). Whether closing
 * really keeps trackers off is checked by trackers-after-close.
 */
const ITALIAN_CLOSE_NOTE: Text = {
  en: ' In Italy, an "X" that closes the banner and keeps only technical cookies also counts as refusal (Garante privacy, 10.06.2021, § 7.1); run privalint with --check-close to test one.',
  de: ' In Italien gilt auch ein „X“, das das Banner schließt und nur technische Cookies belässt, als Ablehnung (Garante privacy, 10.06.2021, § 7.1); privalint mit --check-close ausführen, um es zu prüfen.',
  hu: ' Olaszországban a bannert bezáró „X” is elutasításnak számít, ha csak a technikai sütik maradnak (Garante privacy, 2021.06.10., 7.1. pont); a vizsgálathoz futtassa a privalintet a --check-close kapcsolóval.',
};

/** The close check ran, but found no "X" it could use or could not watch the page after it. */
const ITALIAN_CLOSE_NOT_USED: Text = {
  en: ' In Italy, an "X" that closes the banner and keeps only technical cookies also counts as refusal (Garante privacy, 10.06.2021, § 7.1); the close check found none it could use and fully observe, or trackers-after-close does not run to verify it.',
  de: ' In Italien gilt auch ein „X“, das das Banner schließt und nur technische Cookies belässt, als Ablehnung (Garante privacy, 10.06.2021, § 7.1); die Schließen-Prüfung fand keines, das sie benutzen und vollständig beobachten konnte, oder trackers-after-close läuft nicht, um es zu prüfen.',
  hu: ' Olaszországban a bannert bezáró „X” is elutasításnak számít, ha csak a technikai sütik maradnak (Garante privacy, 2021.06.10., 7.1. pont); a bezárás vizsgálata nem talált olyat, amelyet használni és teljesen megfigyelni tudott volna, vagy a trackers-after-close szabály nem fut, hogy ellenőrizze.',
};

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
  check({ page, lang, region, selectedRules }) {
    const consent = page.consent;
    if (
      consent?.bannerFound !== true ||
      consent.acceptLabel === undefined ||
      consent.rejectLabel !== undefined
    ) {
      return [];
    }
    // Only when the page after closing was fully observed, so trackers-after-close can judge it.
    if (
      region === 'it' &&
      consent.close?.outcome === 'closed' &&
      consent.close.afterCloseComplete !== false &&
      selectedRules?.has('trackers-after-close') === true
    ) {
      return [];
    }
    const vendor = consent.cmp === undefined ? '' : ` (${consent.cmp})`;
    const accept = consent.acceptLabel;
    const evidence = [
      say(lang, {
        en: `accept button: ${accept}`,
        de: `Zustimmen-Button: ${accept}`,
        hu: `elfogadás gomb: ${accept}`,
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
        fix:
          say(lang, {
            en: 'Add a button such as "Alle ablehnen" or "Nur notwendige" on the first layer, with the same size and prominence as the accept button.',
            de: 'Einen Button wie „Alle ablehnen“ oder „Nur notwendige“ auf die erste Ebene setzen, gleich groß und gleich auffällig wie den Zustimmen-Button.',
            hu: 'Helyezzen el az első szinten egy „Az összes elutasítása” vagy „Csak a szükségesek” gombot, ugyanakkora méretben és ugyanolyan feltűnően, mint az elfogadás gombot.',
          }) +
          (region !== 'it'
            ? ''
            : say(lang, consent.close === undefined ? ITALIAN_CLOSE_NOTE : ITALIAN_CLOSE_NOT_USED)),
      },
    ];
  },
};
