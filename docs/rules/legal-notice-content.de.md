# legal-notice-content

[English](legal-notice-content.md)

Prüft, ob das von der Startseite verlinkte Impressum eine Postanschrift, eine E-Mail-Adresse und,
wo die Rechtsform einen hat, einen Registereintrag nennt.

## Was geprüft wird

[`impressum-link`](impressum-link.de.md) prüft nur, ob es einen Link gibt. Verlinkt die Startseite
ein Impressum („Impressum“, „Imprint“, „Legal notice“, „Impresszum“, …) auf derselben Website, lädt
privalint diese Seite nach der Startseite zusätzlich, ohne sie als gecrawlte Seite zu zählen, und
liest ihren sichtbaren Text. Die Befunde stehen bei der Startseite, mit der Impressums-URL als
Beleg.

| Angabe          | Wie sie erkannt wird                                                                     | Fehlt                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Postanschrift   | eine Postleitzahl mit Ort, dazu eine Straße mit Hausnummer                               | `warning`                                                                                                      |
| E-Mail          | ein `mailto:`-Link oder eine Adresse im Text, auch als `(at)` / `[at]` geschrieben       | `warning`                                                                                                      |
| Registereintrag | Handelsregister, HRB/HRA, Firmenbuch/FN, Cégjegyzék/Cg., CHE-Nummer, „company number“, … | `info`, nur wenn eine eingetragene Rechtsform (GmbH, UG, AG, e.K., e.V., Kft., Zrt., Bt., Ltd., …) genannt ist |

Postleitzahlen mit fünf Ziffern (Deutschland) oder vier (Österreich, Schweiz, Ungarn), auch mit
Länderkürzel wie `A-` oder `H-`, zählen in jeder Region, ebenso die ungarische Reihenfolge
„Budapest, 1061“: Eine Website in einem Land kann aus einem anderen betrieben werden.

## Warum

Das Impressum muss den Anbieter erreichbar machen: mit Namen, unter einer ladungsfähigen Anschrift
und schnell per E-Mail. Ein Kontaktformular allein reicht nicht. Eingetragene Unternehmen müssen
Register und Nummer nennen.

- § 5 Abs. 1 Nr. 1, 2 und 4 DDG
- § 5 Abs. 1 ECG, § 14 UGB (Österreich)
- Art. 3 Abs. 1 lit. s UWG (Schweiz, für den elektronischen Geschäftsverkehr)
- Ekertv. 4. § (Ungarn)
- Art. 5 Abs. 1 Richtlinie 2000/31/EG (E-Commerce)

## Wie beheben

Den vollständigen Namen des Anbieters, eine ladungsfähige Anschrift (kein Postfach) und eine
E-Mail-Adresse als Text im Impressum angeben. Bei Unternehmen Register, Registergericht und
Registernummer ergänzen.

## Grenzen

- Name des Anbieters und Vertretungsberechtigte werden nicht geprüft; ein Name lässt sich nicht
  zuverlässig von anderem Text unterscheiden.
- Eine USt-IdNr. ist nur Pflicht, wenn es eine gibt, daher wird eine fehlende nicht gemeldet.
- Impressen auf einer anderen Domain, als PDF oder hinter einem Skript, das erst nach dem Settle
  lädt, werden nicht gelesen.
- In der Schweiz ist ein Impressum nur im elektronischen Geschäftsverkehr Pflicht, daher sinken die
  Befunde dort um eine Stufe.
