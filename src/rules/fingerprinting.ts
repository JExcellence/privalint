import { findEmbed } from '../data/third-parties.js';
import { huArticle, say } from '../i18n.js';
import type { Finding, FingerprintRead, Rule } from '../types.js';
import { isFirstParty } from '../url.js';

const ID = 'fingerprinting';

/** Security widgets read device signals to tell people from bots; noted, not warned about. */
const SECURITY_WIDGETS = new Set(['Google reCAPTCHA', 'hCaptcha', 'Cloudflare Turnstile']);

const API_NAMES: Record<string, string> = {
  canvas: 'canvas readback',
  webgl: 'WebGL renderer',
  audio: 'audio rendering',
};

export const fingerprinting: Rule = {
  id: ID,
  title: 'A third-party script fingerprints the browser before consent',
  description:
    'Reading back a canvas, the unmasked WebGL renderer or an offline audio rendering are the ' +
    'usual signals of browser fingerprinting, which needs consent like a cookie. privalint ' +
    'records third-party scripts that call these APIs before the visitor has chosen.',
  references: ['Art. 5(3) ePrivacy Directive', 'EDPB Guidelines 2/2023'],
  check({ page, siteUrl, lang }) {
    const byScript = new Map<string, Set<string>>();
    for (const read of page.fingerprinting ?? []) {
      if (!/^https?:/i.test(read.script) || isFirstParty(read.script, siteUrl)) continue;
      byScript.set(read.script, (byScript.get(read.script) ?? new Set()).add(read.api));
    }
    return [...byScript].map(([script, apis]): Finding => {
      const host = new URL(script).hostname;
      const widget = findEmbed(script)?.vendor;
      const security = widget !== undefined && SECURITY_WIDGETS.has(widget);
      return {
        ruleId: ID,
        severity: security ? 'info' : 'warning',
        subject: host,
        message: security
          ? say(lang, {
              en: `${widget} reads browser signals (${[...apis].join(', ')}) before consent, as security widgets do.`,
              de: `${widget} liest vor der Einwilligung Browsermerkmale (${[...apis].join(', ')}), wie es Sicherheits-Widgets tun.`,
              hu: `${huArticle(widget ?? '', true)} ${widget} hozzájárulás előtt böngészőjellemzőket olvas (${[...apis].join(', ')}), ahogy a biztonsági widgetek.`,
            })
          : say(lang, {
              en: `A script from ${host} reads browser fingerprinting signals (${[...apis].join(', ')}) before consent.`,
              de: `Ein Skript von ${host} liest vor der Einwilligung Fingerprinting-Merkmale des Browsers (${[...apis].join(', ')}).`,
              hu: `Egy ${host} kiszolgálóról származó szkript hozzájárulás előtt ujjlenyomat-jellemzőket olvas a böngészőből (${[...apis].join(', ')}).`,
            }),
        pageUrl: page.finalUrl,
        evidence: [script, ...[...apis].map((api) => API_NAMES[api] ?? api)],
        fix: say(lang, {
          en: security
            ? `Check that ${widget} is needed on this page, and load it only on the form it protects.`
            : `Load the script from ${host} only after consent, like other trackers, or remove it.`,
          de: security
            ? `Prüfen, ob ${widget} auf dieser Seite nötig ist, und es nur am geschützten Formular laden.`
            : `Das Skript von ${host} wie andere Tracker erst nach der Einwilligung laden oder entfernen.`,
          hu: security
            ? `Ellenőrizze, hogy szükség van-e itt ${huArticle(widget ?? '')} ${widget} widgetre, és csak a védett űrlapnál töltse be.`
            : `${huArticle(host, true)} ${host} szkriptjét a többi követőhöz hasonlóan csak hozzájárulás után töltse be, vagy távolítsa el.`,
        }),
      };
    });
  },
};
