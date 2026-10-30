# third-party-cdns

[English](third-party-cdns.md)

Weist auf Skripte, Styles und Icon-Fonts hin, die von öffentlichen CDNs geladen werden.

## Was geprüft wird

Anfragen an jsDelivr, unpkg, cdnjs, Google Hosted Libraries, das jQuery-CDN, BootstrapCDN, das
Tailwind-Play-CDN und das Font-Awesome-CDN. Jedes CDN wird einmal pro Seite als **`info`**
gemeldet.

## Warum

Jede Anfrage an ein CDN überträgt die IP-Adresse des Besuchers an dessen Betreiber. Die
Begründung, die das Landgericht München I für Google Fonts herangezogen hat (ein Dritter erhält
die IP-Adresse, obwohl sich die Dateien genauso gut selbst hosten ließen), passt auch auf CDNs.
Ein Urteil speziell zu CDNs gibt es nicht, und das Risiko ist geringer, weil die meisten Betreiber
die Daten nicht für eigene Zwecke nutzen. Deshalb ist diese Regel ein Hinweis und keine Warnung.

- Art. 6 Abs. 1 DSGVO
- LG München I, 20.01.2022, Az. 3 O 17493/20 (entsprechend)

## Lösung

Installieren Sie die Bibliothek mit npm (oder Ihrem Paketmanager) und lassen Sie sie von Ihrem
Build bündeln, oder kopieren Sie die Dateien auf Ihren eigenen Server. Das ist meist auch
schneller, weil ein DNS-Lookup und ein Verbindungsaufbau entfallen.

Wenn Sie sich bewusst für ein CDN entschieden haben, deaktivieren Sie die Regel mit
`--disable third-party-cdns`.
