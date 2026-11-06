# consent-preselected

[English](consent-preselected.md)

Meldet optionale Cookie-Kategorien, die schon eingeschaltet sind, wenn Besucher die Einstellungen
des Banners öffnen. Optional: läuft mit der Einstellungsprüfung (`--check-settings` oder
`settingsCheck: true`).

## Was geprüft wird

Die Einstellungsprüfung von [`trackers-after-settings`](trackers-after-settings.de.md) öffnet die
Einstellungsebene des Banners auf der Startseite und schaltet jede optionale Kategorie aus. Bevor
sie eine Kategorie ausschaltet, notiert privalint, dass sie eingeschaltet war. Bei Bannern, die
Stufen als Radiobuttons anbieten, wird die vorausgewählte Stufe notiert, wenn sie weiter geht als
die engste.

Deaktivierte Schalter gehören zur notwendigen Kategorie und zählen nicht. Es zählen nur Schalter in
der Consent-Ebene, eine „Angemeldet bleiben“-Box an anderer Stelle der Seite bleibt außen vor.

Der Befund nennt jede Kategorie mit ihrer Beschriftung, soweit die Seite eine hat. Die
Beschriftungen stehen in `consent.settings.preselected`. War nichts eingeschaltet, gibt es keinen
Befund. Konnte die Einstellungsprüfung die Ebene nicht öffnen, ist die Regel nicht auswertbar und
sagt, warum.

## Warum

Eine Einwilligung braucht eine aktive Wahl. Ein vorab gesetztes Häkchen ist keine, auch wenn
Besucher es entfernen könnten.

- Art. 4 Nr. 11 DSGVO
- EuGH, 01.10.2019, C-673/17 (Planet49)
- § 25 Abs. 1 TDDDG

## Wie beheben

- Das Consent-Tool so einstellen, dass jede optionale Kategorie in der Einstellungsebene
  ausgeschaltet startet.
- Die Einstellung nach Updates des Consent-Tools prüfen. Manche Vorlagen schalten Kategorien
  standardmäßig ein.

## Grenzen

- privalint liest den Zustand in dem Moment, in dem sich die Einstellungsebene öffnet. Eine
  Kategorie, die ein Skript später einschaltet, etwa beim Scrollen, wird nicht gesehen.
- Schalter für einzelne Anbieter in zugeklappten Bereichen werden nicht geöffnet und nicht gezählt.
- Die Beschriftung kommt aus dem `<label>` des Schalters, `aria-label`, `aria-labelledby` oder dem
  Text daneben. Ein Schalter ohne all das wird ohne Namen gezählt.
