import { say, type Text } from '../i18n.js';
import type { Rule } from '../types.js';

const ID = 'reject-option';

/**
 * Italy accepts a command such as an "X" that closes the banner and keeps the default settings as
 * the way to refuse (Garante privacy, cookie guidelines of 10.06.2021, § 7.1). Whether closing
 * really keeps trackers off is checked by trackers-after-close.
 */
const ITALIAN_CLOSE_NOTE: Text = {
  en: ' In Italy, an "X" that closes the banner and keeps only technical cookies also counts as refusal (Garante privacy, 10.06.2021, § 7.1); run privalint with --check-close to test one.',
  de: ' In Italien gilt auch ein „X“, das das Banner schließt und nur technische Cookies belässt, als Ablehnung (Garante privacy, 10.06.2021, § 7.1); privalint mit --check-close ausführen, um es zu prüfen.',
  hu: ' Olaszországban a bannert bezáró „X” is elutasításnak számít, ha csak a technikai sütik maradnak (Garante privacy, 2021.06.10., 7.1. pont); a vizsgálathoz futtassa a privalintet a --check-close kapcsolóval.',
  fr: ' En Italie, un « X » qui ferme le bandeau et ne conserve que les cookies techniques compte aussi comme un refus (Garante privacy, 10.06.2021, § 7.1) ; lancez privalint avec --check-close pour le tester.',
  it: ' In Italia anche una «X» che chiude il banner mantenendo solo i cookie tecnici vale come rifiuto (Garante privacy, 10.06.2021, § 7.1); esegui privalint con --check-close per verificarne una.',
  es: ' En Italia, una «X» que cierra el banner y mantiene solo las cookies técnicas también cuenta como rechazo (Garante privacy, 10.06.2021, § 7.1); ejecuta privalint con --check-close para probar una.',
  pl: ' We Włoszech także „X”, który zamyka baner i pozostawia tylko techniczne pliki cookie, liczy się jako odmowa (Garante privacy, 10.06.2021, § 7.1); uruchom privalint z --check-close, aby to sprawdzić.',
};

/** The close check ran, but found no "X" it could use or could not watch the page after it. */
const ITALIAN_CLOSE_NOT_USED: Text = {
  en: ' In Italy, an "X" that closes the banner and keeps only technical cookies also counts as refusal (Garante privacy, 10.06.2021, § 7.1); the close check found none it could use and fully observe, or trackers-after-close does not run to verify it.',
  de: ' In Italien gilt auch ein „X“, das das Banner schließt und nur technische Cookies belässt, als Ablehnung (Garante privacy, 10.06.2021, § 7.1); die Schließen-Prüfung fand keines, das sie benutzen und vollständig beobachten konnte, oder trackers-after-close läuft nicht, um es zu prüfen.',
  hu: ' Olaszországban a bannert bezáró „X” is elutasításnak számít, ha csak a technikai sütik maradnak (Garante privacy, 2021.06.10., 7.1. pont); a bezárás vizsgálata nem talált olyat, amelyet használni és teljesen megfigyelni tudott volna, vagy a trackers-after-close szabály nem fut, hogy ellenőrizze.',
  fr: " En Italie, un « X » qui ferme le bandeau et ne conserve que les cookies techniques compte aussi comme un refus (Garante privacy, 10.06.2021, § 7.1) ; le contrôle de fermeture n'en a trouvé aucun qu'il pouvait utiliser et observer entièrement, ou trackers-after-close ne s'exécute pas pour le vérifier.",
  it: ' In Italia anche una «X» che chiude il banner mantenendo solo i cookie tecnici vale come rifiuto (Garante privacy, 10.06.2021, § 7.1); il controllo di chiusura non ne ha trovata una utilizzabile e osservabile per intero, oppure trackers-after-close non viene eseguita per verificarlo.',
  es: ' En Italia, una «X» que cierra el banner y mantiene solo las cookies técnicas también cuenta como rechazo (Garante privacy, 10.06.2021, § 7.1); la comprobación de cierre no encontró ninguna que pudiera usar y observar por completo, o trackers-after-close no se ejecuta para verificarlo.',
  pl: ' We Włoszech także „X”, który zamyka baner i pozostawia tylko techniczne pliki cookie, liczy się jako odmowa (Garante privacy, 10.06.2021, § 7.1); kontrola zamknięcia nie znalazła takiego przycisku, którego mogłaby użyć i w pełni go zaobserwować, albo reguła trackers-after-close nie działa, by to zweryfikować.',
};

export const rejectOption: Rule = {
  id: ID,
  title: 'No supported reject control detected on the first layer of the banner',
  description:
    'Rejecting cookies must be as easy as accepting them. Most European regulators treat a banner ' +
    'that offers "accept" on its first layer, but hides "reject" in the settings or behind a ' +
    'link, as invalid consent.',
  references: [
    'EDPB Cookie Banner Taskforce report, 17.01.2023',
    'DSK-Beschluss, 22.03.2023: Bewertung von Pur-Abo-Modellen auf Websites',
    'EDPB Opinion 08/2024 on consent or pay models',
    'Art. 4(11) GDPR',
    '§ 25 Abs. 1 TDDDG',
  ],
  check({ page, lang, region, selectedRules }) {
    const consent = page.consent;
    if (
      consent?.bannerFound !== true ||
      consent.acceptLabel === undefined ||
      consent.rejectLabel !== undefined
    ) {
      return [];
    }
    // Only when the page after closing was fully observed, so trackers-after-close can judge it.
    if (
      region === 'it' &&
      consent.close?.outcome === 'closed' &&
      consent.close.afterCloseComplete !== false &&
      selectedRules?.has('trackers-after-close') === true
    ) {
      return [];
    }
    const vendor = consent.cmp === undefined ? '' : ` (${consent.cmp})`;
    const accept = consent.acceptLabel;
    const evidence = [
      say(lang, {
        en: `accept button: ${accept}`,
        de: `Zustimmen-Button: ${accept}`,
        hu: `elfogadás gomb: ${accept}`,
        fr: `bouton d'acceptation : « ${accept} »`,
        it: `pulsante di accettazione: «${accept}»`,
        es: `botón de aceptar: «${accept}»`,
        pl: `przycisk akceptacji: „${accept}”`,
      }),
    ];
    if (consent.payOrOk === true) {
      return [
        {
          ruleId: ID,
          severity: 'info',
          message: say(lang, {
            en: `The consent banner${vendor} offers "${accept}" or a subscription instead of a reject button ("pay or OK").`,
            de: `Das Cookie-Banner${vendor} bietet „${accept}“ oder ein Abo statt eines Ablehnen-Buttons (Pur-Abo-Modell).`,
            hu: `A sütibanner${vendor} „${accept}” mellett előfizetést kínál elutasítás gomb helyett („fizess vagy fogadd el”).`,
            fr: `Le bandeau de consentement${vendor} propose « ${accept} » ou un abonnement au lieu d'un bouton de refus (« payer ou accepter »).`,
            it: `Il banner del consenso${vendor} offre «${accept}» o un abbonamento invece di un pulsante di rifiuto («paga o accetta»).`,
            es: `El banner de consentimiento${vendor} ofrece «${accept}» o una suscripción en lugar de un botón de rechazo («pagar o aceptar»).`,
            pl: `Baner zgody${vendor} oferuje „${accept}” lub subskrypcję zamiast przycisku odrzucenia („zapłać lub zaakceptuj”).`,
          }),
          pageUrl: page.finalUrl,
          evidence,
          fix: say(lang, {
            en: 'German regulators consider pay-or-OK generally permissible if the paid option is an equivalent, fairly priced alternative (DSK, 22.03.2023). For large platforms the EDPB is much stricter (Opinion 08/2024). privalint cannot judge this; have it assessed legally.',
            de: 'Deutsche Aufsichtsbehörden halten Pur-Abo-Modelle grundsätzlich für zulässig, wenn das Bezahlangebot eine gleichwertige Alternative zu einem angemessenen Preis ist (DSK, 22.03.2023). Für große Plattformen ist der EDSA deutlich strenger (Stellungnahme 08/2024). privalint kann das nicht beurteilen; bitte rechtlich prüfen lassen.',
            hu: 'A német adatvédelmi hatóságok a „fizess vagy fogadd el” modellt általában megengedhetőnek tartják, ha a fizetős lehetőség egyenértékű, méltányos árú alternatíva (DSK, 2023.03.22.). Nagy platformokra az EDPB jóval szigorúbb (08/2024. sz. vélemény). A privalint ezt nem tudja megítélni; kérjen jogi értékelést.',
            fr: "Les autorités allemandes jugent le modèle « payer ou accepter » en principe admissible si l'option payante est une alternative équivalente à un prix raisonnable (DSK, 22.03.2023). Pour les grandes plateformes, le CEPD est bien plus strict (avis 08/2024). privalint ne peut pas en juger ; faites-le évaluer juridiquement.",
            it: "Le autorità tedesche ritengono il modello pay-or-OK in genere ammissibile se l'opzione a pagamento è un'alternativa equivalente e a prezzo equo (DSK, 22.03.2023). Per le grandi piattaforme l'EDPB è molto più severo (parere 08/2024). privalint non può valutarlo; fallo valutare legalmente.",
            es: 'Las autoridades alemanas consideran el modelo pay-or-OK en general admisible si la opción de pago es una alternativa equivalente y con un precio justo (DSK, 22.03.2023). Para las grandes plataformas, el CEPD es mucho más estricto (Dictamen 08/2024). privalint no puede valorarlo; haz que lo evalúe un profesional del derecho.',
            pl: 'Niemieckie organy nadzorcze uważają model pay-or-OK co do zasady za dopuszczalny, jeśli płatna opcja jest równoważną alternatywą w uczciwej cenie (DSK, 22.03.2023). W przypadku dużych platform EROD jest znacznie surowsza (opinia 08/2024). privalint nie może tego ocenić; zleć ocenę prawną.',
          }),
        },
      ];
    }
    return [
      {
        ruleId: ID,
        severity: 'warning',
        message: say(lang, {
          en: `The consent banner${vendor} offers "${accept}"; no supported first-layer reject control was detected. Verify the banner manually.`,
          de: `Das Cookie-Banner${vendor} bietet „${accept}“; eine unterstützte Ablehnen-Steuerung auf der ersten Ebene wurde nicht erkannt. Das Banner manuell prüfen.`,
          hu: `A sütibanner${vendor} „${accept}” lehetőséget kínál, de az első szinten nem található támogatott elutasítási lehetőség. Ellenőrizze a bannert kézzel.`,
          fr: `Le bandeau de consentement${vendor} propose « ${accept} » ; aucune commande de refus prise en charge n'a été détectée au premier niveau. Vérifiez le bandeau manuellement.`,
          it: `Il banner del consenso${vendor} offre «${accept}»; al primo livello non è stato rilevato alcun comando di rifiuto supportato. Verifica il banner manualmente.`,
          es: `El banner de consentimiento${vendor} ofrece «${accept}»; no se detectó ningún control de rechazo compatible en la primera capa. Comprueba el banner manualmente.`,
          pl: `Baner zgody${vendor} oferuje „${accept}”; na pierwszej warstwie nie wykryto obsługiwanego elementu odrzucenia. Sprawdź baner ręcznie.`,
        }),
        pageUrl: page.finalUrl,
        evidence,
        fix:
          say(lang, {
            en: 'Add a button such as "Alle ablehnen" or "Nur notwendige" on the first layer, with the same size and prominence as the accept button.',
            de: 'Einen Button wie „Alle ablehnen“ oder „Nur notwendige“ auf die erste Ebene setzen, gleich groß und gleich auffällig wie den Zustimmen-Button.',
            hu: 'Helyezzen el az első szinten egy „Az összes elutasítása” vagy „Csak a szükségesek” gombot, ugyanakkora méretben és ugyanolyan feltűnően, mint az elfogadás gombot.',
            fr: "Ajoutez au premier niveau un bouton comme « Tout refuser » ou « Continuer sans accepter », de même taille et aussi visible que le bouton d'acceptation.",
            it: 'Aggiungi al primo livello un pulsante come «Rifiuta tutto» o «Solo necessari», con la stessa dimensione ed evidenza del pulsante di accettazione.',
            es: 'Añade en la primera capa un botón como «Rechazar todo» o «Solo necesarias», con el mismo tamaño y la misma visibilidad que el botón de aceptar.',
            pl: 'Dodaj na pierwszej warstwie przycisk taki jak „Odrzuć wszystkie” lub „Tylko niezbędne”, o tej samej wielkości i widoczności co przycisk akceptacji.',
          }) +
          (region !== 'it'
            ? ''
            : say(lang, consent.close === undefined ? ITALIAN_CLOSE_NOTE : ITALIAN_CLOSE_NOT_USED)),
      },
    ];
  },
};
