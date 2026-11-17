import { describe, expect, it } from 'vitest';
import type { Region } from '../src/legal.js';
import { hasAddress } from '../src/rules/contact-details.js';
import { legalNoticeContent } from '../src/rules/legal-notice-content.js';
import { preConsentTrackers } from '../src/rules/pre-consent-trackers.js';
import { rejectOption } from '../src/rules/reject-option.js';
import { thirdCountryProviders } from '../src/rules/third-country-providers.js';
import { trackersAfterClose } from '../src/rules/trackers-after-close.js';
import { trackersAfterReject } from '../src/rules/trackers-after-reject.js';
import { withdrawalButton } from '../src/rules/withdrawal-button.js';
import type { PageSnapshot, Rule } from '../src/types.js';
import { request, SITE, snapshot } from './helpers.js';

const run = (rule: Rule, page: PageSnapshot, region: Region) =>
  rule.check({ siteUrl: SITE, page, lang: 'en', region });

const analytics = 'https://www.google-analytics.com/g/collect?v=2&tid=G-0000000000';
const advertising = 'https://connect.facebook.net/en_US/fbevents.js';

describe('analytics exempt from consent under conditions', () => {
  it.each([
    ['uk', 'PECR Sch. A1 para. 5'],
    ['fr', 'CNIL, délibération n° 2020-091'],
    ['it', 'Garante privacy'],
    ['nl', 'Art. 11.7a lid 3 sub b Tw'],
  ] as const)(
    'makes analytics before consent a warning in %s and names the conditions',
    (region, source) => {
      const [finding] = run(
        preConsentTrackers,
        snapshot({ requests: [request(analytics)] }),
        region,
      );
      expect(finding?.severity).toBe('warning');
      expect(finding?.fix).toContain(source);
      expect(finding?.fix).toContain('privalint cannot check');
    },
  );

  it('keeps analytics an error elsewhere and advertising an error everywhere', () => {
    const page = snapshot({ requests: [request(analytics), request(advertising)] });
    expect(run(preConsentTrackers, page, 'de').map((finding) => finding.severity)).toEqual([
      'error',
      'error',
    ]);
    const uk = run(preConsentTrackers, page, 'uk');
    expect(uk.find((finding) => finding.subject === 'Meta Pixel')?.severity).toBe('error');
    for (const region of ['es', 'pl'] as const) {
      expect(run(preConsentTrackers, page, region).map((finding) => finding.severity)).toEqual([
        'error',
        'error',
      ]);
    }
  });

  it('keeps a Google Consent Mode "granted" state before any choice an error', () => {
    const [finding] = run(
      preConsentTrackers,
      snapshot({ requests: [request(`${analytics}&gcs=G111`)] }),
      'uk',
    );
    expect(finding?.severity).toBe('error');
  });

  const after = { requests: [request(analytics)], cookies: [], storage: [] };
  const consent = { bannerFound: true, rejectLabel: 'Reject all' } as const;

  it('treats closing the banner like no objection, but rejecting as one', () => {
    const closed = snapshot({
      consent: {
        ...consent,
        rejected: false,
        close: {
          outcome: 'closed',
          reason: 'banner-closed-and-reloaded',
          closeLabel: '×',
          afterClose: after,
        },
      },
    });
    expect(run(trackersAfterClose, closed, 'uk')[0]?.severity).toBe('warning');
    const rejected = snapshot({ consent: { ...consent, rejected: true, afterReject: after } });
    expect(run(trackersAfterReject, rejected, 'uk')[0]?.severity).toBe('error');
    expect(run(trackersAfterReject, rejected, 'fr')[0]?.severity).toBe('error');
  });
});

describe('French legal notice', () => {
  const notice = (text: string) =>
    snapshot({ legalNotice: { url: 'https://example.fr/mentions-legales', text, mailto: true } });
  const complete =
    'Exemple SAS, capital de 10 000 €, RCS Paris 123 456 789\n12 bis, rue de la Paix\n75002 Paris\ncontact@example.fr';

  it('reads a French address and register', () => {
    expect(hasAddress('12 bis, rue de la Paix\n75002 Paris')).toBe(true);
    expect(hasAddress('3 avenue des Champs-Élysées 75008 Paris')).toBe(true);
    expect(run(legalNoticeContent, notice(complete), 'de')).toEqual([]);
  });

  it('asks for the host and the publication director with --region fr', () => {
    const findings = run(legalNoticeContent, notice(complete), 'fr');
    expect(findings).toEqual([
      expect.objectContaining({
        subject: 'publisher-details',
        severity: 'info',
        message: 'The legal notice does not name the host (hébergeur) or the publication director.',
      }),
    ]);
    const full = `${complete}\nDirecteur de la publication : Jean Dupont\nHébergeur : OVH SAS, 2 rue Kellermann, 59100 Roubaix`;
    expect(run(legalNoticeContent, notice(full), 'fr')).toEqual([]);
  });

  it('reads the provider part of a line that also names the host', () => {
    const shared = [
      'Éditeur : Exemple SARL - Hébergeur : OVH SAS',
      '3 av. Victor Hugo',
      '75016 Paris',
      'contact@example.fr',
    ].join('\n');
    expect(hasAddress('3 av. Victor Hugo\n75016 Paris')).toBe(true);
    expect(run(legalNoticeContent, notice(shared), 'de')).toEqual([
      expect.objectContaining({ subject: 'register', message: expect.stringContaining('SARL') }),
    ]);
  });

  it("does not take the host's legal form for the provider's", () => {
    const individual =
      'Jean Dupont\n12 rue de la Paix\n75002 Paris\ncontact@example.fr\nHébergeur : OVH SAS, Roubaix';
    expect(
      run(legalNoticeContent, notice(individual), 'de').filter(
        (finding) => finding.subject === 'register',
      ),
    ).toEqual([]);
  });
});

describe('withdrawal button in France', () => {
  it('accepts the label French law prescribes', () => {
    const page = snapshot({
      links: [
        { text: 'Panier', href: 'https://example.fr/panier' },
        { text: 'Renoncer au contrat ici', href: 'https://example.fr/retractation' },
      ],
    });
    expect(run(withdrawalButton, page, 'fr')).toEqual([]);
  });
});

describe('withdrawal button in the Netherlands and Poland', () => {
  it.each([
    ['nl', 'Overeenkomst hier ontbinden'],
    ['pl', 'Odstąp od umowy'],
  ] as const)('accepts the %s label', (region, text) => {
    const page = snapshot({
      links: [
        { text: 'Cart', href: 'https://example.eu/cart' },
        { text, href: 'https://example.eu/withdraw' },
      ],
    });
    expect(run(withdrawalButton, page, region)).toEqual([]);
  });
});

describe('legal notice details in Italy, Spain and Poland', () => {
  const notice = (text: string) =>
    snapshot({ legalNotice: { url: 'https://example.eu/note-legali', text, mailto: true } });
  const details = (region: Region, text: string) =>
    run(legalNoticeContent, notice(text), region).filter(
      (finding) => finding.subject !== 'contact',
    );

  it('asks an Italian company for its partita IVA', () => {
    const base = 'Esempio S.r.l.\nVia Roma 1\n00100 Roma\nRegistro Imprese di Roma, REA RM-123456';
    expect(details('it', base)).toEqual([
      expect.objectContaining({
        subject: 'tax-number',
        severity: 'info',
        message: expect.stringContaining('partita IVA'),
      }),
    ]);
    expect(details('it', `${base}\nP.IVA 01234567890`)).toEqual([]);
    expect(details('it', `${base}\nVAT number 01234567890`)).toEqual([]);
    expect(details('it', `${base}\nPrices include VAT.`)).toHaveLength(1);
    expect(details('de', base)).toEqual([]);
  });

  it('asks a Spanish company for its NIF', () => {
    const base = 'Ejemplo S.L.\nCalle Mayor 1\n28013 Madrid\nRegistro Mercantil de Madrid, tomo 1';
    expect(details('es', base)).toEqual([
      expect.objectContaining({ subject: 'tax-number', message: expect.stringContaining('NIF') }),
    ]);
    expect(details('es', `${base}\nNIF B12345678`)).toEqual([]);
    expect(details('es', `${base}\nB-12345678`)).toEqual([]);
  });

  it('asks a Polish company for KRS, NIP and share capital', () => {
    const base = 'Przykład sp. z o.o.\nul. Marszałkowska 1\n00-001 Warszawa';
    expect(details('pl', base)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: 'company-details',
          message: expect.stringContaining('KRS number, NIP or share capital'),
        }),
      ]),
    );
    const full = `${base}\nSąd Rejonowy dla m.st. Warszawy, KRS 0000123456\nNIP 1234567890\nKapitał zakładowy 5 000 zł`;
    expect(details('pl', full)).toEqual([]);
  });

  it('reads the new legal forms and registers', () => {
    for (const company of ['Voorbeeld B.V., KvK 12345678', 'Esempio S.p.A., REA MI-1']) {
      expect(details('de', `${company}\nStraat 1\n1011 AB Amsterdam`)).toEqual([]);
    }
    expect(details('de', 'Esempio S.r.l., R.E.A. RM-123456\nVia Roma 1\n00100 Roma')).toEqual([]);
    // A US state before a ZIP code is no legal form; a name is no register acronym.
    expect(details('de', 'Jane Doe\n1 Main St\nLas Vegas, NV 89101')).toEqual([]);
    expect(details('de', 'Voorbeeld BV\nMaria Rea\nStraat 1\n1011 AB Amsterdam')).toEqual([
      expect.objectContaining({ subject: 'register', message: expect.stringContaining('BV') }),
    ]);
    expect(details('de', 'Voorbeeld B.V.\nStraat 1\n1011 AB Amsterdam')).toEqual([
      expect.objectContaining({ subject: 'register', message: expect.stringContaining('B.V.') }),
    ]);
  });
});

describe('reject option in Italy', () => {
  const consent = { bannerFound: true, rejected: false, acceptLabel: 'Accetta' } as const;

  it('takes an X that closes the banner as the refusal', () => {
    const closed = snapshot({
      consent: {
        ...consent,
        close: {
          outcome: 'closed',
          reason: 'banner-closed-and-reloaded',
          closeLabel: '×',
          afterClose: { requests: [], cookies: [], storage: [] },
        },
      },
    });
    const withClose = (region: Region) =>
      rejectOption.check({
        siteUrl: SITE,
        page: closed,
        lang: 'en',
        region,
        selectedRules: new Set(['reject-option', 'trackers-after-close']),
      });
    expect(withClose('it')).toEqual([]);
    expect(withClose('de')).toHaveLength(1);
    // Without the list of selected rules, closing is not taken as verified.
    expect(run(rejectOption, closed, 'it')).toHaveLength(1);
  });

  it('keeps the finding when trackers-after-close does not run', () => {
    const closed = snapshot({
      consent: {
        ...consent,
        close: {
          outcome: 'closed',
          reason: 'banner-closed-and-reloaded',
          closeLabel: '×',
          afterClose: { requests: [], cookies: [], storage: [] },
        },
      },
    });
    const context = (selectedRules: ReadonlySet<string>) =>
      rejectOption.check({ siteUrl: SITE, page: closed, lang: 'en', region: 'it', selectedRules });
    expect(context(new Set(['reject-option']))).toHaveLength(1);
    expect(context(new Set(['reject-option', 'trackers-after-close']))).toEqual([]);
  });

  it('keeps the finding when the page after closing was not fully observed', () => {
    const partial = snapshot({
      consent: {
        ...consent,
        close: {
          outcome: 'closed',
          reason: 'banner-closed-and-reloaded',
          closeLabel: '×',
          afterClose: { requests: [], cookies: [], storage: [] },
          afterCloseComplete: false,
        },
      },
    });
    const [finding] = run(rejectOption, partial, 'it');
    expect(finding?.fix).toContain('found none it could use');
    expect(finding?.fix).not.toContain('--check-close');
  });

  it('names the X in the fix when the close check did not run', () => {
    const [finding] = run(rejectOption, snapshot({ consent }), 'it');
    expect(finding?.fix).toContain('--check-close');
    expect(run(rejectOption, snapshot({ consent }), 'de')[0]?.fix).not.toContain('--check-close');
  });
});

describe('transfers from the United Kingdom', () => {
  const page = snapshot({
    requests: [request('https://o123.ingest.us.sentry.io/api/4/envelope/')],
  });

  it('names the UK-US data bridge', () => {
    const [finding] = run(thirdCountryProviders, page, 'uk');
    expect(finding?.message).toContain('outside the UK and the EEA');
    expect(finding?.fix).toContain('UK-US data bridge');
  });

  it('does not report the EEA as a third country for UK sites', () => {
    const eu = snapshot({
      requests: [request('https://o123.ingest.de.sentry.io/api/4/envelope/')],
    });
    expect(run(thirdCountryProviders, eu, 'uk')).toEqual([]);
  });
});
