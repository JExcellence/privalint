import { say } from '../i18n.js';
import type { Finding, Rule } from '../types.js';

const ID = 'mixed-content';

const isHttp = (url: string) => /^http:/i.test(url);

export const mixedContent: Rule = {
  id: ID,
  title: 'An HTTPS page sends form data or loads resources over HTTP',
  description:
    'A form on an HTTPS page that submits to an http:// address sends what visitors type ' +
    'unencrypted. Scripts, images and frames loaded over http:// are blocked or upgraded by ' +
    'browsers, but show that the page was not fully moved to HTTPS.',
  references: ['Art. 32 GDPR'],
  check({ page, lang }) {
    if (!/^https:/i.test(page.finalUrl)) return [];
    const findings: Finding[] = [];

    const actions = [...new Set((page.forms ?? []).flatMap((form) => form.httpAction ?? []))];
    if (actions.length > 0) {
      findings.push({
        ruleId: ID,
        severity: 'error',
        subject: 'form-action',
        message: say(lang, {
          en: `${actions.length} form(s) collecting personal data submit over unencrypted HTTP.`,
          de: `${actions.length} Formular(e), die personenbezogene Daten erheben, senden unverschlüsselt über HTTP.`,
          hu: `${actions.length} személyes adatokat gyűjtő űrlap titkosítatlan HTTP-n keresztül küld adatot.`,
        }),
        pageUrl: page.finalUrl,
        evidence: actions
          .slice(0, 3)
          .map((action) =>
            say(lang, {
              en: `submits to ${action}`,
              de: `sendet an ${action}`,
              hu: `küldés ide: ${action}`,
            }),
          ),
        fix: say(lang, {
          en: 'Point the form action (and any formaction on its buttons) to an https:// address.',
          de: 'Das Formularziel (und formaction an den Schaltflächen) auf eine https://-Adresse setzen.',
          hu: 'Állítsa az űrlap célját (és a gombok formaction értékét) https:// címre.',
        }),
      });
    }

    const resources = [
      ...new Set([
        ...(page.insecureResources ?? []),
        ...page.requests.map((request) => request.url).filter(isHttp),
      ]),
    ];
    if (resources.length > 0) {
      findings.push({
        ruleId: ID,
        severity: 'info',
        subject: 'resources',
        message: say(lang, {
          en: `The HTTPS page references ${resources.length} resource(s) over HTTP.`,
          de: `Die HTTPS-Seite bindet ${resources.length} Ressource(n) über HTTP ein.`,
          hu: `A HTTPS-oldal ${resources.length} erőforrást HTTP-n keresztül hivatkoz.`,
        }),
        pageUrl: page.finalUrl,
        evidence: resources.slice(0, 3),
        fix: say(lang, {
          en: 'Load these resources over https://, or from your own server.',
          de: 'Diese Ressourcen über https:// oder vom eigenen Server laden.',
          hu: 'Töltse be ezeket az erőforrásokat https://-en keresztül vagy a saját szerveréről.',
        }),
      });
    }
    return findings;
  },
};
