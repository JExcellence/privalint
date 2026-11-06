import { huArticle, type Lang, say } from '../i18n.js';
import { type PersonalParameter, personalParameters } from '../personal-data.js';
import type { Rule } from '../types.js';
import { isFirstParty } from '../url.js';

const ID = 'third-party-personal-data';

function describe(parameter: PersonalParameter, lang: Lang): string {
  const kind =
    parameter.kind === 'email'
      ? say(lang, { en: 'e-mail', de: 'E-Mail', hu: 'e-mail' })
      : say(lang, { en: 'phone', de: 'Telefon', hu: 'telefon' });
  const hashed = parameter.hashed
    ? say(lang, { en: ', hashed', de: ', gehasht', hu: ', hash-elve' })
    : '';
  return `${parameter.name} (${kind}${hashed})`;
}

export const thirdPartyPersonalData: Rule = {
  id: ID,
  title: 'Requests to other sites carry e-mail addresses or phone numbers',
  description:
    'Pixels with advanced matching, analytics setups and search pages can put e-mail addresses ' +
    'or phone numbers into the address of a request to another site, plain or as a hash. A hash ' +
    'of an e-mail address still identifies the person. privalint reports the parameter names, ' +
    'never the values.',
  references: ['Art. 5(1)(c) GDPR', 'Art. 6(1) GDPR', 'Art. 44 GDPR'],
  check({ page, siteUrl, lang }) {
    const byHost = new Map<string, Map<string, PersonalParameter>>();
    for (const request of page.requests) {
      if (isFirstParty(request.url, siteUrl)) continue;
      const found = personalParameters(request.url);
      if (found.length === 0) continue;
      const host = new URL(request.url).hostname;
      const parameters = byHost.get(host) ?? new Map<string, PersonalParameter>();
      for (const parameter of found) parameters.set(parameter.name, parameter);
      byHost.set(host, parameters);
    }
    return [...byHost].map(([host, parameters]) => {
      const plain = [...parameters.values()].some((parameter) => !parameter.hashed);
      return {
        ruleId: ID,
        severity: 'warning',
        subject: host,
        message: say(lang, {
          en: `Requests to ${host} carry ${plain ? 'e-mail addresses or phone numbers' : 'hashed e-mail addresses or phone numbers'} of visitors.`,
          de: `Anfragen an ${host} enthalten ${plain ? 'E-Mail-Adressen oder Telefonnummern' : 'gehashte E-Mail-Adressen oder Telefonnummern'} von Besuchern.`,
          hu: `${huArticle(host, true)} ${host} felé küldött kérések a látogatók ${plain ? 'e-mail-címét vagy telefonszámát' : 'hash-elt e-mail-címét vagy telefonszámát'} tartalmazzák.`,
        }),
        pageUrl: page.finalUrl,
        evidence: [
          `${host}: ${[...parameters.values()].map((parameter) => describe(parameter, lang)).join(', ')}`,
        ],
        fix: say(lang, {
          en: 'Turn off advanced matching or automatic user data in the tag settings, keep form input out of URLs (use POST), and send such data only after consent and with a legal basis.',
          de: 'Erweiterten Abgleich bzw. automatische Nutzerdaten in den Tag-Einstellungen ausschalten, Formulareingaben nicht in URLs übertragen (POST nutzen) und solche Daten nur mit Einwilligung und Rechtsgrundlage senden.',
          hu: 'Kapcsolja ki a bővített egyeztetést vagy az automatikus felhasználói adatokat a címke beállításaiban, ne tegye az űrlapadatokat URL-be (használjon POST-ot), és ilyen adatot csak hozzájárulással és jogalappal küldjön.',
        }),
      };
    });
  },
};
