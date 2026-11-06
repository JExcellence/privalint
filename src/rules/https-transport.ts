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
        },
        {
          en: 'Serve the site over HTTPS (a free certificate from Let’s Encrypt is enough) and redirect http:// to it.',
          de: 'Die Seite über HTTPS ausliefern (ein kostenloses Zertifikat von Let’s Encrypt genügt) und http:// dorthin umleiten.',
          hu: 'Szolgálja ki az oldalt HTTPS-en (egy ingyenes Let’s Encrypt-tanúsítvány is elég), és irányítsa át rá a http:// címeket.',
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
        },
        {
          en: 'Redirect every http:// request to the same address on https:// with a 301.',
          de: 'Jede http://-Anfrage mit 301 auf dieselbe Adresse unter https:// umleiten.',
          hu: 'Minden http:// kérést 301-es átirányítással küldjön tovább ugyanarra a https:// címre.',
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
        },
        {
          en: 'Send "Strict-Transport-Security: max-age=31536000" once HTTPS works everywhere on the domain.',
          de: '„Strict-Transport-Security: max-age=31536000“ senden, sobald HTTPS überall auf der Domain funktioniert.',
          hu: 'Küldje a „Strict-Transport-Security: max-age=31536000” fejlécet, amint a HTTPS a domain minden részén működik.',
        },
        page.finalUrl,
      );
    }
    return [];
  },
};
