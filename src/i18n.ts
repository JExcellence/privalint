export const LANGS = ['en', 'de', 'hu', 'fr', 'it', 'es', 'pl'] as const;
export type Lang = (typeof LANGS)[number];

/** One string per language. Adding a language makes every missing translation a type error. */
export type Text = Record<Lang, string>;

export const say = (lang: Lang, text: Text): string =>
  lang === 'fr' ? frenchSpacing(text.fr) : text[lang];

const NBSP = String.fromCodePoint(0x00a0);
const NARROW_NBSP = String.fromCodePoint(0x202f);

/**
 * French typography: a no-break space before ":" and inside « », a narrow no-break space before
 * ";", "!" and "?", so a line never breaks before the sign. The strings are written with plain
 * spaces; only a space already there is replaced, so "https://" and "Sec-GPC: 1" stay as they are.
 * Text quoted from the page in « » keeps its own spaces; guillemets inside a quotation become the
 * French inner quotes “ ”, so a label that has its own guillemets is not quoted twice. A « or »
 * without its partner is ordinary text.
 */
export function frenchSpacing(text: string): string {
  const partner = matchGuillemets(text);
  let out = '';
  let depth = 0;
  for (let index = 0; index < text.length; index++) {
    const char = text[index] as string;
    const next = text[index + 1];
    if (partner.has(index) && char === '«') {
      depth++;
      if (depth > 1) {
        out += '“';
      } else {
        out += '«';
        if (next === ' ') {
          out += NBSP;
          index++;
        }
      }
    } else if (partner.has(index) && char === '»') {
      depth--;
      if (depth > 0) {
        out += '”';
      } else {
        if (out.endsWith(' ')) out = out.slice(0, -1) + NBSP;
        out += '»';
      }
    } else if (depth === 0 && char === ' ' && next !== undefined && ':;!?'.includes(next)) {
      out += next === ':' ? NBSP : NARROW_NBSP;
    } else {
      out += char;
    }
  }
  return out;
}

/** The positions of the « and » that close each other; a lone one is left out. */
function matchGuillemets(text: string): Set<number> {
  const paired = new Set<number>();
  const open: number[] = [];
  for (let index = 0; index < text.length; index++) {
    if (text[index] === '«') open.push(index);
    else if (text[index] === '»' && open.length > 0) {
      paired.add(open.pop() as number);
      paired.add(index);
    }
  }
  return paired;
}

const LOCALES: Record<Lang, string> = {
  en: 'en-US',
  de: 'de-DE',
  hu: 'hu-HU',
  fr: 'fr-FR',
  it: 'it-IT',
  es: 'es-ES',
  pl: 'pl-PL',
};

/**
 * A number as the language writes it: "2.5" and "125,000" in English, "2,5" and "125.000" in
 * German. With fractionDigits the number always has that many decimals ("1,0 s"); without, it keeps
 * up to two.
 */
export const decimal = (value: number, lang: Lang, fractionDigits?: number): string =>
  new Intl.NumberFormat(LOCALES[lang], {
    minimumFractionDigits: fractionDigits ?? 0,
    maximumFractionDigits: fractionDigits ?? 2,
  }).format(value);

/**
 * The Polish plural form for a count: "1 link", "2 linki", "5 linków", "22 linki", "12 linków".
 * Few is used for counts ending in 2 to 4, except 12 to 14; many for everything else above 1.
 */
export function plPlural(count: number, one: string, few: string, many: string): string {
  if (count === 1) return one;
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  return lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14) ? few : many;
}

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
