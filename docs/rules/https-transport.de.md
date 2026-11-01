# https-transport

[English](https-transport.md)

Meldet eine Website, die über unverschlüsseltes HTTP erreichbar ist.

## Was geprüft wird

Auf der Startseite, bei nativen Scans:

| Situation                                                         | Schweregrad |
| ----------------------------------------------------------------- | ----------- |
| Die Startseite selbst kommt über `http://`                        | `error`     |
| HTTPS, aber `http://<host>/` antwortet ohne Weiterleitung dorthin | `warning`   |
| HTTPS und Weiterleitung, aber kein `Strict-Transport-Security`    | `info`      |
| HTTPS, Weiterleitung und HSTS                                     | bestanden   |
| `localhost`, `127.0.0.1` und andere Entwicklungs-Hosts            | nichts      |

Für die Weiterleitung schickt privalint eine Anfrage an `http://<host>/` und folgt ihr nicht.
Antwortet auf Port 80 gar nichts, wird nichts unverschlüsselt ausgeliefert; das ist bestanden. Mit
Netzwerk-Adapter (kontrolliertes Scannen) oder `offline` entfällt diese zusätzliche Anfrage, und
die Regel ist nicht prüfbar.

## Warum

Was Besucher senden, vom Kontaktformular über den Login bis zum Cookie, muss bei der Übertragung
geschützt sein. Verschlüsselung ist dafür die Grundmaßnahme.

- Art. 32 DSGVO
- § 19 Abs. 4 TDDDG

## Lösung

- Die Seite über HTTPS ausliefern; ein kostenloses Zertifikat von Let's Encrypt genügt.
- Jede `http://`-Anfrage mit 301 auf dieselbe Adresse unter `https://` umleiten.
- Sobald HTTPS auf allen Subdomains funktioniert, `Strict-Transport-Security: max-age=31536000`
  senden.
