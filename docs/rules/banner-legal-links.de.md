# banner-legal-links

[English](banner-legal-links.md)

Warnt, wenn ein Cookie-Banner die Seite blockiert und selbst weder die Datenschutzerklärung noch
das Impressum verlinkt.

## Was geprüft wird

Findet privalint auf der Startseite ein Banner, betrachtet es die Ebene um die
Zustimmen-Schaltfläche:

- **Blockierend** heißt: ein modaler Dialog (`aria-modal="true"`), eine Überlagerung über
  mindestens die Hälfte des Bildschirms oder eine Seite, die sich bei offenem Banner nicht scrollen
  lässt. Dann ist der Footer nicht erreichbar.
- In dieser Ebene sucht es Links mit denselben Bezeichnungen wie
  [`privacy-policy-link`](privacy-policy-link.de.md) und [`impressum-link`](impressum-link.de.md).

| Situation                                              | Schweregrad |
| ------------------------------------------------------ | ----------- |
| Blockierendes Banner, das beide Seiten verlinkt        | bestanden   |
| Blockierendes Banner ohne einen oder beide Links       | `warning`   |
| Kleines Banner (eine Leiste), die Seite bleibt nutzbar | nichts      |
| `--region ch`                                          | `info`      |

## Warum

Besucher müssen lesen können, worin sie einwilligen, bevor sie entscheiden (Art. 12 Abs. 1 und
Art. 13 DSGVO), und das Impressum muss jederzeit unmittelbar erreichbar sein (§ 5 DDG). Ein Banner,
das die ganze Seite verdeckt und keines von beiden verlinkt, lässt dazu keine Möglichkeit.

- Art. 12 Abs. 1 DSGVO
- Art. 13 DSGVO
- § 5 DDG

Ob ein blockierendes Banner Footer-Links im Sinne von § 5 DDG „nicht unmittelbar erreichbar“ macht,
ist uns aus keiner Gerichtsentscheidung bekannt; deshalb ist das eine Warnung, kein Fehler.

## Lösung

- Links „Datenschutzerklärung“ und „Impressum“ in den Bannertext aufnehmen.
- Viele Consent-Tools haben dafür eine Einstellung (Cookiebot, Usercentrics, Borlabs, …).
