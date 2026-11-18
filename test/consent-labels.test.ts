import { describe, expect, it } from 'vitest';
import { CONSENT_LABELS, isAcceptAll } from '../src/consent.js';

const matches = (pattern: RegExp, labels: readonly string[]) =>
  labels.filter((label) => !pattern.test(label));

describe('consent labels in French, Italian, Spanish, Dutch and Polish', () => {
  it('finds the accept and reject buttons of the first layer', () => {
    expect(
      matches(CONSENT_LABELS.accept, [
        "J'accepte",
        'Tout accepter',
        'Accetto',
        'Acconsento',
        'Aceptar todas',
        'Akkoord',
        'Akceptuję',
        'Zaakceptuj wszystkie',
        'Zgadzam się',
      ]),
    ).toEqual([]);
    expect(
      matches(CONSENT_LABELS.reject, [
        'Tout refuser',
        'Continuer sans accepter',
        'Rifiuta tutto',
        'Continua senza accettare',
        'Solo cookie necessari',
        'Rechazar todas',
        'Solo las necesarias',
        'Afwijzen',
        'Alleen noodzakelijke cookies',
        'Odrzuć wszystkie',
        'Tylko niezbędne',
        'Nie akceptuję',
      ]),
    ).toEqual([]);
    // A reject wording that contains an accept word is still a reject.
    expect(CONSENT_LABELS.reject.test('Continuar sin aceptar')).toBe(true);
  });

  it('finds the settings and save buttons of the second layer', () => {
    expect(
      matches(CONSENT_LABELS.openSettings, [
        'Personnaliser',
        'Personalizza',
        'Configuración',
        'Personalizar',
        'Voorkeuren aanpassen',
        'Ustawienia',
        'Dostosuj',
        'Więcej opcji',
      ]),
    ).toEqual([]);
    expect(
      matches(CONSENT_LABELS.save, [
        'Valider mes choix',
        'Enregistrer',
        'Salva le preferenze',
        'Conferma le scelte',
        'Accetta selezionati',
        'Guardar preferencias',
        'Aceptar selección',
        'Keuze opslaan',
        'Bevestig keuze',
        'Zapisz ustawienia',
        'Potwierdź wybór',
        'Akceptuj wybrane',
      ]),
    ).toEqual([]);
  });

  it('never takes "accept all" for saving the selection', () => {
    for (const label of [
      'Zaakceptuj wszystkie',
      'Accetta tutti',
      'Aceptar todos',
      'Tout accepter',
    ]) {
      expect(isAcceptAll(label)).toBe(true);
    }
    for (const label of ['Akceptuj wybrane', 'Zapisz wszystkie ustawienia', 'Aceptar selección']) {
      expect(isAcceptAll(label)).toBe(false);
    }
  });

  it('finds the link that reopens the settings', () => {
    expect(
      matches(CONSENT_LABELS.reopenSettings, [
        'Gestion des cookies',
        'Impostazioni cookie',
        'Gestisci i cookie',
        'Configuración de cookies',
        'Cookie-instellingen',
        'Ustawienia plików cookie',
        'Zarządzaj cookies',
      ]),
    ).toEqual([]);
  });

  it('recognises consent wording without taking "zgodnie" for consent', () => {
    expect(CONSENT_LABELS.context.test('Wyrażam zgodę na pliki cookie')).toBe(true);
    expect(CONSENT_LABELS.context.test('Używamy ciasteczek')).toBe(true);
    expect(CONSENT_LABELS.context.test('Zgodnie z regulaminem')).toBe(false);
  });
});
