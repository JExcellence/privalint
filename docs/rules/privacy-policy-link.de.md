# privacy-policy-link

[English](privacy-policy-link.md)

Warnt, wenn eine Seite nicht auf eine Datenschutzerklärung verlinkt.

## Was geprüft wird

Jeder Link auf der Seite wird anhand von Text, `aria-label`, `title` und URL-Pfad mit gängigen
Bezeichnungen für eine Datenschutzerklärung abgeglichen: Datenschutz, Datenschutzerklärung,
Privacy, Data protection, Confidentialité, Privacidad, Protezione dei dati, Privacybeleid und
Polityka prywatności.

Die Regel läuft auf jeder gecrawlten Seite.

## Warum

Betroffene sind bei der Erhebung ihrer Daten über die Verarbeitung zu informieren. Eine Website
verarbeitet bei jedem Seitenaufruf die IP-Adresse, mindestens in den Server-Logs. Die
Datenschutzerklärung muss deshalb von jeder Seite aus erreichbar sein, in der Praxis über einen
Link im Footer.

- Art. 12 DSGVO: Die Informationen müssen leicht zugänglich sein
- Art. 13 DSGVO: Information zum Zeitpunkt der Erhebung

## Lösung

Fügen Sie im Footer neben dem Impressum-Link einen Link „Datenschutz“ oder
„Datenschutzerklärung“ ein.
