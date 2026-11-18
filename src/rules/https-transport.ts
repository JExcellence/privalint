import { say, type Text } from '../i18n.js';
import type { Finding, Rule } from '../types.js';

const ID = 'https-transport';

/** Development servers: plain HTTP there is normal and says nothing about the live site. */
const LOOPBACK = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])$|\.localhost$/i;

export const httpsTransport: Rule = {
  id: ID,
  title: 'The site is reachable over plain HTTP',
  description:
    'Personal data from forms, logins and cookies has to be protected in transit. privalint ' +
    'checks that the start page is served over HTTPS, that http:// on the same host redirects to ' +
    'HTTPS, and whether the site sends HSTS. Native scans only: the extra request to http:// is ' +
    'not made through a network adapter.',
  references: ['Art. 32 DSGVO', '§ 19 Abs. 4 TDDDG'],
  requires: ['transport'],
  check({ page, lang }) {
    const transport = page.transport;
    if (transport === undefined || LOOPBACK.test(new URL(page.finalUrl).hostname)) return [];
    const finding = (
      severity: Finding['severity'],
      message: Text,
      fix: Text,
      evidence: string,
    ): Finding[] => [
      {
        ruleId: ID,
        severity,
        message: say(lang, message),
        pageUrl: page.finalUrl,
        evidence: [evidence],
        fix: say(lang, fix),
      },
    ];
    if (!transport.https) {
      return finding(
        'error',
        {
          en: 'The start page is served over plain HTTP. Everything visitors send or receive travels unencrypted.',
          de: 'Die Startseite wird über unverschlüsseltes HTTP ausgeliefert. Alles, was Besucher senden oder empfangen, wird unverschlüsselt übertragen.',
          hu: 'A kezdőlap titkosítatlan HTTP-n érhető el. Minden, amit a látogatók küldenek vagy kapnak, titkosítás nélkül halad át.',
          fr: "La page d'accueil est servie en HTTP simple. Tout ce que les visiteurs envoient ou reçoivent circule sans chiffrement.",
          it: 'La pagina iniziale è servita in HTTP semplice. Tutto ciò che i visitatori inviano o ricevono viaggia senza crittografia.',
          es: 'La página de inicio se sirve por HTTP sin cifrar. Todo lo que los visitantes envían o reciben viaja sin cifrado.',
          pl: 'Strona startowa jest serwowana przez zwykły HTTP. Wszystko, co odwiedzający wysyłają lub odbierają, jest przesyłane bez szyfrowania.',
        },
        {
          en: 'Serve the site over HTTPS (a free certificate from Let’s Encrypt is enough) and redirect http:// to it.',
          de: 'Die Seite über HTTPS ausliefern (ein kostenloses Zertifikat von Let’s Encrypt genügt) und http:// dorthin umleiten.',
          hu: 'Szolgálja ki az oldalt HTTPS-en (egy ingyenes Let’s Encrypt-tanúsítvány is elég), és irányítsa át rá a http:// címeket.',
          fr: "Servez le site en HTTPS (un certificat gratuit de Let's Encrypt suffit) et redirigez http:// vers celui-ci.",
          it: 'Servi il sito in HTTPS (basta un certificato gratuito di Let’s Encrypt) e reindirizza http:// verso di esso.',
          es: 'Sirve el sitio por HTTPS (basta un certificado gratuito de Let’s Encrypt) y redirige http:// hacia él.',
          pl: 'Serwuj witrynę przez HTTPS (wystarczy bezpłatny certyfikat Let’s Encrypt) i przekierowuj na nią http://.',
        },
        page.finalUrl,
      );
    }
    if (transport.httpRedirectsToHttps === false) {
      const httpUrl = `http://${new URL(page.finalUrl).hostname}/`;
      return finding(
        'warning',
        {
          en: `${httpUrl} answers without redirecting to HTTPS, so a visitor who types the address without https:// stays unencrypted.`,
          de: `${httpUrl} antwortet ohne Weiterleitung auf HTTPS; wer die Adresse ohne https:// eintippt, bleibt unverschlüsselt.`,
          hu: `${httpUrl} nem irányít át HTTPS-re, így aki https:// nélkül írja be a címet, titkosítatlan kapcsolaton marad.`,
          fr: `${httpUrl} répond sans rediriger vers HTTPS : un visiteur qui saisit l'adresse sans https:// reste sans chiffrement.`,
          it: `${httpUrl} risponde senza reindirizzare a HTTPS, quindi un visitatore che digita l'indirizzo senza https:// resta senza crittografia.`,
          es: `${httpUrl} responde sin redirigir a HTTPS, así que un visitante que escribe la dirección sin https:// se queda sin cifrado.`,
          pl: `${httpUrl} odpowiada bez przekierowania na HTTPS, więc odwiedzający, który wpisze adres bez https://, pozostaje bez szyfrowania.`,
        },
        {
          en: 'Redirect every http:// request to the same address on https:// with a 301.',
          de: 'Jede http://-Anfrage mit 301 auf dieselbe Adresse unter https:// umleiten.',
          hu: 'Minden http:// kérést 301-es átirányítással küldjön tovább ugyanarra a https:// címre.',
          fr: 'Redirigez chaque requête http:// vers la même adresse en https:// avec un code 301.',
          it: 'Reindirizza ogni richiesta http:// allo stesso indirizzo su https:// con un 301.',
          es: 'Redirige cada solicitud http:// a la misma dirección en https:// con un 301.',
          pl: 'Przekieruj każde żądanie http:// na ten sam adres w https:// kodem 301.',
        },
        httpUrl,
      );
    }
    if (transport.hsts === false) {
      return finding(
        'info',
        {
          en: 'The site sends no Strict-Transport-Security header, so browsers may try plain HTTP first on later visits.',
          de: 'Die Seite sendet keinen Strict-Transport-Security-Header; Browser versuchen bei späteren Besuchen womöglich zuerst unverschlüsseltes HTTP.',
          hu: 'Az oldal nem küld Strict-Transport-Security fejlécet, így a böngészők a későbbi látogatásoknál először titkosítatlan HTTP-vel próbálkozhatnak.',
          fr: "Le site n'envoie pas d'en-tête Strict-Transport-Security, les navigateurs peuvent donc essayer d'abord le HTTP simple lors des visites suivantes.",
          it: "Il sito non invia l'intestazione Strict-Transport-Security, quindi nelle visite successive i browser potrebbero provare prima HTTP semplice.",
          es: 'El sitio no envía la cabecera Strict-Transport-Security, así que en visitas posteriores los navegadores pueden intentar primero HTTP sin cifrar.',
          pl: 'Witryna nie wysyła nagłówka Strict-Transport-Security, więc przy kolejnych wizytach przeglądarki mogą najpierw próbować zwykłego HTTP.',
        },
        {
          en: 'Send "Strict-Transport-Security: max-age=31536000" once HTTPS works everywhere on the domain.',
          de: '„Strict-Transport-Security: max-age=31536000“ senden, sobald HTTPS überall auf der Domain funktioniert.',
          hu: 'Küldje a „Strict-Transport-Security: max-age=31536000” fejlécet, amint a HTTPS a domain minden részén működik.',
          fr: 'Envoyez « Strict-Transport-Security: max-age=31536000 » dès que HTTPS fonctionne partout sur le domaine.',
          it: 'Invia «Strict-Transport-Security: max-age=31536000» quando HTTPS funziona ovunque sul dominio.',
          es: 'Envía «Strict-Transport-Security: max-age=31536000» cuando HTTPS funcione en todo el dominio.',
          pl: 'Wysyłaj „Strict-Transport-Security: max-age=31536000”, gdy HTTPS działa w całej domenie.',
        },
        page.finalUrl,
      );
    }
    return [];
  },
};
