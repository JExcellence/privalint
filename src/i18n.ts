export const LANGS = ['en', 'de'] as const;
export type Lang = (typeof LANGS)[number];

/** One string per language. Adding a language makes every missing translation a type error. */
export type Text = Record<Lang, string>;

export const say = (lang: Lang, text: Text): string => text[lang];
