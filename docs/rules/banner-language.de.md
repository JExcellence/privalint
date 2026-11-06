# banner-language

[English](banner-language.md)

Weist auf ein Consent-Banner hin, das in einer anderen Sprache ist als die Seite, auf der es
erscheint.

## Was geprüft wird

Auf der Startseite (und der ersten Seite jedes weiteren Hosts) liest privalint den sichtbaren Text
des Consent-Banners und schätzt seine Sprache anhand häufiger Wörter aus Deutsch, Englisch,
Ungarisch, Französisch, Italienisch, Spanisch, Polnisch und Niederländisch. Nennt `<html lang>` der
Seite eine andere Sprache, ist das `info`, mit beiden Sprachen als Beleg.

Kein Befund entsteht, wenn:

- die Seite kein `lang`-Attribut hat,
- der Bannertext zu kurz oder zu gemischt ist, um die Sprache zu bestimmen (weniger als drei
  bekannte Wörter oder keine Sprache mit doppelt so vielen Treffern wie die nächste),
- das Banner in der Sprache des Browser-Locales ist (`--locale`, Standard `de-DE`). Viele
  Consent-Manager folgen der Browsersprache, ein Besucher aus dem Land der Seite sähe also seine.
  Mit passendem `--locale`, etwa `--locale hu-HU`, lässt sich dieser Fall prüfen.

Der Bannertext dient nur dieser Prüfung und wird nie in einen Bericht geschrieben.

## Warum

Eine Einwilligung muss informiert sein (Art. 4 Nr. 11 DSGVO), und das Ersuchen um Einwilligung muss
in klarer und einfacher Sprache erfolgen (Art. 7 Abs. 2 DSGVO). Ein Banner, das der Besucher nicht
lesen kann, verlangt eine Wahl, die er nicht bewusst treffen kann.

- Art. 4 Nr. 11, Art. 7 Abs. 2 DSGVO (Deutschland, Österreich)
- Art. 6 Abs. 6 DSG (Schweiz)
- GDPR 4. cikk 11. pont, 7. cikk (2) bekezdés (Ungarn)

## Wie beheben

Das Banner in der Sprache der Seite anzeigen. Die meisten Consent-Manager können die Sprache je
Seite setzen oder `<html lang>` folgen.

## Grenzen

- Nur acht Sprachen werden erkannt.
- Ein mehrsprachiges Banner (zwei Sprachen nebeneinander) bleibt unter Umständen unbestimmt.
