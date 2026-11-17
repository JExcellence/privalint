import { huArticle } from '../i18n.js';
import type { Finding, Rule } from '../types.js';
import { categoryLabel, findTrackerHits, trackerFinding } from './tracker-hits.js';

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
    'CJEU, 01.10.2019, C-673/17 (Planet49)',
  ],
  check({ page, lang, region }) {
    const hits = findTrackerHits(page.requests, page.cookies, lang, page.storage, page.cnameCloaks);
    return hits.map((hit): Finding => {
      const { vendor } = hit.tracker;
      const category = categoryLabel(hit.tracker.category, lang);
      const isTagManager = hit.tracker.category === 'tag-manager';
      return {
        ruleId: ID,
        ...trackerFinding(
          hit,
          lang,
          {
            message: isTagManager
              ? {
                  en: `${vendor} loads before consent and sends the visitor's IP address to a third party.`,
                  de: `${vendor} wird vor der Einwilligung geladen und überträgt die IP-Adresse an einen Dritten.`,
                  hu: `${huArticle(vendor, true)} ${vendor} a hozzájárulás előtt betöltődik, és harmadik félnek továbbítja a látogató IP-címét.`,
                }
              : {
                  en: `${vendor} (${category}) runs before the visitor has given consent.`,
                  de: `${vendor} (${category}) läuft, bevor eine Einwilligung vorliegt.`,
                  hu: `${huArticle(vendor, true)} ${vendor} (${category}) fut, mielőtt a látogató hozzájárult volna.`,
                },
            ...(isTagManager
              ? {}
              : {
                  deniedMessage: {
                    en: `${vendor} (${category}) sends Google Consent Mode pings before the visitor has given consent.`,
                    de: `${vendor} (${category}) sendet Google-Consent-Mode-Pings, bevor eine Einwilligung vorliegt.`,
                    hu: `${huArticle(vendor, true)} ${vendor} (${category}) Google Consent Mode pingeket küld, mielőtt a látogató hozzájárult volna.`,
                  },
                }),
            grantedMessage: {
              en: `${vendor} tells Google that consent was granted before the visitor chose anything (Google Consent Mode).`,
              de: `${vendor} meldet Google eine erteilte Einwilligung, bevor der Besucher etwas ausgewählt hat (Google Consent Mode).`,
              hu: `${huArticle(vendor, true)} ${vendor} megadott hozzájárulást jelez a Google-nek, mielőtt a látogató bármit választott volna (Google Consent Mode).`,
            },
            fix: {
              en: `Only load ${vendor} after opt-in, for example by letting your consent manager inject it or by using it in a consent mode that sends no requests until consent is given.`,
              de: `${vendor} erst nach der Einwilligung laden, zum Beispiel über das Consent-Tool, oder einen Consent-Modus nutzen, der vorher keine Anfragen sendet.`,
              hu: `${huArticle(vendor, true)} ${vendor} csak hozzájárulás után töltődjön be, például úgy, hogy a hozzájárulás-kezelő illeszti be, vagy olyan hozzájárulási módban, amely a hozzájárulásig nem küld kéréseket.`,
            },
            grantedFix: {
              en: 'Set the Consent Mode defaults for ad_storage, analytics_storage, ad_user_data and ad_personalization to "denied" before any Google tag runs, and update them to "granted" only after the visitor accepts.',
              de: 'Die Consent-Mode-Standardwerte für ad_storage, analytics_storage, ad_user_data und ad_personalization auf „denied“ setzen, bevor ein Google-Tag läuft, und erst nach der Zustimmung auf „granted“ aktualisieren.',
              hu: 'Állítsa a Consent Mode alapértékeit (ad_storage, analytics_storage, ad_user_data, ad_personalization) „denied” értékre, mielőtt bármely Google-címke futna, és csak a látogató elfogadása után frissítse őket „granted” értékre.',
            },
          },
          region,
        ),
        pageUrl: page.finalUrl,
        subject: vendor,
        evidence: hit.evidence,
      };
    });
  },
};
