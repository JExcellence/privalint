/** Detects a postal address and an e-mail address in the text of a legal notice or a policy. */

/**
 * Postcode and place: five digits in Germany, four in Austria, Switzerland and Hungary, optionally
 * with a country prefix ("D-", "A-", "CH-", "H-"), and the Hungarian order "Budapest, 1061". Every
 * format counts in every region: a Hungarian site may well be run from Germany.
 */
const POSTCODE =
  /\b(?:[A-Z]{1,2}-?\s?)?\d{4,5}\s+\p{Lu}|\p{Lu}\p{Ll}+,?\s+\d{4}\b|\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b|\b[AC-FHKNPRTV-Y]\d[\dW]\s?[AC-FHKNPRTV-Y\d]{4}\b/u;
// The last two: UK postcodes ("SW1A 2AA") and Irish Eircodes ("D04 E5W5").

/** A street with a house number, such as "Musterstraße 12", "Váci út 1." or "12 Main Street". */
const STREET =
  /\p{L}[\p{L}.'-]*(?:straße|strasse|str\.|weg|gasse|platz|allee|ring|damm|ufer|utca|út|tér|körút|street|road|avenue|lane|rue|via)?\s+\d+\s?[a-z]?\b|\b\d+[a-z]?,?\s+\p{L}+\s+(?:street|road|avenue|lane|st\.|rd\.)/iu;

/**
 * Numbers that look like a postcode or a house number but aren't: phone and fax numbers, tax and
 * register numbers, a copyright year. Removed before looking for the address.
 */
const NOT_ADDRESS =
  /\b(?:tel(?:efon)?|fax|phone|mobil(?:e)?|ust-?id\w*|vat|steuer\w*|adószám|hr[ab]|cg|fn|iban|bic)\b\.?:?\s*[^\n,;]*|(?:©|\bcopyright\b)[^\n]*/giu;

/** "(at)" and "[dot]" spellings count; a dot needs a letter right after it, as in a domain. */
const EMAIL =
  /[\w.+-]+\s?(?:@|\(at\)|\[at\]|\{at\}|\s(?:at|kukac)\s)\s?[\w-]+(?:(?:\.(?=\w)|\s?\(dot\)\s?|\s?\[dot\]\s?|\s(?:dot|pont)\s)[\w-]+)+/i;

/**
 * A postcode with a street on the same line or the line right above it, as in an address block
 * ("Musterstraße 12" over "10115 Berlin"). A blank line, the end of a paragraph, ends the block, so
 * a number in one paragraph and a year in the next don't make an address.
 */
export function hasAddress(text: string): boolean {
  const lines = text.replace(NOT_ADDRESS, ' ').split('\n');
  return lines.some((line, index) => {
    if (!POSTCODE.test(line)) return false;
    const above = lines[index - 1] ?? '';
    return STREET.test(line) || (above.trim() !== '' && STREET.test(above));
  });
}

/** An e-mail address in the text, or a mailto: link on the page. */
export function hasEmail(text: string, mailto: boolean): boolean {
  return mailto || EMAIL.test(text);
}
