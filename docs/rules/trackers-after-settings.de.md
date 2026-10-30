# trackers-after-settings

[English](trackers-after-settings.md)

Meldet Tracker, die weiter laden oder neue Cookies setzen, nachdem in den Einstellungen des
Cookie-Banners alle optionalen Kategorien abgewählt und gespeichert wurden. Die Prüfung ist optional:
mit `--check-settings` oder `settingsCheck: true` in der Konfiguration einschalten.

## Was geprüft wird

[`trackers-after-reject`](trackers-after-reject.de.md) prüft die Ablehnen-Schaltfläche. Viele Seiten
scheitern am anderen Weg: Besucher öffnen „Einstellungen“, wählen alles ab, speichern, und die
Tracker laden trotzdem, etwa weil das Speichern am selben Code hängt wie „Alle akzeptieren“.

Ist die Prüfung eingeschaltet, lädt privalint die Startseite ein zweites Mal in einem frischen
Browser, damit die beim Ablehnen gespeicherte Wahl das Banner nicht verbirgt. Dann

1. öffnet privalint die Einstellungsebene: per Selektor bei Cookiebot, OneTrust, Usercentrics,
   Complianz, CookieYes und CookieConsent, sonst über die Beschriftung („Einstellungen“,
   „Anpassen“, „Mehr Optionen“, …). Gewählt wird das Element, das am nächsten an der
   Zustimmen-Schaltfläche liegt, damit ein Link im Footer nicht zählt,
2. schaltet jeden aktiven, umschaltbaren Kategorie-Schalter aus (Checkboxen und Elemente mit
   `role="switch"`; deaktivierte gehören zur notwendigen Kategorie und bleiben an),
3. klickt auf Speichern („Auswahl speichern“, „Speichern“, „Save“, …; nie „Alle akzeptieren“),
4. wartet, bis das Netzwerk ruhig ist, lädt die Seite neu und wartet erneut.

Jede Anfrage und jedes Cookie seit dem Speichern wird mit der Tracker-Liste abgeglichen, mit
denselben Schweregraden wie bei `trackers-after-reject`.

Unter `consent.settings` steht im Bericht, welche Elemente benutzt wurden, wie viele Schalter
ausgeschaltet wurden und ob die Beobachtung vollständig war. Hat das Banner keine Einstellungen
oder keine Speichern-Schaltfläche, ist die Regel nicht prüfbar und nennt den Grund.

## Warum

Alles abzuwählen ist eine Ablehnung wie die Ablehnen-Schaltfläche und muss genauso wirken.

- § 25 Abs. 1 TDDDG
- Art. 7 Abs. 3 DSGVO

## Lösung

- Prüfen, dass das Speichern die gewählten Kategorien ablegt und die Tags diese Kategorien lesen,
  nicht nur, ob überhaupt eine Wahl gespeichert ist.
- Prüfen, dass kein Dienst außerhalb der Kategorien liegt oder in einer Kategorie, die an ist und
  sich nicht abwählen lässt.

## Grenzen

- Am 30.10.2026 hat der Einstellungs-Pfad auf cookiebot.com, onetrust.com, cookieyes.com und
  complianz.io geöffnet, umgeschaltet und gespeichert. usercentrics.com und der
  CookieConsent-Playground zeigten Headless-Chromium kein Banner; diese beiden Selektoren sind
  ungeprüft. Passt ein Selektor nicht, greift die Erkennung über die Beschriftung.
- Schalter für einzelne Anbieter in zugeklappten Abschnitten bleiben unverändert; das Abwählen ihrer
  Kategorie soll sie mit abdecken.
- Die Prüfung lädt die Startseite ein weiteres Mal und lädt sie danach neu.
