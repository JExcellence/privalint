import { type Lang, say } from './i18n.js';

/**
 * The consent state a Google tag sends with each request in Google Consent Mode, read from the
 * `gcs` parameter. Google documents that `gcs` carries `ad_storage` and `analytics_storage`
 * (developers.google.com/tag-platform/security/concepts/consent-mode, "Consent mode HTTP
 * parameters") but not the encoding. The order below was checked with Google's gtag.js on
 * 2026-11-17: defaults of denied/denied, denied/granted, granted/denied and granted/granted for
 * ad_storage/analytics_storage sent G100, G101, G110 and G111. A default of denied that the page
 * then updated to granted sent G111.
 */
export interface ConsentModeState {
  /** The raw value, such as "G100". */
  gcs: string;
  /** Undefined when the tag sent "-": the type was not set. */
  adStorage?: boolean;
  analyticsStorage?: boolean;
}

const GCS = /^G1([01-])([01-])$/;

const flag = (digit: string | undefined): boolean | undefined =>
  digit === '1' ? true : digit === '0' ? false : undefined;

/** The Consent Mode state of a request, or undefined when it carries none. */
export function readConsentMode(url: string): ConsentModeState | undefined {
  let gcs: string | null;
  try {
    gcs = new URL(url).searchParams.get('gcs');
  } catch {
    return undefined;
  }
  const match = gcs === null ? null : GCS.exec(gcs);
  if (gcs === null || match === null) return undefined;
  const adStorage = flag(match[1]);
  const analyticsStorage = flag(match[2]);
  return {
    gcs,
    ...(adStorage === undefined ? {} : { adStorage }),
    ...(analyticsStorage === undefined ? {} : { analyticsStorage }),
  };
}

/** Whether a state tells Google that the visitor allowed advertising or analytics storage. */
export const grantsStorage = (state: ConsentModeState): boolean =>
  state.adStorage === true || state.analyticsStorage === true;

/** "Consent Mode: ad_storage denied, analytics_storage granted (gcs=G101)". */
export function describeConsentMode(state: ConsentModeState, lang: Lang): string {
  const word = (value: boolean | undefined) =>
    value === undefined
      ? say(lang, {
          en: 'not set',
          de: 'nicht gesetzt',
          hu: 'nincs beállítva',
          fr: 'non défini',
          it: 'non impostato',
          es: 'no establecido',
          pl: 'nie ustawiono',
        })
      : value
        ? say(lang, {
            en: 'granted',
            de: 'erlaubt',
            hu: 'engedélyezve',
            fr: 'accordé',
            it: 'concesso',
            es: 'concedido',
            pl: 'przyznano',
          })
        : say(lang, {
            en: 'denied',
            de: 'abgelehnt',
            hu: 'elutasítva',
            fr: 'refusé',
            it: 'negato',
            es: 'denegado',
            pl: 'odmówiono',
          });
  return `Consent Mode: ad_storage ${word(state.adStorage)}, analytics_storage ${word(state.analyticsStorage)} (gcs=${state.gcs})`;
}
