# gpc-signal

[English](gpc-signal.md)

Optional (`--gpc`). Hält fest, wie die Website auf Global Privacy Control reagiert.

## Was geprüft wird

[Global Privacy Control](https://globalprivacycontrol.org/) ist eine Browser-Einstellung, die mit
jeder Anfrage `Sec-GPC: 1` sendet und `navigator.globalPrivacyControl` auf `true` setzt. Mit `--gpc`
lädt privalint die Startseite ein weiteres Mal in einem frischen Browser mit beidem, klickt nichts
und vergleicht diesen Aufruf mit dem normalen:

| Mit dem Signal                     | Befund                                         |
| ---------------------------------- | ---------------------------------------------- |
| Banner ausgeblendet, keine Tracker | `info`: die Website beachtet das Signal        |
| Banner ausgeblendet, Tracker laden | `info`: nennt die Tracker, mit Lösung          |
| Banner erscheint weiterhin         | `info`: die Website reagiert nicht, mit Lösung |

Der Befund ist in jeder Region `info`. Der Beleg nennt Banner und Tracker mit und ohne Signal. Das
Ergebnis steht in `consent.gpc` des Berichts. Die Prüfung läuft nur, wenn die Startseite ein
Consent-Banner zeigt.

| Situation                         | Ergebnis                                        |
| --------------------------------- | ----------------------------------------------- |
| Startseite mit dem Signal geladen | geprüft; immer ein `info`-Befund                |
| `--gpc` nicht angegeben           | ausgelassen (`gpc-check-disabled`), keine Lücke |
| Der Aufruf mit Signal schlug fehl | nicht prüfbar (`browser-interaction-failed`)    |

## Warum

Nach dem CCPA muss ein Unternehmen GPC als Widerspruch gegen Verkauf und Weitergabe behandeln
(Cal. Civ. Code § 1798.135). EU-Recht verpflichtet eine Website nicht, es zu beachten, aber
Art. 21 Abs. 5 DSGVO erlaubt den Widerspruch mittels automatisierter Verfahren mit technischen
Spezifikationen, und manche Consent-Manager behandeln GPC als Ablehnung. Eine Website, die es
beachtet, erspart diesen Besuchern das Banner.

## Wie beheben

`Sec-GPC: 1` und `navigator.globalPrivacyControl` als Ablehnung behandeln: die Wahl als abgelehnt
speichern und keine Tracker laden. Viele Consent-Manager haben dafür eine Einstellung.

## Grenzen

- Nur die Startseite wird mit dem Signal geladen.
- Ein Banner, das später als nach der Wartezeit erscheint, kann wie bei der Ablehnen-Prüfung
  übersehen werden.
- Ob der Consent-Manager eine Ablehnung gespeichert hat, wird nicht gelesen, nur was lädt und ob das
  Banner erscheint.
