import { type Lang, say, type Text } from '../i18n.js';
import type { Finding, TcfObservation } from '../types.js';

const SUBJECT = 'IAB TCF';

interface TcfFindingInput {
  tcf: TcfObservation;
  ruleId: string;
  pageUrl: string;
  lang: Lang;
  /** What the visitor did, completing "after …" (en) and "obwohl …" (de). */
  action: Text;
}

/**
 * What an IAB TCF consent manager itself reports after the visitor refused. Stored consent ignores
 * the refusal: an error. Legitimate interest alone is a warning, because TCF banners keep the
 * objection in a separate tab, and the law on it is less settled.
 */
export function tcfFindings({ tcf, ruleId, pageUrl, lang, action }: TcfFindingInput): Finding[] {
  const evidence = [
    `TCF purpose consents: ${tcf.purposesOn.join(', ') || '-'}`,
    `TCF vendor consents: ${tcf.vendorConsents}`,
    `TCF legitimate-interest purposes: ${tcf.legitimateInterestsOn.join(', ') || '-'}`,
    `TCF legitimate-interest vendors: ${tcf.vendorLegitimateInterests}`,
  ];
  const base = { ruleId, pageUrl, subject: SUBJECT, evidence };
  if (tcf.purposesOn.length > 0 || tcf.vendorConsents > 0) {
    return [
      {
        ...base,
        severity: 'error',
        message: say(lang, {
          en: `The consent manager still reports consent (IAB TCF) after ${action.en}.`,
          de: `Das Consent-Tool meldet weiterhin Einwilligungen (IAB TCF), obwohl ${action.de}.`,
          hu: `A hozzájárulás-kezelő ${action.hu} is hozzájárulást jelez (IAB TCF).`,
          fr: `Le gestionnaire de consentement indique encore un consentement (IAB TCF) après ${action.fr}.`,
          it: `Il gestore del consenso segnala ancora un consenso (IAB TCF) dopo ${action.it}.`,
          es: `El gestor de consentimiento sigue indicando consentimiento (IAB TCF) después de ${action.es}.`,
          pl: `Menedżer zgód nadal zgłasza zgodę (IAB TCF) po ${action.pl}.`,
        }),
        fix: say(lang, {
          en: 'Make sure the consent manager stores the refusal as shown. Consent for TCF purposes and vendors must be off after the visitor refused.',
          de: 'Sicherstellen, dass das Consent-Tool die Ablehnung so speichert, wie sie angezeigt wird. Einwilligungen für TCF-Zwecke und -Anbieter müssen nach einer Ablehnung aus sein.',
          hu: 'Gondoskodjon róla, hogy a hozzájárulás-kezelő az elutasítást úgy tárolja, ahogy megjelenik. Elutasítás után a TCF-célokra és -partnerekre vonatkozó hozzájárulásoknak kikapcsolva kell lenniük.',
          fr: "Vérifiez que le gestionnaire de consentement enregistre le refus tel qu'il est affiché. Le consentement aux finalités et aux fournisseurs TCF doit être désactivé après le refus du visiteur.",
          it: 'Assicurati che il gestore del consenso memorizzi il rifiuto come mostrato. Dopo il rifiuto del visitatore, il consenso per le finalità e i fornitori TCF deve essere disattivato.',
          es: 'Asegúrate de que el gestor de consentimiento guarde el rechazo tal como se muestra. Después de que el visitante rechace, el consentimiento para los fines y proveedores del TCF debe estar desactivado.',
          pl: 'Upewnij się, że menedżer zgód zapisuje odmowę tak, jak ją pokazano. Po odmowie odwiedzającego zgoda na cele i dostawców TCF musi być wyłączona.',
        }),
      },
    ];
  }
  if (tcf.legitimateInterestsOn.length > 0 || tcf.vendorLegitimateInterests > 0) {
    const purposes = tcf.legitimateInterestsOn.join(', ') || '-';
    return [
      {
        ...base,
        severity: 'warning',
        message: say(lang, {
          en: `After ${action.en}, the consent manager still processes data on the basis of legitimate interest (IAB TCF, purposes ${purposes}).`,
          de: `Obwohl ${action.de}, verarbeitet das Consent-Tool weiterhin Daten auf Grundlage berechtigten Interesses (IAB TCF, Zwecke ${purposes}).`,
          hu: `A hozzájárulás-kezelő ${action.hu} is jogos érdek alapján kezel adatokat (IAB TCF, célok: ${purposes}).`,
          fr: `Après ${action.fr}, le gestionnaire de consentement traite encore des données sur la base de l'intérêt légitime (IAB TCF, finalités ${purposes}).`,
          it: `Dopo ${action.it}, il gestore del consenso tratta ancora dati sulla base del legittimo interesse (IAB TCF, finalità ${purposes}).`,
          es: `Después de ${action.es}, el gestor de consentimiento sigue tratando datos sobre la base del interés legítimo (IAB TCF, fines ${purposes}).`,
          pl: `Po ${action.pl} menedżer zgód nadal przetwarza dane na podstawie prawnie uzasadnionego interesu (IAB TCF, cele ${purposes}).`,
        }),
        fix: say(lang, {
          en: 'Show the objection to legitimate interest on the same layer as the refusal, or switch legitimate interest off together with it. Check whether these purposes may rely on legitimate interest at all.',
          de: 'Den Widerspruch gegen berechtigtes Interesse auf derselben Ebene wie die Ablehnung anbieten oder ihn zusammen mit ihr abschalten. Prüfen, ob diese Zwecke überhaupt auf berechtigtes Interesse gestützt werden dürfen.',
          hu: 'A jogos érdek elleni tiltakozást kínálja fel ugyanazon a szinten, mint az elutasítást, vagy kapcsolja ki vele együtt. Vizsgálja meg, hogy ezek a célok egyáltalán alapulhatnak-e jogos érdeken.',
          fr: "Affichez l'opposition à l'intérêt légitime au même niveau que le refus, ou désactivez l'intérêt légitime en même temps. Vérifiez si ces finalités peuvent seulement reposer sur l'intérêt légitime.",
          it: "Mostra l'opposizione al legittimo interesse allo stesso livello del rifiuto, oppure disattiva il legittimo interesse insieme a esso. Verifica se queste finalità possono basarsi sul legittimo interesse.",
          es: 'Muestra la oposición al interés legítimo en la misma capa que el rechazo, o desactiva el interés legítimo junto con él. Comprueba si estos fines pueden basarse en el interés legítimo.',
          pl: 'Pokaż sprzeciw wobec prawnie uzasadnionego interesu na tej samej warstwie co odmowę albo wyłączaj prawnie uzasadniony interes razem z nią. Sprawdź, czy te cele w ogóle mogą opierać się na prawnie uzasadnionym interesie.',
        }),
      },
    ];
  }
  return [];
}
