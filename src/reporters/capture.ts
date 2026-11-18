import { decimal, type Lang, plPlural, say, type Text } from '../i18n.js';
import type { AdapterTiming, RuleExplanation, ScanResult } from '../types.js';

export function isPartial(result: ScanResult): boolean {
  return (
    result.coverage === 'partial' ||
    result.pages.some(
      (page) =>
        page.error !== undefined ||
        page.capture?.complete === false ||
        (page.status !== null && page.status >= 400),
    )
  );
}

export function coverageMessage(result: ScanResult): string {
  return say(result.lang, {
    en: 'Observation incomplete. No findings does not mean a complete check; the reject path may be untested.',
    de: 'Erfassung unvollständig. Keine Befunde bedeutet hier keine vollständige Prüfung; der Ablehnen-Pfad kann ungeprüft sein.',
    hu: 'A megfigyelés hiányos. A megállapítások hiánya itt nem jelent teljes ellenőrzést; az elutasítás ellenőrizetlen lehet.',
    fr: "Observation incomplète. L'absence de constat ne signifie pas un contrôle complet ; le refus n'a peut-être pas été testé.",
    it: "Osservazione incompleta. L'assenza di rilievi non significa un controllo completo; il rifiuto potrebbe non essere stato testato.",
    es: 'Observación incompleta. Que no haya hallazgos no significa una comprobación completa; puede que el rechazo no se haya probado.',
    pl: 'Obserwacja niepełna. Brak ustaleń nie oznacza pełnej kontroli; odrzucenie mogło nie zostać przetestowane.',
  });
}

const LABELS = {
  capture: {
    en: 'Capture',
    de: 'Erfassung',
    hu: 'Rögzítés',
    fr: 'Capture',
    it: 'Acquisizione',
    es: 'Captura',
    pl: 'Rejestracja',
  },
  requests: {
    en: 'requests',
    de: 'Anfragen',
    hu: 'kérés',
    fr: 'requêtes',
    it: 'richieste',
    es: 'solicitudes',
    pl: 'żądania',
  },
  responses: {
    en: 'responses',
    de: 'Antworten',
    hu: 'válasz',
    fr: 'réponses',
    it: 'risposte',
    es: 'respuestas',
    pl: 'odpowiedzi',
  },
  failures: {
    en: 'load failures',
    de: 'Ladefehler',
    hu: 'betöltési hiba',
    fr: 'échecs de chargement',
    it: 'errori di caricamento',
    es: 'errores de carga',
    pl: 'błędy ładowania',
  },
  skipped: {
    en: 'skipped',
    de: 'ausgelassen',
    hu: 'kihagyva',
    fr: 'ignorées',
    it: 'saltate',
    es: 'omitidas',
    pl: 'pominięte',
  },
  blocks: {
    en: 'security blocks',
    de: 'Sicherheitsblockaden',
    hu: 'biztonsági blokkolás',
    fr: 'blocages de sécurité',
    it: 'blocchi di sicurezza',
    es: 'bloqueos de seguridad',
    pl: 'blokady bezpieczeństwa',
  },
  httpErrors: {
    en: 'errors',
    de: 'Fehlerantworten',
    hu: 'hibaválasz',
    fr: 'erreurs',
    it: 'errori',
    es: 'errores',
    pl: 'błędy',
  },
  dropped: {
    en: 'additional issue details omitted',
    de: 'weitere Diagnosen nicht gespeichert',
    hu: 'további diagnosztikai adat nincs eltárolva',
    fr: 'autres détails omis',
    it: 'altri dettagli omessi',
    es: 'otros detalles omitidos',
    pl: 'pozostałe szczegóły pominięto',
  },
  partial: {
    en: ' [partial]',
    de: ' [eingeschränkt]',
    hu: ' [korlátozott]',
    fr: ' [partiel]',
    it: ' [parziale]',
    es: ' [parcial]',
    pl: ' [częściowo]',
  },
} satisfies Record<string, Text>;

/** Technical observations are reported separately from privacy findings. */
export function captureLines(result: ScanResult): string[] {
  const lang = result.lang;
  const t = (key: keyof typeof LABELS) => say(lang, LABELS[key]);
  const lines: string[] = [];
  for (const page of result.pages) {
    const data = page.capture?.diagnostics;
    if (data !== undefined) {
      lines.push(
        `${t('capture')} ${page.url}${page.pageId ? ` [${page.pageId}]` : ''}: ` +
          `${data.requests} ${t('requests')}, ${data.responses} ${t('responses')}, ` +
          `${data.failedRequests ?? data.failed} ${t('failures')}, ` +
          `${data.skippedRequests ?? 0} ${t('skipped')}, ` +
          `${data.securityBlockedRequests ?? data.blocked} ${t('blocks')}, ` +
          `${data.httpErrors} HTTP ${t('httpErrors')}.`,
      );
      for (const issue of data.issues) {
        lines.push(
          `  ${issue.phase}: ${issue.kind}${issue.skippedReason ? ` (${issue.skippedReason})` : ''}${issue.limit ? ` (${issue.limit})` : ''}${issue.status ? ` HTTP ${issue.status}` : ''} ${issue.url}`,
        );
      }
      const adapter = data.timing?.adapter;
      if (adapter !== undefined && data.issues.some((issue) => issue.kind === 'timeout')) {
        lines.push(`  ${adapterLine(adapter, lang)}`);
      }
      if (data.dropped) lines.push(`  ${data.dropped} ${t('dropped')}.`);
    }
    for (const evaluation of page.ruleEvaluations ?? []) {
      lines.push(
        `  ${evaluation.ruleId}: ${evaluation.outcome ? outcomeLabel(evaluation.outcome, lang) : evaluation.status} (${evaluation.explanation ? say(lang, EXPLANATIONS[evaluation.explanation]) : (evaluation.reason ?? 'legacy-report')})${evaluation.partial ? t('partial') : ''}`,
      );
    }
  }
  return lines;
}

/** Where the adapter's time went, shown on pages with timeouts so slow adapters stand out. */
function adapterLine(adapter: AdapterTiming, lang: Lang): string {
  const seconds = (ms: number) => `${decimal(ms / 1000, lang, 1)} s`;
  const p50 = seconds(adapter.headersP50Ms ?? 0);
  const p95 = seconds(adapter.headersP95Ms ?? 0);
  const slow = adapter.slowest[0];
  const parts = [
    say(lang, {
      en: `Adapter: ${adapter.requests} requests, headers after ${p50} (median), ${p95} (95th percentile)`,
      de: `Adapter: ${adapter.requests} Anfragen, Antwortkopf nach ${p50} (Median), ${p95} (95 %)`,
      hu: `Adapter: ${adapter.requests} kérés, válaszfejléc ${p50} után (medián), ${p95} (95. percentilis)`,
      fr: `Adaptateur : ${adapter.requests} requêtes, en-têtes après ${p50} (médiane), ${p95} (95e centile)`,
      it: `Adattatore: ${adapter.requests} richieste, intestazioni dopo ${p50} (mediana), ${p95} (95° percentile)`,
      es: `Adaptador: ${adapter.requests} solicitudes, cabeceras tras ${p50} (mediana), ${p95} (percentil 95)`,
      pl: `Adapter: ${adapter.requests} ${plPlural(adapter.requests, 'żądanie', 'żądania', 'żądań')}, nagłówki po ${p50} (mediana), ${p95} (95. percentyl)`,
    }),
  ];
  if (slow !== undefined) {
    const headers =
      slow.headersMs === undefined
        ? say(lang, {
            en: 'no headers',
            de: 'kein Antwortkopf',
            hu: 'nincs válaszfejléc',
            fr: "pas d'en-têtes",
            it: 'nessuna intestazione',
            es: 'sin cabeceras',
            pl: 'brak nagłówków',
          })
        : `${say(lang, { en: 'headers', de: 'Antwortkopf', hu: 'válaszfejléc', fr: 'en-têtes', it: 'intestazioni', es: 'cabeceras', pl: 'nagłówki' })} ${seconds(slow.headersMs)}`;
    parts.push(
      say(lang, {
        en: `slowest ${slow.url}: queued ${seconds(slow.queuedMs)}, ${headers}`,
        de: `langsamste ${slow.url}: wartete ${seconds(slow.queuedMs)}, ${headers}`,
        hu: `leglassabb ${slow.url}: várakozott ${seconds(slow.queuedMs)}, ${headers}`,
        fr: `la plus lente ${slow.url} : en attente ${seconds(slow.queuedMs)}, ${headers}`,
        it: `la più lenta ${slow.url}: in coda ${seconds(slow.queuedMs)}, ${headers}`,
        es: `la más lenta ${slow.url}: en cola ${seconds(slow.queuedMs)}, ${headers}`,
        pl: `najwolniejsze ${slow.url}: w kolejce ${seconds(slow.queuedMs)}, ${headers}`,
      }),
    );
  }
  return parts.join('; ');
}

function outcomeLabel(outcome: string, lang: Lang): string {
  if (outcome === 'finding-detected') {
    return say(lang, {
      en: 'Finding detected',
      de: 'Befund erkannt',
      hu: 'Megállapítás',
      fr: 'Constat détecté',
      it: 'Rilievo riscontrato',
      es: 'Hallazgo detectado',
      pl: 'Wykryto problem',
    });
  }
  if (outcome === 'checked-no-finding') {
    return say(lang, {
      en: 'Checked, no finding',
      de: 'Geprüft, kein Befund',
      hu: 'Ellenőrizve, nincs megállapítás',
      fr: 'Vérifié, aucun constat',
      it: 'Verificato, nessun rilievo',
      es: 'Comprobado, sin hallazgos',
      pl: 'Sprawdzono, brak problemów',
    });
  }
  return say(lang, {
    en: 'Not evaluable',
    de: 'Nicht prüfbar',
    hu: 'Nem értékelhető',
    fr: 'Non évaluable',
    it: 'Non valutabile',
    es: 'No evaluable',
    pl: 'Nie do oceny',
  });
}

const EXPLANATIONS: Record<RuleExplanation, Text> = {
  'unsupported-banner-markup': {
    en: 'Consent UI detected, controls unsupported',
    de: 'Consent-Oberfläche erkannt, Steuerung nicht unterstützt',
    hu: 'Hozzájárulási felület felismerve, a vezérlők nem támogatottak',
    fr: 'Interface de consentement détectée, commandes non prises en charge',
    it: 'Interfaccia del consenso rilevata, comandi non supportati',
    es: 'Interfaz de consentimiento detectada, controles no compatibles',
    pl: 'Wykryto interfejs zgody, nieobsługiwane elementy sterujące',
  },
  disabled: {
    en: 'Rule disabled',
    de: 'Regel deaktiviert',
    hu: 'Szabály kikapcsolva',
    fr: 'Règle désactivée',
    it: 'Regola disattivata',
    es: 'Regla desactivada',
    pl: 'Reguła wyłączona',
  },
  'not-start-page': {
    en: 'Consent tested only on the start page',
    de: 'Consent wird nur auf der Startseite geprüft',
    hu: 'A hozzájárulás csak a kezdőlapon van ellenőrizve',
    fr: "Consentement testé uniquement sur la page d'accueil",
    it: 'Consenso testato solo sulla pagina iniziale',
    es: 'Consentimiento probado solo en la página de inicio',
    pl: 'Zgodę sprawdzono tylko na stronie startowej',
  },
  'consent-disabled': {
    en: 'Consent check disabled',
    de: 'Consent-Prüfung ausgeschaltet',
    hu: 'Hozzájárulás-ellenőrzés kikapcsolva',
    fr: 'Contrôle du consentement désactivé',
    it: 'Controllo del consenso disattivato',
    es: 'Comprobación del consentimiento desactivada',
    pl: 'Kontrola zgody wyłączona',
  },
  'no-consent-needed': {
    en: 'No banner, and nothing that needs consent loaded',
    de: 'Kein Banner, und nichts Einwilligungspflichtiges geladen',
    hu: 'Nincs banner, és semmi hozzájárulásköteles nem töltődött be',
    fr: 'Aucun bandeau, et rien de chargé qui nécessite un consentement',
    it: 'Nessun banner e nulla di caricato che richieda il consenso',
    es: 'Ningún banner, y no se cargó nada que requiera consentimiento',
    pl: 'Brak banera i nie załadowano niczego, co wymaga zgody',
  },
  'missing-reject-observation': {
    en: 'Reject path not observed',
    de: 'Ablehnen-Pfad nicht beobachtet',
    hu: 'Az elutasítás nincs megfigyelve',
    fr: 'Refus non observé',
    it: 'Rifiuto non osservato',
    es: 'Rechazo no observado',
    pl: 'Nie zaobserwowano odrzucenia',
  },
  'settings-check-disabled': {
    en: 'Settings check not enabled (--check-settings)',
    de: 'Einstellungs-Prüfung nicht eingeschaltet (--check-settings)',
    hu: 'A beállítások ellenőrzése nincs bekapcsolva (--check-settings)',
    fr: 'Contrôle des paramètres non activé (--check-settings)',
    it: 'Controllo delle impostazioni non attivato (--check-settings)',
    es: 'Comprobación de la configuración no activada (--check-settings)',
    pl: 'Kontrola ustawień niewłączona (--check-settings)',
  },
  'transport-not-checked': {
    en: 'Not checked with a network adapter or offline',
    de: 'Mit Netzwerk-Adapter oder offline nicht geprüft',
    hu: 'Hálózati adapterrel vagy offline nincs ellenőrizve',
    fr: 'Non vérifié avec un adaptateur réseau ou hors ligne',
    it: 'Non verificato con un adattatore di rete o offline',
    es: 'No comprobado con un adaptador de red o sin conexión',
    pl: 'Nie sprawdzono z adapterem sieciowym ani offline',
  },
  'missing-settings-observation': {
    en: 'Settings path not observed',
    de: 'Einstellungs-Pfad nicht beobachtet',
    hu: 'A beállítások útvonala nincs megfigyelve',
    fr: 'Parcours des paramètres non observé',
    it: 'Percorso delle impostazioni non osservato',
    es: 'Recorrido de la configuración no observado',
    pl: 'Nie zaobserwowano ścieżki ustawień',
  },
  'no-settings-control': {
    en: 'No control found that opens the settings',
    de: 'Kein Bedienelement gefunden, das die Einstellungen öffnet',
    hu: 'Nem található a beállításokat megnyitó vezérlő',
    fr: 'Aucune commande trouvée pour ouvrir les paramètres',
    it: 'Nessun comando trovato che apra le impostazioni',
    es: 'No se encontró ningún control que abra la configuración',
    pl: 'Nie znaleziono elementu otwierającego ustawienia',
  },
  'no-save-control': {
    en: 'Settings opened, but no save button found',
    de: 'Einstellungen geöffnet, aber keine Speichern-Schaltfläche gefunden',
    hu: 'A beállítások megnyíltak, de nem található mentés gomb',
    fr: "Paramètres ouverts, mais aucun bouton d'enregistrement trouvé",
    it: 'Impostazioni aperte, ma nessun pulsante di salvataggio trovato',
    es: 'Configuración abierta, pero no se encontró ningún botón de guardar',
    pl: 'Ustawienia otwarte, ale nie znaleziono przycisku zapisu',
  },
  'settings-saved-and-reloaded': {
    en: 'Settings saved with everything off and reloaded',
    de: 'Einstellungen ohne Auswahl gespeichert und neu geladen',
    hu: 'Beállítások mindent kikapcsolva mentve, oldal újratöltve',
    fr: 'Paramètres enregistrés avec tout désactivé, puis page rechargée',
    it: 'Impostazioni salvate con tutto disattivato e pagina ricaricata',
    es: 'Configuración guardada con todo desactivado y página recargada',
    pl: 'Ustawienia zapisane z wszystkim wyłączonym, strona przeładowana',
  },
  'banner-not-shown': {
    en: 'The banner did not appear in the second, fresh browser',
    de: 'Das Banner erschien im zweiten, frischen Browser nicht',
    hu: 'A banner nem jelent meg a második, friss böngészőben',
    fr: "Le bandeau n'est pas apparu dans le second navigateur, vierge",
    it: 'Il banner non è comparso nel secondo browser, avviato da zero',
    es: 'El banner no apareció en el segundo navegador, iniciado de cero',
    pl: 'Baner nie pojawił się w drugiej, świeżo uruchomionej przeglądarce',
  },
  'missing-consent-observation': {
    en: 'Consent not observed',
    de: 'Consent nicht beobachtet',
    hu: 'A hozzájárulás nincs megfigyelve',
    fr: 'Consentement non observé',
    it: 'Consenso non osservato',
    es: 'Consentimiento no observado',
    pl: 'Nie zaobserwowano zgody',
  },
  'incomplete-document': {
    en: 'Document observation incomplete',
    de: 'Dokument nicht vollständig beobachtet',
    hu: 'A dokumentum megfigyelése hiányos',
    fr: 'Observation du document incomplète',
    it: 'Osservazione del documento incompleta',
    es: 'Observación del documento incompleta',
    pl: 'Obserwacja dokumentu niepełna',
  },
  'positive-evidence': {
    en: 'Positive evidence observed',
    de: 'Positive Evidenz beobachtet',
    hu: 'Pozitív bizonyíték megfigyelve',
    fr: 'Preuve positive observée',
    it: 'Prova positiva osservata',
    es: 'Prueba positiva observada',
    pl: 'Zaobserwowano dowód pozytywny',
  },
  'incomplete-observation': {
    en: 'Observation incomplete; absence cannot be established',
    de: 'Beobachtung unvollständig; Abwesenheit nicht feststellbar',
    hu: 'A megfigyelés hiányos; a hiány nem állapítható meg',
    fr: "Observation incomplète ; l'absence ne peut pas être établie",
    it: "Osservazione incompleta; l'assenza non può essere accertata",
    es: 'Observación incompleta; no se puede establecer la ausencia',
    pl: 'Obserwacja niepełna; nie można ustalić braku',
  },
  'required-observations-available': {
    en: 'Required observations available',
    de: 'Erforderliche Beobachtungen vorhanden',
    hu: 'A szükséges megfigyelések rendelkezésre állnak',
    fr: 'Observations requises disponibles',
    it: 'Osservazioni necessarie disponibili',
    es: 'Observaciones necesarias disponibles',
    pl: 'Wymagane obserwacje dostępne',
  },
  'no-supported-banner': {
    en: 'No banner detected',
    de: 'Kein Banner erkannt',
    hu: 'Nem található banner',
    fr: 'Aucun bandeau détecté',
    it: 'Nessun banner rilevato',
    es: 'No se detectó ningún banner',
    pl: 'Nie wykryto banera',
  },
  'no-supported-reject-control': {
    en: 'No supported reject control detected',
    de: 'Keine unterstützte Ablehnen-Steuerung erkannt',
    hu: 'Nem található támogatott elutasítási vezérlő',
    fr: 'Aucune commande de refus prise en charge détectée',
    it: 'Nessun comando di rifiuto supportato rilevato',
    es: 'No se detectó ningún control de rechazo compatible',
    pl: 'Nie wykryto obsługiwanego elementu odrzucenia',
  },
  'browser-interaction-failed': {
    en: 'Consent interaction failed',
    de: 'Consent-Interaktion fehlgeschlagen',
    hu: 'A hozzájárulási művelet sikertelen',
    fr: "L'interaction avec le consentement a échoué",
    it: 'Interazione con il consenso non riuscita',
    es: 'La interacción con el consentimiento falló',
    pl: 'Interakcja ze zgodą nie powiodła się',
  },
  'no-linked-page': {
    en: 'The start page links no such page on this site',
    de: 'Die Startseite verlinkt keine solche Seite auf dieser Website',
    hu: 'A kezdőlap nem hivatkozik ilyen oldalra ezen a webhelyen',
    fr: "La page d'accueil ne renvoie vers aucune page de ce type sur ce site",
    it: 'La pagina iniziale non rimanda a una pagina di questo tipo su questo sito',
    es: 'La página de inicio no enlaza ninguna página de este tipo en este sitio',
    pl: 'Strona startowa nie zawiera linku do takiej strony w tej witrynie',
  },
  'linked-page-not-loaded': {
    en: 'The linked page could not be loaded',
    de: 'Die verlinkte Seite ließ sich nicht laden',
    hu: 'A hivatkozott oldal nem tölthető be',
    fr: "La page liée n'a pas pu être chargée",
    it: 'Non è stato possibile caricare la pagina collegata',
    es: 'No se pudo cargar la página enlazada',
    pl: 'Nie udało się załadować podlinkowanej strony',
  },
  'gpc-check-disabled': {
    en: 'Global Privacy Control check not enabled (--gpc)',
    de: 'Global-Privacy-Control-Prüfung nicht eingeschaltet (--gpc)',
    hu: 'A Global Privacy Control ellenőrzése nincs bekapcsolva (--gpc)',
    fr: 'Contrôle Global Privacy Control non activé (--gpc)',
    it: 'Controllo Global Privacy Control non attivato (--gpc)',
    es: 'Comprobación de Global Privacy Control no activada (--gpc)',
    pl: 'Kontrola Global Privacy Control niewłączona (--gpc)',
  },
  'missing-gpc-observation': {
    en: 'Start page not observed with Global Privacy Control',
    de: 'Startseite nicht mit Global Privacy Control beobachtet',
    hu: 'A kezdőlap nem lett Global Privacy Control mellett megfigyelve',
    fr: "Page d'accueil non observée avec Global Privacy Control",
    it: 'Pagina iniziale non osservata con Global Privacy Control',
    es: 'Página de inicio no observada con Global Privacy Control',
    pl: 'Strony startowej nie zaobserwowano z Global Privacy Control',
  },
  'gpc-sent': {
    en: 'Start page loaded with Global Privacy Control',
    de: 'Startseite mit Global Privacy Control geladen',
    hu: 'A kezdőlap Global Privacy Control mellett betöltve',
    fr: "Page d'accueil chargée avec Global Privacy Control",
    it: 'Pagina iniziale caricata con Global Privacy Control',
    es: 'Página de inicio cargada con Global Privacy Control',
    pl: 'Strona startowa załadowana z Global Privacy Control',
  },
  'close-check-disabled': {
    en: 'Close-button check not enabled (--check-close)',
    de: 'Schließen-Prüfung nicht eingeschaltet (--check-close)',
    hu: 'A bezárásgomb ellenőrzése nincs bekapcsolva (--check-close)',
    fr: 'Contrôle du bouton de fermeture non activé (--check-close)',
    it: 'Controllo del pulsante di chiusura non attivato (--check-close)',
    es: 'Comprobación del botón de cierre no activada (--check-close)',
    pl: 'Kontrola przycisku zamknięcia niewłączona (--check-close)',
  },
  'missing-close-observation': {
    en: 'Close path not observed',
    de: 'Schließen-Pfad nicht beobachtet',
    hu: 'A bezárás útvonala nincs megfigyelve',
    fr: 'Fermeture non observée',
    it: 'Percorso di chiusura non osservato',
    es: 'Recorrido de cierre no observado',
    pl: 'Nie zaobserwowano ścieżki zamknięcia',
  },
  'no-close-control': {
    en: 'No close button found in the banner',
    de: 'Keine Schließen-Schaltfläche im Banner gefunden',
    hu: 'Nem található bezárás gomb a bannerben',
    fr: 'Aucun bouton de fermeture trouvé dans le bandeau',
    it: 'Nessun pulsante di chiusura trovato nel banner',
    es: 'No se encontró ningún botón de cierre en el banner',
    pl: 'Nie znaleziono przycisku zamknięcia na banerze',
  },
  'banner-closed-and-reloaded': {
    en: 'Banner closed and page reloaded',
    de: 'Banner geschlossen und Seite neu geladen',
    hu: 'Banner bezárva, oldal újratöltve',
    fr: 'Bandeau fermé et page rechargée',
    it: 'Banner chiuso e pagina ricaricata',
    es: 'Banner cerrado y página recargada',
    pl: 'Baner zamknięty, strona przeładowana',
  },
  'reject-clicked-and-reloaded': {
    en: 'Reject clicked and page reloaded',
    de: 'Ablehnen geklickt und Seite neu geladen',
    hu: 'Elutasítás megnyomva, oldal újratöltve',
    fr: 'Refus cliqué et page rechargée',
    it: 'Rifiuto cliccato e pagina ricaricata',
    es: 'Rechazo pulsado y página recargada',
    pl: 'Kliknięto odrzucenie, strona przeładowana',
  },
};
