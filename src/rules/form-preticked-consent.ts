import { plPlural, say } from '../i18n.js';
import type { Rule } from '../types.js';

const ID = 'form-preticked-consent';

/** Checkbox labels that ask for advertising or newsletter consent. */
const MARKETING =
  /newsletter|\bnews\b|\boffers?\b|marketing|promotion|werbung|werbe|angebote|aktionen|hírlevél|ajánlat|reklám|akció|direkt\s?marketing|e-?mail-?updates/iu;

export const formPretickedConsent: Rule = {
  id: ID,
  title: 'A form ticks marketing consent in advance',
  description:
    'Consent has to be an active choice: a newsletter or offers checkbox that is ticked when the ' +
    'page loads collects no valid consent (CJEU C-673/17, Planet49). privalint reads the ' +
    'checkboxes of forms with an e-mail, phone or password field.',
  references: ['Art. 4(11) GDPR', 'Art. 7 GDPR', 'CJEU C-673/17'],
  check({ page, lang }) {
    const ticked = (page.forms ?? []).flatMap((form) =>
      (form.checkedBoxes ?? []).filter((label) => MARKETING.test(label)),
    );
    if (ticked.length === 0) return [];
    const labels = [...new Set(ticked)];
    return [
      {
        ruleId: ID,
        severity: 'warning',
        message: say(lang, {
          en: `${labels.length} marketing consent checkbox(es) are ticked before the visitor chooses.`,
          de: `${labels.length} Einwilligungs-Checkbox(en) für Werbung sind angehakt, bevor der Besucher wählt.`,
          hu: `${labels.length} marketing-hozzájárulási jelölőnégyzet már be van jelölve, mielőtt a látogató döntene.`,
          fr: `${labels.length <= 1 ? `${labels.length} case de consentement marketing est cochée` : `${labels.length} cases de consentement marketing sont cochées`} avant que le visiteur ne choisisse.`,
          it: `${labels.length === 1 ? `${labels.length} casella di consenso marketing è spuntata` : `${labels.length} caselle di consenso marketing sono spuntate`} prima che il visitatore scelga.`,
          es: `${labels.length === 1 ? `${labels.length} casilla de consentimiento de marketing está marcada` : `${labels.length} casillas de consentimiento de marketing están marcadas`} antes de que el visitante elija.`,
          pl: `${labels.length} ${plPlural(labels.length, 'pole zgody marketingowej jest zaznaczone', 'pola zgody marketingowej są zaznaczone', 'pól zgody marketingowej jest zaznaczonych')}, zanim odwiedzający dokona wyboru.`,
        }),
        pageUrl: page.finalUrl,
        evidence: labels.slice(0, 3).map((label) =>
          say(lang, {
            en: `ticked: "${label}"`,
            de: `angehakt: „${label}“`,
            hu: `bejelölve: „${label}”`,
            fr: `cochée : « ${label} »`,
            it: `spuntata: «${label}»`,
            es: `marcada: «${label}»`,
            pl: `zaznaczone: „${label}”`,
          }),
        ),
        fix: say(lang, {
          en: 'Leave newsletter and offers checkboxes unticked, so that visitors tick them themselves.',
          de: 'Newsletter- und Werbe-Checkboxen nicht vorab anhaken, damit Besucher sie selbst setzen.',
          hu: 'A hírlevél- és ajánlat-jelölőnégyzeteket hagyja üresen, hogy a látogatók maguk jelöljék be őket.',
          fr: 'Laissez décochées les cases pour la newsletter et les offres, afin que les visiteurs les cochent eux-mêmes.',
          it: 'Lascia non spuntate le caselle per newsletter e offerte, in modo che siano i visitatori a spuntarle.',
          es: 'Deja sin marcar las casillas de boletín y ofertas, para que las marquen los propios visitantes.',
          pl: 'Pozostaw pola newslettera i ofert niezaznaczone, aby odwiedzający zaznaczali je sami.',
        }),
      },
    ];
  },
};
