# Regionsprofile: Frankreich, Italien, Spanien, Niederlande, Polen und Vereinigtes Königreich

`--region fr`, `it`, `es`, `nl`, `pl` und `uk` bestimmen, welches Recht privalint zitiert und wie
es manche Befunde einstuft. Sie entscheiden nicht, welches Recht für eine Website gilt, und kein Befund ist eine
rechtliche Beurteilung. Die Zitate wurden am 17.11.2026 an den Quellen in der
[englischen Fassung](regions.md) recherchiert. Lassen Sie sie von einer Anwältin oder einem Anwalt
im jeweiligen Land prüfen, bevor Sie sich darauf verlassen; Korrekturen gern als Issue.

## Frankreich (`fr`)

- Cookies und Tracker: Art. 82 loi n° 78-17 du 6 janvier 1978, dazu die CNIL-Leitlinien
  (délibération n° 2020-091) und die CNIL-Empfehlung (n° 2020-092, konsolidiert am 16.01.2026).
- Impressum (mentions légales): Art. 1-1, I loi n° 2004-575 (LCEN), seit 23.05.2024, vorher
  art. 6, III; für Onlinehandel Art. 19 LCEN.
- **Analyse vor der Einwilligung oder nach dem Schließen** ist eine Warnung statt eines Fehlers: Die
  CNIL nimmt Reichweitenmessung von der Einwilligung aus, wenn sie nur dem Betreiber dient, anonyme
  Statistiken erzeugt, nicht mit anderen Daten verknüpft wird und Besucher nicht über Websites
  hinweg verfolgt. privalint sieht die Einrichtung nicht; der Lösungsvorschlag nennt die
  Bedingungen. Tracker nach „Ablehnen“ bleiben Fehler.
- **`legal-notice-content`** meldet als Info, wenn das Impressum keinen Hoster (hébergeur) oder
  keinen Verantwortlichen für die Veröffentlichung (directeur de la publication) nennt.
- **`withdrawal-button`** erkennt „renoncer au contrat ici“, die Beschriftung nach Art. D. 221-5
  C. consom. (seit 19.06.2026).

## Italien (`it`)

- Cookies und Tracker: Art. 122 D.lgs. 196/2003 (Codice privacy) und die Cookie-Leitlinien des
  Garante privacy vom 10.06.2021. Impressum: Art. 7 D.lgs. 70/2003, für Gesellschaften
  Art. 2250 c.c.; Umsatzsteuernummer auf der Website: Art. 35 DPR 633/1972.
- **Analyse vor der Einwilligung oder nach dem Schließen** ist eine Warnung: Der Garante behandelt
  Analyse-Cookies wie technische Cookies ohne Einwilligung, wenn sie nur aggregierte Statistiken
  für diese eine Website erzeugen, ein Drittanbieter-Tool die IP-Adresse mindestens teilweise kürzt
  und die Daten weder verknüpft noch weitergegeben werden.
- **`reject-option`**: Ein „X“, das das Banner schließt und die Voreinstellungen belässt, gilt als
  Ablehnung. Hat `--check-close` ein solches „X“ gefunden und benutzt, wird ein Banner ohne
  Ablehnen-Button nicht gemeldet; ob danach Tracker laufen, prüft `trackers-after-close`.
- **`impressum-link`** ist eine Stufe milder: Verlangt sind leicht und unmittelbar erreichbare
  Anbieterangaben, keine Seite mit festem Namen.
- **`legal-notice-content`** meldet als Info eine Gesellschaftsform (S.r.l., S.p.A. und andere)
  ohne partita IVA und erkennt Registro delle Imprese und REA als Registereintrag.

## Spanien (`es`)

- Cookies und Tracker: Art. 22.2 Ley 34/2002 (LSSI) und der Cookie-Leitfaden der AEPD (Mai 2024).
  Impressum (aviso legal): Art. 10.1 LSSI.
- **Keine Ausnahme für Analyse**: Art. 22.2 LSSI nimmt nur unbedingt nötige Speicherung aus.
  Analyse vor der Einwilligung bleibt ein Fehler.
- **`withdrawal-button`** ist eine Stufe milder, solange Spanien Art. 11a der
  Verbraucherrechte-Richtlinie nicht umgesetzt hat (Stand 17.11.2026).
- **`legal-notice-content`** meldet als Info eine Gesellschaftsform (S.L., S.A. und andere) ohne
  NIF und erkennt das Registro Mercantil als Registereintrag.

## Niederlande (`nl`)

- Cookies und Tracker: Art. 11.7a Telecommunicatiewet und die „Vuistregels heldere cookiebanners“
  der Autoriteit Persoonsgegevens. Impressum: Art. 3:15d BW; Widerrufsbutton: Art. 6:230oa BW,
  seit 25.06.2026.
- **Analyse vor der Einwilligung oder nach dem Schließen** ist eine Warnung: Art. 11.7a lid 3 sub b
  Tw nimmt Analyse mit kaum oder keinen Folgen für die Privatsphäre aus; die AP versteht darunter
  gekürzte IP-Adressen, keine Weitergabe für eigene Zwecke des Anbieters und einen
  Auftragsverarbeitungsvertrag.
- **`impressum-link`** ist eine Stufe milder; „Bedrijfsgegevens“ zählt als Beschriftung.
- **`withdrawal-button`** erkennt auch „overeenkomst ontbinden“.
- **`legal-notice-content`** erkennt B.V. und N.V. als Rechtsform und die KvK-Nummer als
  Registereintrag.

## Polen (`pl`)

- Cookies und Tracker: art. 399 Prawo komunikacji elektronicznej (PKE), seit 10.11.2024.
  Impressum: art. 5 UŚUDE; Pflichtangaben von Gesellschaften auf der Website: art. 206 § 1 und
  374 § 1 KSH.
- **Keine Ausnahme für Analyse**: art. 399 PKE nimmt nur unbedingt nötige Speicherung aus.
- **`impressum-link` und `withdrawal-button`** sind eine Stufe milder: Verlangt sind leicht
  erreichbare Angaben, und der Widerrufsbutton ist noch nicht umgesetzt (Stand 17.11.2026).
  „Dane firmy“ zählt als Impressum-, „odstąp od umowy“ als Widerrufsbeschriftung.
- **`legal-notice-content`** meldet als Info, wenn eine sp. z o.o. oder S.A. KRS-Nummer, NIP oder
  Stammkapital nicht nennt.

Die zitierten Abschnitts- und Regelnummern in den Leitlinien von Garante, AEPD (Mai 2024) und AP
wurden am 17.11.2026 an den Dokumenten geprüft. Zwei verweisen auf den nächstliegenden Abschnitt
statt auf eine ausdrückliche Aussage: Der Garante begründet „keine Tracker nach Ablehnung“ mit
§§ 5 und 7.1 (Voreinstellungen und vorherige Einwilligung), und AEPD § 3.2.1 sagt, dass Untätigkeit
und Weitersurfen keine Einwilligung sind, ohne den Schließen-Button zu nennen. Die AP-Regeln wurden
am 09.11.2026 überarbeitet und haben jetzt vier Regeln; Regel 2 und 3 decken ab, wofür privalint
sie zitiert. Die Gesetze wurden an den in der [englischen Fassung](regions.md) verlinkten Quellen
gelesen.

## Vereinigtes Königreich (`uk`)

- Cookies und Tracker: PECR reg. 6 und Sch. A1 in der Fassung des Data (Use and Access) Act 2025,
  in Kraft seit 05.02.2026; die Definitionen der UK GDPR stehen seitdem in Art. 4(1).
- **Analyse vor der Einwilligung oder nach dem Schließen** ist eine Warnung: PECR Sch. A1 para. 5
  erlaubt Statistik allein zur Verbesserung der Website, ohne Weitergabe zu anderen Zwecken, mit
  klarer Information und kostenlosem Widerspruch. Werbung, Social Media und Session-Replay vor der
  Einwilligung und alle Tracker nach „Ablehnen“ bleiben Fehler.
- **`impressum-link` und `withdrawal-button`** sind eine Stufe milder, `accessibility-statement` bleibt ein Hinweis: Das
  britische Recht verlangt leicht erreichbare Anbieterangaben, aber keine Seite namens Impressum;
  einen Widerrufsbutton wie in der EU gibt es nicht; private Websites schulden angemessene
  Vorkehrungen, keine veröffentlichte Erklärung.
- **`third-country-providers`** behandelt das Vereinigte Königreich und den EWR als angemessen und
  nennt die UK-US Data Bridge, das International Data Transfer Agreement und das UK Addendum.
