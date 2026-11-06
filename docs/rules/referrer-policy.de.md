# referrer-policy

[English](referrer-policy.md)

Weist auf Seiten hin, deren Referrer-Policy die vollständige Seitenadresse an fremde Websites
schickt.

## Was geprüft wird

privalint liest den Antwort-Header `Referrer-Policy` der Seite (soweit der Netzwerk-Adapter Header
weitergibt) und ein `<meta name="referrer">`-Tag, das die Policy des Headers ersetzt. Ist die Policy
`unsafe-url` oder `no-referrer-when-downgrade` (oder der alte Meta-Wert `always`) und hat die Seite
fremde Hosts angefragt, ist das `info`, mit der Policy und bis zu drei Hosts als Beleg. Über mehrere
Seiten wird der Befund einmal gezeigt.

## Warum

Mit diesen Policies trägt jede Anfrage an eine fremde Website die vollständige Seitenadresse,
einschließlich Pfad und Query, die Suchbegriffe, Bestellnummern oder Tokens enthalten können.
Browser senden fremden Websites standardmäßig nur den Ursprung; eine Website, die das aufweicht,
gibt mehr weiter als nötig.

- Art. 25 Abs. 2 DSGVO (Deutschland, Österreich)
- Art. 7 Abs. 3 DSG (Schweiz)
- GDPR 25. cikk (2) bekezdés (Ungarn)

## Wie beheben

`Referrer-Policy: strict-origin-when-cross-origin` oder strenger setzen und `unsafe-url` sowie
`no-referrer-when-downgrade` aus Header und Meta-Tags entfernen.

## Grenzen

- `referrerpolicy`-Attribute an einzelnen Links, Bildern oder Frames werden nicht gelesen.
