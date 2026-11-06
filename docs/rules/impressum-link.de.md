# impressum-link

[English](impressum-link.md)

Warnt, wenn eine Seite nicht auf ein Impressum verlinkt.

## Was geprüft wird

Jeder Link auf der Seite wird anhand von Text, `aria-label`, `title` und URL mit gängigen
Bezeichnungen für ein Impressum abgeglichen: Impressum, Imprint, Legal notice, Site notice,
Anbieterkennzeichnung, Mentions légales, Aviso legal, Note legali, Colofon, Informacje prawne und
Impresszum.

Die Regel läuft auf jeder gecrawlten Seite, weil das Impressum von jeder Seite aus erreichbar sein
muss.

| Situation                                                                                    | Schweregrad |
| -------------------------------------------------------------------------------------------- | ----------- |
| Ein Link mit einer der oben genannten Bezeichnungen                                          | bestanden   |
| Kein solcher Link, aber „Rechtliche Hinweise“, „Rechtliches“, „Legal“ oder „Jogi tudnivalók“ | `info`      |
| Kein solcher Link, aber ein Link zur Kontaktseite                                            | `info`      |
| Nichts davon                                                                                 | `warning`   |

Ein unklarer Rechts-Link wird nur notiert: Die Seite dahinter kann die Anbieterangaben enthalten
oder nur einen Haftungsausschluss, das verrät die Beschriftung nicht. Prüfen oder den Link
„Impressum“ nennen.

Als Kontaktseite gilt ein Link mit der Beschriftung „Kontakt“, „Contact“ oder „Kapcsolat“ oder einer
auf `/kontakt`, `/contact`, `/contact-us` oder `/kapcsolat` direkt unter der Domain oder unter
einem Sprachpräfix wie `/en/`. Eine tiefere Seite wie `/blocks/contact` (eine Doku-Seite über ein
Kontaktformular) zählt nicht. privalint folgt dem Kontaktlink nicht und kann daher nicht
feststellen, ob das Impressum von dort aus verlinkt ist.

Die Lösung nennt die Beschriftung in der Sprache, die die Seite in `<html lang>` angibt:
„Impressum“ auf einer deutschen Seite, „Legal notice“ auf einer englischen, „Impresszum“ auf einer
ungarischen. Ohne Angabe gilt die Sprache der Region. Das Zwei-Klick-Urteil unten wird nur bei
`--region de` zitiert.

## Warum

Anbieter geschäftsmäßiger digitaler Dienste in Deutschland müssen bestimmte Informationen leicht
erkennbar, unmittelbar erreichbar und ständig verfügbar halten. In der Praxis heißt das: ein Link,
meist im Footer, auf jeder Seite. Der BGH hat ein Impressum akzeptiert, das mit zwei Klicks über
die Links „Kontakt“ und dann „Impressum“ erreichbar war. Deshalb wird ein Kontaktlink allein nur
als Hinweis gemeldet.

- § 5 DDG (früher § 5 TMG)
- BGH, 20.07.2006, Az. I ZR 228/03

## Wann deaktivieren

Rein private Websites und Websites, die nicht deutschem Recht unterliegen, brauchen
möglicherweise kein Impressum. Schalten Sie die Regel mit `--disable impressum-link` ab, in der
Action mit `disable: impressum-link`.

## Lösung

Fügen Sie einen Link „Impressum“ (auf einer englischen Website „Legal notice“) in einen Bereich
Ihres Layouts ein, der auf jeder Seite erscheint.
