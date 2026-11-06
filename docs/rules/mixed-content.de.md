# mixed-content

[English](mixed-content.md)

Meldet HTTPS-Seiten, deren Formulare über HTTP senden, und Ressourcen, die sie über HTTP einbinden.

## Was geprüft wird

Nur Seiten, die über HTTPS ausgeliefert werden; eine Seite über HTTP ist ein Fall für
[`https-transport`](https-transport.de.md).

| Fall                                                                                                                                  | Befund  |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Ein Formular mit E-Mail-, Telefon- oder Passwortfeld, dessen `action` oder `formaction` einer Schaltfläche eine `http://`-Adresse ist | `error` |
| Skripte, Bilder, Frames, Medien oder Stylesheets über `http://`, oder Anfragen an `http://`-Adressen                                  | `info`  |

## Warum

Ein Formular, das über HTTP sendet, überträgt Eingaben wie E-Mail-Adressen und Passwörter
unverschlüsselt. Browser blockieren oder erneuern Ressourcen über HTTP auf HTTPS-Seiten, aber
solche Verweise zeigen, dass die Umstellung auf HTTPS nicht abgeschlossen ist.

- Art. 32 DSGVO (Deutschland, Österreich)
- Art. 8 DSG (Schweiz)
- GDPR 32. cikk (Ungarn)

## Wie beheben

Formularziele auf `https://`-Adressen setzen und alle Ressourcen über `https://` oder vom eigenen
Server laden.

## Grenzen

- Formulare ohne Feld für personenbezogene Daten, etwa eine Suche, werden nicht geprüft.
- Ressourcen, die ein Skript erst nach dem Settle einfügt, werden nicht gesehen.
