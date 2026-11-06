# privacy-policy-vendors

[English](privacy-policy-vendors.md)

Meldet Dienste, die die Startseite nutzt, die ihre Datenschutzerklärung aber nicht nennt.

## Was geprüft wird

Verlinkt die Startseite eine Datenschutzerklärung auf derselben Website, lädt privalint sie
zusätzlich, ohne sie als gecrawlte Seite zu zählen, und liest ihren sichtbaren Text. Verlinkt die
Erklärung eine eigene Cookie-Richtlinie („Cookie-Richtlinie“, „Cookie policy“, „Süti tájékoztató“,
…), wird auch diese gelesen, eine Ebene tief.

Jeder Dienst, den die Startseite vor der Einwilligung und nach dem Ablehnen kontaktiert hat, wird
dann in diesem Text gesucht. Mit `--check-accept` akzeptiert privalint zusätzlich in einem frischen
Browser, lädt neu und nimmt die Dienste hinzu, die erst mit Einwilligung laden. Die erteilte
Einwilligung bleibt in diesem Browser, der danach geschlossen wird.

| Dienst                                                                                                                               | Fehlt in der Erklärung |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| Tracker, per Anfrage oder Cookie                                                                                                     | `warning`              |
| Einbindungen wie YouTube oder Google Maps, die Cookies setzen                                                                        | `warning`              |
| Einbindungen ohne Cookies, Schriftdienste, öffentliche CDNs, Anbieter aus [`third-country-providers`](third-country-providers.de.md) | `info`                 |

Ein Dienst gilt als genannt, wenn die Erklärung seinen Namen als ganzes Wort enthält, in beliebiger
Schreibweise und mit beliebigen Leerzeichen oder Bindestrichen („Google-Analytics“), den Namen ohne
Wörter wie „embed“ oder „pixel“ („YouTube“), einen bekannten anderen Namen („GA4“,
„Facebook Pixel“, „reCAPTCHA“) oder den Host, von dem er geladen wurde. Ein Befund je Dienst, mit
der URL der Erklärung und der ersten Anfrage oder dem ersten Cookie als Beleg. Die Befunde stehen
bei der Startseite.

## Warum

Die Datenschutzerklärung muss die Empfänger personenbezogener Daten nennen. Eine Erklärung, die das
Analyse-Tool oder den Video-Anbieter der Website nie erwähnt, lässt Besucher im Unklaren.

- Art. 13 Abs. 1 lit. e und f DSGVO
- Schweiz (`--region ch`): Art. 19 Abs. 2 lit. c DSG

## Wie beheben

Jeden Dienst in der Datenschutzerklärung nennen, mit Zweck, Rechtsgrundlage und, falls zutreffend,
der Übermittlung außerhalb der EU. Wird ein Dienst nicht mehr gebraucht, ihn stattdessen entfernen.

## Grenzen

- Nur Dienste, die auf der Startseite ohne Einwilligung oder nach dem Ablehnen laden, werden
  gesehen. Dienste, die erst nach der Einwilligung laden, werden nur mit `--check-accept`
  geprüft.
- Ein Name in der Erklärung reicht; ob die Beschreibung stimmt, wird nicht geprüft.
- Eine Cookie-Richtlinie, die als PDF auf derselben Website liegt, wird heruntergeladen (bis 5 MB)
  und ihr Text mit pdf.js gelesen; gescannte PDFs ohne Textebene enthalten keinen lesbaren Text.
  Eine Datenschutzerklärung, die selbst ein PDF ist, Erklärungen auf einer anderen Domain und
  Erklärungen, die auf mehr als eine verlinkte Seite verteilt sind, werden nur teilweise gelesen.
  Verlinkt die Erklärung eine Cookie-Richtlinie, die sich nicht lesen lässt, etwa ein PDF über
  5 MB, sinkt jeder Befund auf `info` und nennt den ungelesenen Link.
