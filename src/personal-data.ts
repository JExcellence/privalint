/**
 * E-mail addresses and phone numbers in URL query strings, plain or hashed. Pixels with "advanced
 * matching", analytics setups and search pages put them into requests to other sites. Only the
 * parameter names are ever reported; values are redacted.
 */

export type PersonalDataKind = 'email' | 'phone';

export interface PersonalParameter {
  name: string;
  kind: PersonalDataKind;
  hashed: boolean;
}

const EMAIL = /^[^\s@/?#]{1,64}@[^\s@/?#]+\.[a-z]{2,}$/i;
const SHA256 = /^[a-f0-9]{64}$/i;
const PHONE_VALUE = /^\+?[\d\s()./-]{7,20}$/;

/** Parameter names that carry an e-mail address or phone number, also as a SHA-256 hash. */
const EMAIL_NAMES =
  /^(?:em|ud\[em\]|e-?mail|email_?address|user_?email|sha256_email_address|hashed_email|mail)$/i;
const PHONE_NAMES =
  /^(?:ph|ud\[ph\]|phone|phone_?number|tel|telephone|mobile|user_?phone|sha256_phone_number|hashed_phone)$/i;

const PLACEHOLDER = '[redacted]';

/** The query parameters of `url` that carry an e-mail address or a phone number. */
export function personalParameters(url: string): PersonalParameter[] {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return [];
  }
  const found: PersonalParameter[] = [];
  for (const [name, raw] of parsed.searchParams) {
    const value = raw.trim();
    if (value === '') continue;
    if (EMAIL.test(value)) found.push({ name, kind: 'email', hashed: false });
    else if (EMAIL_NAMES.test(name) && SHA256.test(value)) {
      found.push({ name, kind: 'email', hashed: true });
    } else if (PHONE_NAMES.test(name)) {
      if (SHA256.test(value)) found.push({ name, kind: 'phone', hashed: true });
      else if (PHONE_VALUE.test(value) && value.replace(/\D/g, '').length >= 7) {
        found.push({ name, kind: 'phone', hashed: false });
      }
    }
  }
  return found;
}

/** `url` with the values of its personal data parameters replaced by "[redacted]". */
export function redactPersonalData(url: string): string {
  const personal = personalParameters(url);
  if (personal.length === 0) return url;
  const parsed = new URL(url);
  const names = new Set(personal.map((parameter) => parameter.name));
  const kept = [...parsed.searchParams].map(
    ([name, value]) =>
      `${encodeURIComponent(name)}=${names.has(name) ? PLACEHOLDER : encodeURIComponent(value)}`,
  );
  parsed.search = '';
  return `${parsed.toString()}?${kept.join('&')}`;
}

const URL_IN_TEXT = /https?:\/\/[^\s<>"']+/gi;

/** Every URL in `text` with its personal data parameters redacted. */
export function redactPersonalDataInText(text: string): string {
  return text.replace(URL_IN_TEXT, (url) => redactPersonalData(url));
}
