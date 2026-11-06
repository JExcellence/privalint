import { say } from '../i18n.js';
import { guessLanguage } from '../language.js';
import type { Rule } from '../types.js';

const ID = 'banner-language';

export const bannerLanguage: Rule = {
  id: ID,
  title: 'The consent banner is in a different language than the page',
  description:
    'Consent has to be informed. A banner in another language than the page, such as an ' +
    'English banner on a Hungarian site, makes the choice harder to understand. privalint ' +
    "compares the page's <html lang> with the language of the banner text.",
  references: ['Art. 4(11) GDPR', 'Art. 7(2) GDPR'],
  check({ page, lang }) {
    const pageLanguage = page.language;
    const text = page.consent?.bannerText;
    if (pageLanguage === undefined || text === undefined) return [];
    const banner = guessLanguage(text);
    if (banner === undefined || banner === pageLanguage) return [];
    // Many consent managers follow the browser's language; a visitor from the page's country would
    // see the banner in theirs. Scan with a matching --locale to check that case.
    if (banner === page.browserLanguage) return [];
    return [
      {
        ruleId: ID,
        severity: 'info',
        message: say(lang, {
          en: `The page is in "${pageLanguage}", but its consent banner is in "${banner}".`,
          de: `Die Seite ist auf „${pageLanguage}“, ihr Consent-Banner aber auf „${banner}“.`,
          hu: `Az oldal nyelve „${pageLanguage}”, a hozzájárulási banneré viszont „${banner}”.`,
        }),
        pageUrl: page.finalUrl,
        evidence: [`<html lang="${pageLanguage}">`, `banner: ${banner}`],
        fix: say(lang, {
          en: 'Show the banner in the language of the page. Most consent managers can set the language per page or follow <html lang>.',
          de: 'Das Banner in der Sprache der Seite anzeigen. Die meisten Consent-Manager können die Sprache je Seite setzen oder <html lang> folgen.',
          hu: 'Jelenítse meg a bannert az oldal nyelvén. A legtöbb hozzájárulás-kezelő oldalanként beállítható, vagy követi a <html lang> értékét.',
        }),
      },
    ];
  },
};
