# reject-option

[English](reject-option.md)

Warnt, wenn die erste Ebene eines erkannten Cookie-Banners „Zustimmen“ anbietet, aber kein
unterstütztes Ablehnen-Element gefunden wurde. Prüfen Sie das Banner selbst, bevor Sie den Befund
als Mangel der Website werten.

## Was geprüft wird

privalint sucht das Cookie-Banner auf der Startseite, entweder über Selektoren gängiger
Consent-Manager (OneTrust, Cookiebot, Usercentrics, Borlabs Cookie, Complianz, CookieYes, Didomi,
consentmanager, iubenda, Klaro, CookieConsent) oder über Button-Beschriftungen auf Deutsch,
Englisch, Französisch, Spanisch, Italienisch und Niederländisch.

Für CookieFirst, Osano, Termly und Sourcepoint gibt es zusätzliche Selektoren, die auch Frames
berücksichtigen. Real Cookie Banner wird über seinen Anbieter-Marker plus die vorhandene
Beschriftungs-Heuristik erkannt. Siehe die
[Hinweise zur CMP-Unterstützung und Prüfung](../consent-managers.de.md) ([English](../consent-managers.md)).

| Situation                                                                        | Schweregrad   |
| -------------------------------------------------------------------------------- | ------------- |
| Zustimmen und Ablehnen auf der ersten Ebene                                      | bestanden     |
| Zustimmen auf der ersten Ebene, Ablehnen nur in den Einstellungen oder gar nicht | `warning`     |
| Zustimmen oder ein Abo („Pur-Abo-Modell“), kein Ablehnen                         | `info`        |
| Kein Banner gefunden                                                             | keine Meldung |

Als Pur-Abo-Modell gilt ein Banner, wenn ein Button oder Link innerhalb des Banners ein Abo
erwähnt („Abo“, „abonnieren“, „subscribe“, „werbefrei“, …). Links in der Navigation der Website
selbst zählen nicht.

Ladefehler und nicht unterstütztes Markup können die Erkennung verhindern. Dass kein Banner
erkannt wurde, ist für sich genommen kein Datenschutzbefund. Maßgeblich sind `consent.state`, die
Erfassungsdiagnosen und der Prüfstatus pro Regel; ein nicht getesteter Ablehnen-Pfad darf nicht
als erfolgreicher Test gelesen werden. Länderprofile wählen die Referenzen und Schweregrade des
Tools und bestimmen nicht, welches Recht anwendbar ist.

## Warum

Die Cookie-Banner-Taskforce des EDSA hat festgestellt, dass die meisten europäischen
Aufsichtsbehörden eine fehlende Ablehnen-Option auf derselben Ebene wie den Zustimmen-Button als
Verstoß werten. Eine Einwilligung muss sich so leicht verweigern wie erteilen lassen, und ein
Banner, das die Ablehnung in den Einstellungen versteckt, drängt Besucher zur Zustimmung.

Pur-Abo-Modelle werden anders bewertet. Die Datenschutzkonferenz hält sie grundsätzlich für
zulässig, wenn das Abo eine gleichwertige Alternative zu einem angemessenen Preis ist. Der EDSA
ist bei großen Online-Plattformen deutlich strenger. privalint kann beides nicht beurteilen und
vermerkt das Modell deshalb nur.

- EDSA Cookie-Banner-Taskforce, 17.01.2023
- DSK-Beschluss, 22.03.2023 (Pur-Abo-Modelle): Bewertung von Pur-Abo-Modellen auf Websites
- EDSA-Stellungnahme 08/2024 zu „Consent or Pay“-Modellen großer Online-Plattformen
- Art. 4 Nr. 11 DSGVO, § 25 Abs. 1 TDDDG

## Grenzen

- Manche Websites zeigen Headless-Browsern kein Banner. privalint meldet dann „kein Banner“, und
  diese Regel bleibt stumm. Prüfen Sie solche Seiten lokal mit `--headed`, siehe README.
- Eine Ablehnen-Option, die ein einfacher Textlink statt eines Buttons ist, wird trotzdem
  gefunden, wenn die Beschriftung passt. Ob der Link „genauso hervorgehoben“ ist wie der
  Zustimmen-Button, wird nicht bewertet.

## Lösung

Setzen Sie einen Button wie „Alle ablehnen“ oder „Nur notwendige“ neben den Zustimmen-Button, in
gleicher Größe und mit gleichem optischen Gewicht. Die meisten Consent-Manager haben dafür eine
Einstellung.
