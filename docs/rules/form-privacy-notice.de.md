# form-privacy-notice

[English](form-privacy-notice.md)

Weist auf Formulare hin, die personenbezogene Daten erheben, ohne dass daneben ein Link zur
Datenschutzerklärung steht.

## Was geprüft wird

Auf jeder gescannten Seite betrachtet privalint sichtbare `<form>`-Elemente mit E-Mail-, Telefon-
oder Passwortfeld. Suchformulare (`role="search"`, ein Suchfeld, eine Such-Action) zählen nicht. Für
jedes Formular sucht es einen Link zur Datenschutzerklärung im Formular oder im umgebenden Element,
solange dieses nicht praktisch die ganze Seite ist.

| Situation                                                            | Schweregrad                                                           |
| -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Jedes solche Formular hat einen Datenschutz-Link in der Nähe         | bestanden                                                             |
| Ein Formular ohne, während die Seite die Erklärung anderswo verlinkt | `info`                                                                |
| Die Seite hat gar keinen Datenschutz-Link                            | hier nichts; [`privacy-policy-link`](privacy-policy-link.de.md) warnt |

## Warum

Art. 13 DSGVO verlangt die Informationen zum Zeitpunkt der Erhebung. Eine kurze Zeile unter dem
Formular macht das deutlich. Ob ein Datenschutz-Link im Footer genügt, ist nicht geklärt; deshalb
ist das nur ein Hinweis.

- Art. 13 DSGVO

## Lösung

Unter dem Formular eine Zeile ergänzen, zum Beispiel: „Wir verwenden Ihre Angaben, um Ihre Anfrage
zu beantworten. Details: [Datenschutzerklärung]“.

## Grenzen

Formulare ohne `<form>`-Element, etwa nur per JavaScript gebaut, werden nicht gefunden. Gelesen
wird nur der Aufbau eines Formulars, nie das, was eingetippt wird.
