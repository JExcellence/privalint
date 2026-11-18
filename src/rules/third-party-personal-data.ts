import { huArticle, type Lang, say } from '../i18n.js';
import { type PersonalParameter, personalParameters } from '../personal-data.js';
import type { Rule } from '../types.js';
import { isFirstParty } from '../url.js';

const ID = 'third-party-personal-data';

function describe(parameter: PersonalParameter, lang: Lang): string {
  const kind =
    parameter.kind === 'email'
      ? say(lang, {
          en: 'e-mail',
          de: 'E-Mail',
          hu: 'e-mail',
          fr: 'e-mail',
          it: 'e-mail',
          es: 'correo electrónico',
          pl: 'e-mail',
        })
      : say(lang, {
          en: 'phone',
          de: 'Telefon',
          hu: 'telefon',
          fr: 'téléphone',
          it: 'telefono',
          es: 'teléfono',
          pl: 'telefon',
        });
  const hashed = parameter.hashed
    ? say(lang, {
        en: ', hashed',
        de: ', gehasht',
        hu: ', hash-elve',
        fr: ', hachés',
        it: ', con hash',
        es: ', con hash',
        pl: ', zahaszowane',
      })
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
          fr: `Les requêtes vers ${host} transmettent ${plain ? 'des adresses e-mail ou des numéros de téléphone' : 'des adresses e-mail ou des numéros de téléphone hachés'} de visiteurs.`,
          it: `Le richieste a ${host} contengono ${plain ? 'indirizzi e-mail o numeri di telefono' : 'indirizzi e-mail o numeri di telefono con hash'} dei visitatori.`,
          es: `Las solicitudes a ${host} contienen ${plain ? 'direcciones de correo electrónico o números de teléfono' : 'direcciones de correo electrónico o números de teléfono con hash'} de los visitantes.`,
          pl: `Żądania do ${host} zawierają ${plain ? 'adresy e-mail lub numery telefonów' : 'zahaszowane adresy e-mail lub numery telefonów'} odwiedzających.`,
        }),
        pageUrl: page.finalUrl,
        evidence: [
          `${host}: ${[...parameters.values()].map((parameter) => describe(parameter, lang)).join(', ')}`,
        ],
        fix: say(lang, {
          en: 'Turn off advanced matching or automatic user data in the tag settings, keep form input out of URLs (use POST), and send such data only after consent and with a legal basis.',
          de: 'Erweiterten Abgleich bzw. automatische Nutzerdaten in den Tag-Einstellungen ausschalten, Formulareingaben nicht in URLs übertragen (POST nutzen) und solche Daten nur mit Einwilligung und Rechtsgrundlage senden.',
          hu: 'Kapcsolja ki a bővített egyeztetést vagy az automatikus felhasználói adatokat a címke beállításaiban, ne tegye az űrlapadatokat URL-be (használjon POST-ot), és ilyen adatot csak hozzájárulással és jogalappal küldjön.',
          fr: "Désactivez la correspondance avancée ou les données utilisateur automatiques dans les réglages de la balise, sortez les saisies de formulaire des URL (utilisez POST), et n'envoyez ces données qu'après consentement et avec une base légale.",
          it: "Disattiva l'advanced matching o i dati utente automatici nelle impostazioni del tag, tieni i dati dei moduli fuori dagli URL (usa POST) e invia tali dati solo dopo il consenso e con una base giuridica.",
          es: 'Desactiva la coincidencia avanzada o los datos de usuario automáticos en la configuración de la etiqueta, mantén los datos de los formularios fuera de las URL (usa POST) y envía esos datos solo tras el consentimiento y con una base jurídica.',
          pl: 'Wyłącz zaawansowane dopasowywanie lub automatyczne dane użytkownika w ustawieniach tagu, nie umieszczaj danych z formularzy w adresach URL (używaj POST) i wysyłaj takie dane tylko po wyrażeniu zgody i na podstawie prawnej.',
        }),
      };
    });
  },
};
