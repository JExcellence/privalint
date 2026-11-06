import { say } from '../i18n.js';
import type { Rule } from '../types.js';
import { findTrackerHits } from './tracker-hits.js';

const ID = 'gpc-signal';

export const gpcSignal: Rule = {
  id: ID,
  title: 'How the site reacts to Global Privacy Control',
  description:
    'Global Privacy Control (Sec-GPC: 1) is a browser signal that refuses the sale and sharing of ' +
    'personal data. It is binding under the CCPA; in the EU some consent managers treat it as a ' +
    'refusal. With --gpc, privalint loads the start page with the signal and compares the banner ' +
    'and the trackers with the plain load. Always info.',
  references: ['Art. 21(5) GDPR'],
  check({ page, lang }) {
    const consent = page.consent;
    const gpc = consent?.gpc;
    const after = gpc?.afterGpc;
    if (consent?.bannerFound !== true || gpc?.outcome !== 'observed' || after === undefined) {
      return [];
    }
    const vendors = (hits: ReturnType<typeof findTrackerHits>) =>
      hits.map((hit) => hit.tracker.vendor);
    const plain = vendors(findTrackerHits(page.requests, page.cookies, lang, page.storage));
    const withGpc = vendors(
      findTrackerHits(after.requests, after.cookies, lang, after.storage ?? []),
    );
    const list = (names: string[]) =>
      names.length === 0 ? say(lang, { en: 'none', de: 'keine', hu: 'nincs' }) : names.join(', ');
    const evidence = [
      `banner without GPC: shown`,
      `banner with GPC: ${gpc.bannerShown === true ? 'shown' : 'hidden'}`,
      `trackers without GPC: ${list(plain)}`,
      `trackers with GPC: ${list(withGpc)}`,
    ];
    const hidden = gpc.bannerShown !== true;
    const honoured = hidden && withGpc.length === 0;
    const message = !hidden
      ? say(lang, {
          en: 'The site does not react to Global Privacy Control: the consent banner is still shown.',
          de: 'Die Website reagiert nicht auf Global Privacy Control: das Consent-Banner erscheint weiterhin.',
          hu: 'A webhely nem reagál a Global Privacy Control jelzésre: a hozzájárulási banner továbbra is megjelenik.',
        })
      : withGpc.length === 0
        ? say(lang, {
            en: 'The site honours Global Privacy Control: the consent banner is hidden and no trackers load.',
            de: 'Die Website beachtet Global Privacy Control: das Consent-Banner wird ausgeblendet und keine Tracker laden.',
            hu: 'A webhely figyelembe veszi a Global Privacy Control jelzést: a hozzájárulási banner rejtve marad, és nem töltődik be követő.',
          })
        : say(lang, {
            en: `The site hides the consent banner under Global Privacy Control, but trackers still load: ${withGpc.join(', ')}.`,
            de: `Die Website blendet das Consent-Banner bei Global Privacy Control aus, aber Tracker laden weiterhin: ${withGpc.join(', ')}.`,
            hu: `A webhely Global Privacy Control mellett elrejti a hozzájárulási bannert, de követők továbbra is betöltődnek: ${withGpc.join(', ')}.`,
          });
    return [
      {
        ruleId: ID,
        severity: 'info',
        message,
        pageUrl: page.finalUrl,
        evidence,
        ...(honoured
          ? {}
          : {
              fix: say(lang, {
                en: 'Treat Sec-GPC: 1 and navigator.globalPrivacyControl as a refusal: store the choice as rejected and load no trackers. Many consent managers have a setting for it.',
                de: 'Sec-GPC: 1 und navigator.globalPrivacyControl als Ablehnung behandeln: die Wahl als abgelehnt speichern und keine Tracker laden. Viele Consent-Manager haben dafür eine Einstellung.',
                hu: 'Kezelje elutasításként a Sec-GPC: 1 fejlécet és a navigator.globalPrivacyControl értéket: tárolja a választást elutasításként, és ne töltsön be követőt. Sok hozzájárulás-kezelőben van erre beállítás.',
              }),
            }),
      },
    ];
  },
};
