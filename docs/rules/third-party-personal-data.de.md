# third-party-personal-data

[English](third-party-personal-data.md)

Meldet Anfragen an fremde Websites, deren Adresse E-Mail-Adressen oder Telefonnummern von
Besuchern enthält.

## Was geprüft wird

Jede Anfrage, die die Seite vor der Einwilligung an einen Host außerhalb der Website schickt, wird
nach Query-Parametern durchsucht, die Folgendes enthalten:

| Angabe          | Woran sie erkannt wird                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| E-Mail-Adresse  | ein Parameterwert, der eine E-Mail-Adresse ist, etwa `?q=jane%40example.org`                                          |
| Gehashte E-Mail | ein SHA-256-Hash in einem Parameter wie `em`, `ud[em]`, `email` oder `sha256_email_address` (Meta, Google, TikTok, …) |
| Telefonnummer   | eine Nummer oder ein SHA-256-Hash in einem Parameter wie `ph`, `ud[ph]`, `phone` oder `tel`                           |

Jeder Host ist eine `warning`, mit den Parameternamen als Beleg. Die Werte werden nie gemeldet:
privalint ersetzt sie auch überall dort durch `[redacted]`, wo eine Anfrage-Adresse in einem Befund
einer beliebigen Regel steht.

## Warum

Pixel mit „erweitertem Abgleich“, Analytics-Einstellungen und Suchseiten können Formulareingaben an
andere Unternehmen weitergeben. Auch ein Hash einer E-Mail-Adresse identifiziert die Person, denn
der Empfänger hasht seine Kundenliste auf dieselbe Weise. Das ist eine Übermittlung
personenbezogener Daten über die IP-Adresse hinaus und braucht eine Rechtsgrundlage, meist eine
Einwilligung.

- Art. 5 Abs. 1 lit. c, Art. 6 Abs. 1 DSGVO (Deutschland, Österreich)
- Art. 6 Abs. 2 und 3 DSG (Schweiz)
- GDPR 5. cikk (1) c), 6. cikk (1) (Ungarn)

## Wie beheben

Erweiterten Abgleich bzw. automatische Nutzerdaten in den Tag-Einstellungen ausschalten,
Formulareingaben per POST statt in URLs senden und solche Daten nur nach Einwilligung übertragen.

## Grenzen

- Nur Query-Strings werden gelesen, nicht Request-Bodys und Pfade.
- Telefonnummern werden nur in Parametern erkannt, die danach benannt sind; eine Telefonnummer in
  einem anderen Parameter wird nicht gemeldet.
