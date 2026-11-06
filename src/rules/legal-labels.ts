import type { Region } from '../legal.js';

export interface LegalLabels {
  /** How a link to the provider information is usually labelled. */
  notice: string;
  /** How a link to the privacy policy is usually labelled. */
  privacy: string;
}

/** Labels by the language the page is written in, from `<html lang>`. */
const BY_LANGUAGE: Record<string, LegalLabels> = {
  de: { notice: 'Impressum', privacy: 'Datenschutzerklärung' },
  en: { notice: 'Legal notice', privacy: 'Privacy policy' },
  hu: { notice: 'Impresszum', privacy: 'Adatkezelési tájékoztató' },
  fr: { notice: 'Mentions légales', privacy: 'Politique de confidentialité' },
  es: { notice: 'Aviso legal', privacy: 'Política de privacidad' },
  it: { notice: 'Note legali', privacy: 'Informativa sulla privacy' },
  nl: { notice: 'Colofon', privacy: 'Privacybeleid' },
  pl: { notice: 'Informacje prawne', privacy: 'Polityka prywatności' },
};

/** When the page doesn't declare a language privalint knows, the region's usual one. */
const BY_REGION: Record<Region, string> = { de: 'de', at: 'de', ch: 'de', hu: 'hu', eu: 'en' };

/**
 * The labels a fix should suggest: in the language the site is written in, so an English site in
 * Hungary is told to add a "Legal notice" link, not an "Impressum" or "Impresszum" one.
 */
export function legalLabels(language: string | undefined, region: Region): LegalLabels {
  return BY_LANGUAGE[language ?? ''] ?? (BY_LANGUAGE[BY_REGION[region]] as LegalLabels);
}
