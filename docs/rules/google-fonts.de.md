# google-fonts

[English](google-fonts.md)

Meldet Schriften, die von Google-Servern geladen werden, und übrig gebliebene Verbindungen dorthin.

## Was geprüft wird

| Situation                                                                                                     | Schweregrad   |
| ------------------------------------------------------------------------------------------------------------- | ------------- |
| Eine Anfrage an `fonts.googleapis.com` oder `fonts.gstatic.com`                                               | `error`       |
| Keine Anfrage, aber ein `<link>` mit `preconnect`, `preload`, `prefetch` oder `stylesheet`, das dorthin zeigt | `warning`     |
| Nur `<link rel="dns-prefetch">`                                                                               | keine Meldung |

`dns-prefetch` löst lediglich den Hostnamen über den DNS-Resolver des Besuchers auf und baut keine
Verbindung zu Googles Schriftservern auf, deshalb lässt privalint es unbeanstandet. `preconnect`
öffnet dagegen eine echte Verbindung, und die IP-Adresse wird dabei übertragen.

## Warum

Jede Schriftanfrage überträgt die IP-Adresse des Besuchers an Google. Das Landgericht München I
hat am 20.01.2022 (Az. 3 O 17493/20) entschieden, dass dafür kein berechtigtes Interesse besteht,
weil sich die Schriften selbst hosten lassen, und dem Besucher 100 € Schadensersatz zugesprochen.
Das Urteil löste eine Abmahnwelle gegen deutsche Website-Betreiber aus.

- Art. 6 Abs. 1 DSGVO
- LG München I, 20.01.2022, Az. 3 O 17493/20

## Lösung

Hosten Sie die Schriftdateien selbst:

- **Next.js:** `next/font/google` lädt die Schriften beim Build herunter und liefert sie von Ihrer
  Domain aus. Zur Laufzeit geht keine Anfrage an Google.
- **Vite, Astro, reine npm-Projekte:** Installieren Sie die Schriftfamilie über
  [Fontsource](https://fontsource.org), z. B. `npm i @fontsource-variable/inter`, und importieren
  Sie sie.
- **Alles andere:** Laden Sie die Dateien über
  [google-webfonts-helper](https://gwfh.mranftl.com/fonts) herunter und binden Sie sie per
  `@font-face` ein.

Durchsuchen Sie anschließend Templates, CSS und Plugins nach `fonts.googleapis.com` und
`fonts.gstatic.com`. Themes und eingebettete Widgets wie Karten oder reCAPTCHA fügen sie oft
wieder hinzu.
