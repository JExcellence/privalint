# form-preticked-consent

[English](form-preticked-consent.md)

Meldet Formulare, die eine Einwilligung in Newsletter oder Werbung vorab anhaken.

## Was geprüft wird

In jedem sichtbaren Formular mit E-Mail-, Telefon- oder Passwortfeld (die Formulare, die auch
[`form-privacy-notice`](form-privacy-notice.de.md) prüft) liest privalint die Checkboxen, die nach
dem Laden angehakt sind. Eine angehakte Checkbox, deren Beschriftung Newsletter, Angebote,
Marketing, Aktionen, „Werbung“, „offers“ oder „hírlevél“ nennt, ist eine `warning`, mit bis zu drei
Beschriftungen als Beleg. Angehakte Checkboxen für AGB, Datenschutzhinweise oder „angemeldet
bleiben“ werden nicht gemeldet.

## Warum

Eine Einwilligung muss eine eindeutige, aktive Handlung sein. Ein vorab gesetzter Haken ist keine
Einwilligung (EuGH C-673/17, Planet49), und Werbung per E-Mail braucht eine vorherige Einwilligung.

- Art. 4 Nr. 11, Art. 7 DSGVO; § 7 Abs. 2 UWG (Deutschland)
- Art. 4 Nr. 11, Art. 7 DSGVO; § 174 TKG 2021 (Österreich)
- Art. 3 Abs. 1 lit. o UWG (Schweiz)
- GDPR 4. cikk 11. pont, 7. cikk; Grt. 6. § (Ungarn)

## Wie beheben

Newsletter- und Werbe-Checkboxen nicht vorab anhaken, damit Besucher sie selbst setzen.

## Grenzen

- Nur Checkboxen in einem `<form>`-Element werden gelesen, nicht eigene Schalter aus anderen
  Elementen.
- Ein Haken, den ein Skript erst nach dem Settle setzt, wird nicht gesehen.
