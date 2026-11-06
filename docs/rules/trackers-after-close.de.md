# trackers-after-close

[English](trackers-after-close.md)

Optional (`--check-close`). Meldet Tracker, die laden, nachdem das Consent-Banner mit seiner
Schließen-Schaltfläche statt einer Entscheidung geschlossen wurde.

## Was geprüft wird

Mit `--check-close` lädt privalint die Startseite ein weiteres Mal in einem frischen Browser, sucht
das Schließen-Element des Banners und klickt es: ein sichtbares Bedienelement in der Banner-Ebene,
dessen ganzer Text „×“, „✕“, „X“, „Close“, „Schließen“, „Bezár“, … ist oder dessen `aria-label`
oder `title` das sagt. Danach lädt es die Seite neu und vergleicht wie beim Ablehnen-Pfad, was
lädt. Jeder Tracker von privalints Liste, der dann lädt oder neue Cookies setzt, ist ein `error`
(ein Tag-Manager allein eine `warning`).

| Situation                               | Ergebnis                                                     |
| --------------------------------------- | ------------------------------------------------------------ |
| Schließen-Element gefunden und geklickt | geprüft; Befunde für geladene Tracker                        |
| Banner ohne Schließen-Element           | geprüft, kein Befund: Schließen kann nicht missdeutet werden |
| `--check-close` nicht angegeben         | ausgelassen (`close-check-disabled`), keine Lücke            |
| Banner erschien nicht erneut            | nicht prüfbar (`banner-not-shown`)                           |

Der Bericht hält das Ergebnis in `consent.close` fest: Ergebnis, Grund, Beschriftung des
Schließen-Elements und ob das Fenster nach dem Schließen vollständig beobachtet wurde.

## Warum

Eine Einwilligung braucht eine eindeutige bestätigende Handlung. Das Schließen eines Banners ist
gar keine Entscheidung; eine Website, die danach Tracker lädt, wertet Schweigen als Einwilligung
(Bericht der EDSA-Cookie-Banner-Taskforce, 17.01.2023).

- § 25 Abs. 1 TDDDG, Art. 4 Nr. 11 DSGVO (Deutschland)
- § 165 Abs. 3 TKG 2021, Art. 4 Nr. 11 DSGVO (Österreich)
- Art. 45c FMG (Schweiz; Opt-out-Modell, daher sinken die Befunde dort um eine Stufe)
- Eht. 155. § (4), GDPR 4. cikk 11. pont (Ungarn)

## Wie beheben

Das Schließen wie keine Entscheidung behandeln: Tracker blockiert lassen, bis der Besucher zustimmt,
oder die Schließen-Schaltfläche entfernen, sodass nur Zustimmen, Ablehnen und Einstellungen bleiben.

## Grenzen

- Schließen-Elemente ohne erkennbare Beschriftung, etwa ein unbeschriftetes Icon, werden nicht
  gefunden.
- Nur die Startseite wird geprüft.
