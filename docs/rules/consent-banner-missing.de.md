# consent-banner-missing

[English](consent-banner-missing.md)

Warnt, wenn auf der Startseite Tracker laufen und privalint überhaupt kein Cookie-Banner gefunden
hat. Besucher können dann weder einwilligen noch ablehnen.

## Was geprüft wird

Auf der Startseite sucht privalint ein Cookie-Banner, über die Selektoren verbreiteter
Consent-Manager und über Beschriftungen, und wartet bis zu einer weiteren Settle-Zeit auf ein
Banner, das spät erscheint (siehe [Erkennung von Consent-Managern](../consent-managers.de.md)).
Erscheint keines und lief mindestens ein Dienst von der Tracker-Liste ohne jede Interaktion, meldet
diese Regel das einmal und nennt die Dienste.

| Situation                                                       | Schweregrad |
| --------------------------------------------------------------- | ----------- |
| Kein Banner, Analyse, Werbung oder Session-Replay läuft         | `warning`   |
| Kein Banner, nur ein Tag-Manager lädt                           | nichts      |
| Ein Banner wurde gefunden, oder die Prüfung schlug fehl/war aus | nichts      |
| `--region ch` (Opt-out-Modell)                                  | `info`      |

Jeder Tracker ist unter [`pre-consent-trackers`](pre-consent-trackers.de.md) bereits ein Fehler.
Diese Regel ist eine Warnung, damit dieselbe Ursache nicht doppelt zählt; sie sagt, warum die
Tracker keine Einwilligung haben.

## Warum

Tracker brauchen eine vorherige, aktive Einwilligung. Ohne Banner gibt es keinen Moment, in dem
Besucher einwilligen oder ablehnen können; jeder Besuch wird ohne Rechtsgrundlage erfasst.

- § 25 Abs. 1 TDDDG
- Art. 6 Abs. 1 lit. a DSGVO
- EuGH, 01.10.2019, C-673/17 (Planet49)

## Lösung

- Ein Consent-Tool einbinden, das diese Dienste bis zur Einwilligung blockiert, mit „Akzeptieren“
  und „Ablehnen“ auf der ersten Ebene.
- Wird keine Einwilligung gebraucht, die Dienste entfernen oder auf eine Einrichtung umstellen, die
  nichts auf dem Endgerät speichert oder ausliest.

## Fehlalarme

Ein Banner, das privalint nicht erkennt (ungewöhnliches Markup, geschlossener Shadow Root, erst nach
dem Scrollen sichtbar), sieht aus wie kein Banner. Der Nachweis nennt, wie lange privalint gesucht
hat. Bitte
[eröffnen Sie ein Issue](https://github.com/jexcellence/privalint/issues/new?template=false-positive.yml)
mit der URL.
