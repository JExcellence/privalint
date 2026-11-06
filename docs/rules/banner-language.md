# banner-language

[Deutsch](banner-language.de.md)

Notes a consent banner in a different language than the page it is shown on.

## What it checks

On the start page (and the first page of each other host), privalint reads the visible text of
the consent banner and guesses its language from common words of German, English, Hungarian,
French, Italian, Spanish, Polish and Dutch. When the page's `<html lang>` names another language,
that is `info`, with both languages as evidence.

There is no finding when:

- the page has no `lang` attribute,
- the banner text is too short or too mixed to tell its language (fewer than three known words, or
  no language with twice the hits of the next),
- the banner is in the language of the browser locale (`--locale`, default `de-DE`). Many consent
  managers follow the browser's language, so a visitor from the page's country would see their
  own. Scan with a matching `--locale`, such as `--locale hu-HU`, to check that case.

The banner text is only used for this check and never written to a report.

## Why

Consent has to be informed (Art. 4(11) GDPR), and a request for consent has to be in clear and
plain language (Art. 7(2) GDPR). A banner the visitor can't read asks for a choice they can't make
knowingly.

- Art. 4 Nr. 11, Art. 7 Abs. 2 DSGVO (Germany, Austria)
- Art. 6 Abs. 6 DSG (Switzerland)
- GDPR 4. cikk 11. pont, 7. cikk (2) bekezdés (Hungary)

## How to fix

Show the banner in the language of the page. Most consent managers can set the language per page
or follow `<html lang>`.

## Limits

- Only eight languages are recognised.
- A multilingual banner (two languages side by side) may be left undetermined.
