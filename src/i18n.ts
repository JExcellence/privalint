export const LANGS = ['en', 'de', 'hu'] as const;
export type Lang = (typeof LANGS)[number];

/** One string per language. Adding a language makes every missing translation a type error. */
export type Text = Record<Lang, string>;

export const say = (lang: Lang, text: Text): string => text[lang];

/**
 * The Hungarian definite article for a word or name: "az" before a vowel sound, "a" otherwise
 * ("az Adobe Fonts", "a YouTube"). Opening quotes are skipped.
 */
export function huArticle(word: string, capital = false): string {
  const article = /^[„"'(]?[aáeéiíoóöőuúüű]/i.test(word) ? 'az' : 'a';
  return capital ? `A${article.slice(1)}` : article;
}
