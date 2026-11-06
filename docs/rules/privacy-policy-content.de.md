# privacy-policy-content

[English](privacy-policy-content.md)

Prüft, ob die von der Startseite verlinkte Datenschutzerklärung den Verantwortlichen erreichbar
nennt und keinen übrig gebliebenen Vorlagentext enthält.

## Was geprüft wird

privalint liest die Datenschutzerklärung wie bei
[`privacy-policy-vendors`](privacy-policy-vendors.de.md): die Seite, die die Startseite als
Datenschutzerklärung verlinkt, auf derselben Website, dazu eine dort verlinkte Cookie-Richtlinie.
Beide Regeln teilen sich diesen einen Ladevorgang.

| Angabe                       | Woran sie erkannt wird                                                                                                                                  | Befund                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Kontakt des Verantwortlichen | eine E-Mail-Adresse (auch ein `mailto:`-Link oder `(at)`) oder eine Postanschrift, wie bei [`legal-notice-content`](legal-notice-content.de.md)         | `warning`, wenn beides fehlt                  |
| Vorlagentext                 | Felder in Klammern wie `[Firmenname]` oder `[Your name]`, „Musterstraße“, „Max Mustermann“, „Musterfirma“, „Lorem ipsum“, `example.com`                 | `warning`, mit bis zu drei gefundenen Stellen |
| Datenschutzbeauftragter      | „Datenschutzbeauftragte“, „data protection officer“, „DPO“ oder „adatvédelmi tisztviselő“ mit E-Mail, Anschrift oder Telefonnummer in den Zeilen danach | `info`, wenn keine folgt                      |

Ist die Datenschutz-Seite nur eine Übersicht, die weitere Datenschutzdokumente verlinkt (eigene
Unterseiten oder als Datenschutzhinweise beschriftete Seiten und PDFs), ist ein fehlender Kontakt
nur `info`, mit bis zu drei dieser Links als „nicht gelesen“.

Eine Zeile, nach der kein Datenschutzbeauftragter bestellt ist („Wir haben keinen
Datenschutzbeauftragten bestellt“), wird nicht gemeldet.

## Warum

Art. 13 Abs. 1 lit. a und b DSGVO verlangen in der Datenschutzerklärung Name und Kontaktdaten des
Verantwortlichen und, falls benannt, die Kontaktdaten des Datenschutzbeauftragten. Eine aus einem
Generator kopierte Erklärung mit stehen gebliebenen Platzhaltern nennt beides nicht.

- Art. 13 Abs. 1 lit. a und b DSGVO (Deutschland, Österreich)
- Art. 19 Abs. 2 lit. a DSG (Schweiz)
- GDPR 13. cikk (1) bekezdés a) és b) pont (Ungarn)

## Wie beheben

Das Unternehmen oder die Person hinter der Website mit Postanschrift und E-Mail-Adresse in der
Datenschutzerklärung nennen. Alle Platzhalter durch die echten Angaben ersetzen. Gibt es einen
Datenschutzbeauftragten, dort, wo er genannt ist, eine E-Mail-Adresse oder einen anderen Kontaktweg
angeben.

## Grenzen

- Nur die Datenschutzerklärung der Startseite wird gelesen, nicht eine als PDF oder auf einer
  anderen Domain.
- Ein Kontakt-Link ohne `mailto:`-Ziel, etwa zu einem Kontaktformular, zählt nicht als
  E-Mail-Adresse.
- Ob der genannte Verantwortliche der richtige ist, wird nicht geprüft.
