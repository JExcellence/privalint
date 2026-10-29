# adobe-fonts

[English](adobe-fonts.md)

Meldet Schriften, die von Adobe Fonts (früher Typekit) geladen werden, und übrig gebliebene
Verbindungen dorthin.

## Was geprüft wird

| Situation                                                                                                     | Schweregrad   |
| ------------------------------------------------------------------------------------------------------------- | ------------- |
| Eine Anfrage an `use.typekit.net` oder `p.typekit.net`                                                        | `error`       |
| Keine Anfrage, aber ein `<link>` mit `preconnect`, `preload`, `prefetch` oder `stylesheet`, das dorthin zeigt | `warning`     |
| Nur `<link rel="dns-prefetch">`                                                                               | keine Meldung |

`use.typekit.net` liefert das Kit-Stylesheet und die Schriftdateien. `p.typekit.net` ist ein
Seitenaufruf-Ping, mit dem Adobe die Nutzung für die Schriftlizenzierung zählt. Andere
Adobe-Hosts wie `adobe.com` gehören nicht zu dieser Regel.

## Warum

Jede Anfrage überträgt die IP-Adresse des Besuchers an Adobe, und der Seitenaufruf-Ping enthält
zusätzlich den Hostnamen der Seite. Die Begründung des Landgerichts München I zu Google Fonts
(20.01.2022, Az. 3 O 17493/20) nennt Adobe nicht, beruht aber auf demselben Sachverhalt: Eine
IP-Adresse geht an einen Dritten, für eine Ressource, die sie nicht braucht. privalint wendet sie
entsprechend an. Ein Urteil zu Adobe Fonts ist uns nicht bekannt.

- Art. 6 Abs. 1 DSGVO
- LG München I, 20.01.2022, Az. 3 O 17493/20 (entsprechend)

## Lösung

Anders als Google Fonts lassen sich Adobe Fonts nicht einfach herunterladen und selbst hosten.
Adobes Lizenz für die Web-Nutzung deckt die Auslieferung über Adobes eigene Server ab. Es gibt drei
Möglichkeiten:

- **Die Schrift für Self-Hosting lizenzieren**, direkt bei der Foundry. Viele Foundries, die über
  Adobe Fonts veröffentlichen, verkaufen auch Web-Lizenzen.
- **Beim Adobe-Vertrieb nachfragen**, ob Ihr Tarif lokales Hosting erlaubt.
- **Auf eine Schrift mit offener Lizenz umsteigen**, etwa von [Fontsource](https://fontsource.org),
  und sie von Ihrer eigenen Domain ausliefern.

Durchsuchen Sie anschließend Templates, CSS und Plugins nach `use.typekit.net` und
`p.typekit.net`, auch nach zurückgebliebenen `<link rel="preconnect">`-Tags.
