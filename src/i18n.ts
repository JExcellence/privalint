export const LANGS = ['en', 'de', 'hu'] as const;
export type Lang = (typeof LANGS)[number];

/** One string per language. Adding a language makes every missing translation a type error. */
export type Text = Record<Lang, string>;

export const say = (lang: Lang, text: Text): string => text[lang];

/**
 * The Hungarian definite article for a word or name: "az" before a vowel sound, "a" otherwise
 * ("az Adobe Fonts", "a YouTube"). Opening quotes are skipped. Abbreviations are read letter by
 * letter, so the name of the first letter counts ("az SE", "az X", "a Kft."), and numbers by
 * how they are said ("az 1", "az 5", "a 10"). English pronunciation is not guessed.
 */
export function huArticle(word: string, capital = false): string {
  const start = word.replace(/^[„"'(]+/, '');
  const abbreviation = /^\p{Lu}(?:[\p{Lu}\d]|[^\p{L}]|$)/u.test(start);
  const vowelSound = abbreviation
    ? /^[AEFILMNORSUXYÁÉÍÓÖŐÚÜŰ]/.test(start)
    : /^\d/.test(start)
      ? /^(?:5|1(?:\d{3})*(?!\d))/.test(start)
      : /^[aáeéiíoóöőuúüű]/i.test(start);
  const article = vowelSound ? 'az' : 'a';
  return capital ? `A${article.slice(1)}` : article;
}
