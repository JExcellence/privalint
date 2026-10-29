# impressum-link

[English](impressum-link.md)

Warnt, wenn eine Seite nicht auf ein Impressum verlinkt.

## Was geprüft wird

Jeder Link auf der Seite wird anhand von Text, `aria-label`, `title` und URL mit gängigen
Bezeichnungen für ein Impressum abgeglichen: Impressum, Imprint, Legal notice, Site notice,
Anbieterkennzeichnung, Mentions légales, Aviso legal, Note legali, Colofon und Informacje prawne.

Die Regel läuft auf jeder gecrawlten Seite, weil das Impressum von jeder Seite aus erreichbar sein
muss.

| Situation                                              | Schweregrad |
| ------------------------------------------------------ | ----------- |
| Ein Link mit einer der oben genannten Bezeichnungen    | bestanden   |
| Kein solcher Link, aber ein Link „Kontakt“ / „Contact“ | `info`      |
| Keines von beidem                                      | `warning`   |

privalint folgt dem Kontaktlink nicht und kann daher nicht feststellen, ob das Impressum von dort
aus verlinkt ist.

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

Fügen Sie einen Link „Impressum“ in einen Bereich Ihres Layouts ein, der auf jeder Seite
erscheint.
