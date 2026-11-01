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
   `role="switch"`; deaktivierte gehören zur notwendigen Kategorie und bleiben an). Es zählen nur
   Schalter in der Consent-Ebene; das Häkchen „Angemeldet bleiben“ eines Login-Formulars bleibt,
3. klickt auf Speichern („Auswahl speichern“, „Speichern“, „Save“, …). Eine Schaltfläche für
   alles, etwa „Alle akzeptieren“, „Alle bestätigen“ oder „Confirm all“, wird nie benutzt,
4. wartet, bis das Netzwerk ruhig ist, lädt die Seite neu und wartet erneut,
5. fragt, wenn die Seite die IAB-TCF-Schnittstelle (`__tcfapi`) hat, ab, was dort gespeichert ist.
   Das liest nur; nichts wird angeklickt.

Jede Anfrage und jedes Cookie seit dem Speichern wird mit der Tracker-Liste abgeglichen, mit
denselben Schweregraden wie bei `trackers-after-reject`.

Bei TCF-Bannern ist eine Einwilligung, die die Schnittstelle für einen Zweck oder Anbieter noch
meldet, ein Fehler: Die Besucher haben abgelehnt, gespeichert wurde eine Einwilligung. Zwecke oder
Anbieter, die über berechtigtes Interesse an bleiben, sind eine Warnung: TCF-Banner legen diesen
Widerspruch meist in einen eigenen Reiter. Die Zweck-Nummern stehen als Nachweis im Befund und unter
`consent.settings.tcf`.

Unter `consent.settings` steht im Bericht, welche Elemente benutzt wurden, wie viele Schalter
ausgeschaltet wurden und ob die Beobachtung vollständig war. Hat das Banner keine Einstellungen
oder keine Speichern-Schaltfläche, ist die Regel nicht prüfbar und nennt den Grund.

## Warum

Alles abzuwählen ist eine Ablehnung wie die Ablehnen-Schaltfläche und muss genauso wirken.

- § 25 Abs. 1 TDDDG
- Art. 6 Abs. 1 lit. a DSGVO

## Lösung

- Prüfen, dass das Speichern die gewählten Kategorien ablegt und die Tags diese Kategorien lesen,
  nicht nur, ob überhaupt eine Wahl gespeichert ist.
- Prüfen, dass kein Dienst außerhalb der Kategorien liegt oder in einer Kategorie, die an ist und
  sich nicht abwählen lässt.

## Grenzen

- Am 30.10.2026 hat der Einstellungs-Pfad auf cookiebot.com, onetrust.com, cookieyes.com und
  complianz.io geöffnet, umgeschaltet und gespeichert, am 31.10.2026 auf dkb.de (Usercentrics v3).
  Der CookieConsent-Playground zeigte Headless-Chromium kein Banner; dieser Selektor ist ungeprüft.
  Passt ein Selektor nicht, greift die Erkennung über die Beschriftung.
- Schalter für einzelne Anbieter in zugeklappten Abschnitten bleiben unverändert; das Abwählen ihrer
  Kategorie soll sie mit abdecken. Bei TCF-Bannern zeigt die Abfrage der Schnittstelle, ob das
  geklappt hat.
- Die Prüfung lädt die Startseite ein weiteres Mal und lädt sie danach neu.
