import { huArticle, plPlural, say } from '../i18n.js';
import { observedRequests } from '../observations.js';
import type { Rule } from '../types.js';
import { isFirstParty } from '../url.js';

const ID = 'referrer-policy';

const POLICIES = new Set([
  'no-referrer',
  'no-referrer-when-downgrade',
  'same-origin',
  'origin',
  'strict-origin',
  'origin-when-cross-origin',
  'strict-origin-when-cross-origin',
  'unsafe-url',
]);

/** Older meta tag values browsers still accept. */
const LEGACY_META: Record<string, string> = {
  never: 'no-referrer',
  always: 'unsafe-url',
  default: 'strict-origin-when-cross-origin',
  'origin-when-crossorigin': 'origin-when-cross-origin',
};

/** Policies that send the full page address, path and query included, to other sites. */
const FULL_URL_CROSS_ORIGIN = new Set(['unsafe-url', 'no-referrer-when-downgrade']);

/** The last policy a browser understands in a comma-separated header value. */
function fromHeader(value: string | undefined): string | undefined {
  return (value ?? '')
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter((token) => POLICIES.has(token))
    .at(-1);
}

function fromMeta(value: string | undefined): string | undefined {
  const token = value?.trim().toLowerCase();
  if (token === undefined) return undefined;
  return POLICIES.has(token) ? token : LEGACY_META[token];
}

export const referrerPolicy: Rule = {
  id: ID,
  title: 'The referrer policy sends full page addresses to other sites',
  description:
    'With the referrer policy unsafe-url or no-referrer-when-downgrade, every request to another ' +
    'site carries the full page address, including paths and query strings that can hold search ' +
    'terms, order numbers or tokens. Browsers send only the origin by default.',
  references: ['Art. 25 GDPR'],
  check({ page, siteUrl, lang }) {
    const header = fromHeader(page.referrerPolicy?.header);
    const meta = fromMeta(page.referrerPolicy?.meta);
    // A meta tag the browser understands replaces the header's policy for the document.
    const policy = meta ?? header;
    if (policy === undefined || !FULL_URL_CROSS_ORIGIN.has(policy)) return [];
    const hosts = [
      ...new Set(
        observedRequests(page.requests)
          .filter((request) => /^https?:/i.test(request.url))
          .filter((request) => !isFirstParty(request.url, siteUrl))
          .map((request) => new URL(request.url).hostname),
      ),
    ];
    if (hosts.length === 0) return [];
    const source = meta === undefined ? 'Referrer-Policy header' : '<meta name="referrer">';
    return [
      {
        ruleId: ID,
        severity: 'info',
        message: say(lang, {
          en: `The referrer policy ${policy} sends the full page address to ${hosts.length} other host(s).`,
          de: `Die Referrer-Policy ${policy} schickt die vollständige Seitenadresse an ${hosts.length} fremde(n) Host(s).`,
          hu: `${huArticle(policy, true)} ${policy} hivatkozó-szabály a teljes oldalcímet elküldi ${hosts.length} külső kiszolgálónak.`,
          fr: `La politique de référent ${policy} envoie l'adresse complète de la page à ${hosts.length} ${hosts.length <= 1 ? 'autre hôte' : 'autres hôtes'}.`,
          it: `La referrer policy ${policy} invia l'indirizzo completo della pagina a ${hosts.length} ${hosts.length === 1 ? 'altro host' : 'altri host'}.`,
          es: `La política de referente ${policy} envía la dirección completa de la página a ${hosts.length} ${hosts.length === 1 ? 'otro host' : 'otros hosts'}.`,
          pl: `Polityka referrer ${policy} wysyła pełny adres strony do ${hosts.length} ${plPlural(hosts.length, 'innego hosta', 'innych hostów', 'innych hostów')}.`,
        }),
        pageUrl: page.finalUrl,
        evidence: [`${source}: ${policy}`, ...hosts.slice(0, 3)],
        fix: say(lang, {
          en: 'Set Referrer-Policy: strict-origin-when-cross-origin (the browser default) or stricter, and remove unsafe-url or no-referrer-when-downgrade from headers and meta tags.',
          de: 'Referrer-Policy: strict-origin-when-cross-origin (Browser-Standard) oder strenger setzen und unsafe-url bzw. no-referrer-when-downgrade aus Header und Meta-Tag entfernen.',
          hu: 'Állítsa be a Referrer-Policy: strict-origin-when-cross-origin (böngésző-alapértelmezés) vagy szigorúbb értéket, és távolítsa el az unsafe-url, illetve no-referrer-when-downgrade értéket a fejlécből és a meta címkéből.',
          fr: 'Définissez Referrer-Policy: strict-origin-when-cross-origin (la valeur par défaut des navigateurs) ou plus strict, et retirez unsafe-url ou no-referrer-when-downgrade des en-têtes et des balises meta.',
          it: 'Imposta Referrer-Policy: strict-origin-when-cross-origin (il valore predefinito del browser) o una più restrittiva, e rimuovi unsafe-url o no-referrer-when-downgrade da intestazioni e meta tag.',
          es: 'Fija Referrer-Policy: strict-origin-when-cross-origin (el valor predeterminado del navegador) o una más estricta, y elimina unsafe-url o no-referrer-when-downgrade de las cabeceras y las etiquetas meta.',
          pl: 'Ustaw Referrer-Policy: strict-origin-when-cross-origin (domyślne ustawienie przeglądarki) lub bardziej restrykcyjne i usuń unsafe-url lub no-referrer-when-downgrade z nagłówków i znaczników meta.',
        }),
      },
    ];
  },
};
