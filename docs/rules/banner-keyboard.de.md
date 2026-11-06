# banner-keyboard

[English](banner-keyboard.md)

Warnt, wenn das Ablehnen-Element des Consent-Banners mit der Tastatur nicht erreichbar ist.

## Was geprüft wird

Bevor privalint auf Ablehnen klickt, drückt es bis zu 60-mal die Tab-Taste, beginnend dort, wo die
Seite beim Laden den Fokus gesetzt hat, und hält fest, nach wie vielen Tastendrücken das Ablehnen-
und das Akzeptieren-Element den Fokus hatten. Fokus auf einem Element im Bedienelement oder auf
einem Button oder Link darum zählt mit. Der Fokus wird in iframes und offene Shadow Roots verfolgt.

Bekommt das Ablehnen-Element nie den Fokus, ist das eine `warning`, mit dem Element, seiner Rolle
und seinem tabindex sowie dem Tastendruck, der das Akzeptieren-Element fokussiert hat, als Beleg.
Typische Ursachen sind ein `<div>` oder `<span>` mit Klick-Handler, ein Link ohne `href` oder
`tabindex="-1"`.

Die Prüfung läuft auf der Startseite (und der ersten Seite jedes weiteren Hosts), sobald das Banner
ein Ablehnen-Element hat. Sie fügt der Consent-Prüfung höchstens 60 Tastendrücke hinzu.

## Warum

Eine Einwilligung muss freiwillig sein, und Ablehnen muss so einfach sein wie Zustimmen (Art. 4
Nr. 11 und Art. 7 Abs. 3 DSGVO). Ein Ablehnen-Element, das nur mit Maus oder Touch funktioniert,
lässt Tastatur- und Screenreader-Nutzern nur „Akzeptieren“ als Wahl. Auch das Barrierefreiheitsrecht
verlangt, dass jede Funktion mit der Tastatur bedienbar ist (EN 301 549 9.2.1.1,
WCAG 2.1 Erfolgskriterium 2.1.1).

- Art. 4 Nr. 11, Art. 7 Abs. 3 DSGVO; BFSG (Deutschland)
- Art. 4 Nr. 11, Art. 7 Abs. 3 DSGVO; BaFG (Österreich)
- Art. 6 Abs. 6 DSG (Schweiz, niedrigere Stufe)
- GDPR 4. cikk 11. pont, 7. cikk (3) bekezdés (Ungarn)
- Anhang I Richtlinie (EU) 2019/882

## Wie beheben

Für das Ablehnen-Element wie für den Akzeptieren-Button einen `<button>` verwenden. Muss es ein
anderes Element sein, `tabindex="0"` und `role="button"` setzen und Enter und Leertaste behandeln.
Es in der Tab-Reihenfolge des Banners halten und den Fokus nicht in einem Teil des Banners ohne es
festhalten.

## Grenzen

- Geprüft wird nur die Tab-Taste, keine Pfeiltasten in einem Widget und kein „Zum Banner
  springen“-Kürzel.
- Ein Banner, das beim Drücken von Tab den Fokus verschiebt (etwa indem es sich neu öffnet), kann
  falsch beurteilt werden.
- Ob das Element nach dem Fokussieren mit Enter oder Leertaste auslöst, wird nicht geprüft.
