import { findProvider, isThirdCountry } from '../data/providers.js';
import { huArticle, say, type Text } from '../i18n.js';
import { observedRequests } from '../observations.js';
import type { Finding, Rule } from '../types.js';

const ID = 'third-country-providers';
const MAX_HOSTS = 5;
const COUNTRY_NAMES: Record<string, Text> = {
  US: { en: 'USA', de: 'USA', hu: 'USA', fr: 'États-Unis', it: 'USA', es: 'EE. UU.', pl: 'USA' },
};

export const thirdCountryProviders: Rule = {
  id: ID,
  title: 'Services outside the EU contacted before consent',
  description:
    'Error monitoring, performance monitoring, feature flags and backends receive at least the ' +
    "visitor's IP address. When the provider is outside the EU/EEA, that transfer needs a basis " +
    'such as the EU-US Data Privacy Framework or standard contractual clauses. privalint lists ' +
    'such services it recognises; it cannot see the contracts, so this is a hint.',
  references: ['Art. 44 GDPR', 'Art. 45 GDPR', 'Art. 46 GDPR'],
  check({ page, lang, region }) {
    const byVendor = new Map<string, { vendor: string; country: string; hosts: Set<string> }>();
    for (const request of observedRequests(page.requests)) {
      const provider = findProvider(request.url);
      if (provider === undefined || !isThirdCountry(provider.country, region)) continue;
      const key = `${provider.vendor}|${provider.country}`;
      const entry = byVendor.get(key) ?? { ...provider, hosts: new Set<string>() };
      entry.hosts.add(new URL(request.url).hostname);
      byVendor.set(key, entry);
    }
    const swiss = region === 'ch';
    const british = region === 'uk';
    return [...byVendor.values()].map(({ vendor, country, hosts }): Finding => {
      const where = COUNTRY_NAMES[country]?.[lang] ?? country;
      return {
        ruleId: ID,
        severity: 'info',
        subject: vendor,
        message: say(lang, {
          en: `${vendor} (${where}) receives data before consent. Transfers ${swiss ? 'abroad' : british ? 'outside the UK and the EEA' : 'outside the EU/EEA'} need a legal basis.`,
          de: `${vendor} (${where}) erhält schon vor der Einwilligung Daten. Übermittlungen ${swiss ? 'ins Ausland' : british ? 'außerhalb des Vereinigten Königreichs und des EWR' : 'außerhalb von EU/EWR'} brauchen eine Rechtsgrundlage.`,
          hu: `${huArticle(vendor, true)} ${vendor} (${where}) már a hozzájárulás előtt adatokat kap. ${swiss ? 'A külföldre' : british ? 'Az Egyesült Királyságon és az EGT-n kívülre' : 'Az EU-n és az EGT-n kívülre'} irányuló adattovábbításhoz jogalap kell.`,
          fr: `${vendor} (${where}) reçoit des données avant le consentement. Les transferts ${swiss ? "vers l'étranger" : british ? "hors du Royaume-Uni et de l'EEE" : "hors de l'UE/EEE"} nécessitent une base légale.`,
          it: `${vendor} (${where}) riceve dati prima del consenso. I trasferimenti ${swiss ? "all'estero" : british ? 'fuori dal Regno Unito e dal SEE' : "fuori dall'UE/SEE"} richiedono una base giuridica.`,
          es: `${vendor} (${where}) recibe datos antes del consentimiento. Las transferencias ${swiss ? 'al extranjero' : british ? 'fuera del Reino Unido y del EEE' : 'fuera de la UE/EEE'} necesitan una base jurídica.`,
          pl: `${vendor} (${where}) otrzymuje dane przed wyrażeniem zgody. Przekazywanie ${swiss ? 'za granicę' : british ? 'poza Wielką Brytanię i EOG' : 'poza UE/EOG'} wymaga podstawy prawnej.`,
        }),
        pageUrl: page.finalUrl,
        evidence: [...hosts].slice(0, MAX_HOSTS),
        fix: british
          ? say(lang, {
              en: `Check that ${vendor} is certified under the UK Extension to the EU-US Data Privacy Framework (the UK-US data bridge) or that the International Data Transfer Agreement or the UK Addendum is in place, and name the transfer in the privacy policy.`,
              de: `Prüfen, ob ${vendor} unter der UK Extension des EU-US Data Privacy Framework (UK-US Data Bridge) zertifiziert ist oder das International Data Transfer Agreement oder das UK Addendum vereinbart ist, und die Übermittlung in der Datenschutzerklärung nennen.`,
              hu: `Ellenőrizze, hogy ${huArticle(vendor)} ${vendor} rendelkezik-e tanúsítással az EU-US Data Privacy Framework brit kiterjesztése (UK-US data bridge) alapján, vagy alkalmaznak-e International Data Transfer Agreementet vagy UK Addendumot, és nevezze meg az adattovábbítást az adatkezelési tájékoztatóban.`,
              fr: `Vérifiez que ${vendor} est certifié au titre de l'extension britannique du cadre de protection des données UE-États-Unis (UK-US data bridge), ou que l'International Data Transfer Agreement ou l'UK Addendum est en place, et mentionnez le transfert dans la politique de confidentialité.`,
              it: `Verifica che ${vendor} sia certificato ai sensi della UK Extension dell'EU-US Data Privacy Framework (il «data bridge» UK-USA) oppure che siano in essere l'International Data Transfer Agreement o l'UK Addendum, e indica il trasferimento nell'informativa sulla privacy.`,
              es: `Comprueba que ${vendor} esté certificado conforme a la UK Extension del EU-US Data Privacy Framework (el «data bridge» Reino Unido-EE. UU.) o que existan el International Data Transfer Agreement o el UK Addendum, y menciona la transferencia en la política de privacidad.`,
              pl: `Sprawdź, czy ${vendor} ma certyfikację w ramach UK Extension do EU-US Data Privacy Framework (brytyjsko-amerykański „data bridge”) albo czy obowiązuje International Data Transfer Agreement lub UK Addendum, i wymień to przekazywanie w polityce prywatności.`,
            })
          : swiss
            ? say(lang, {
                en: `Check that ${vendor} is certified under the Swiss-US Data Privacy Framework or that contract clauses approved under Art. 16 DSG are in place, and name the transfer in the privacy policy.`,
                de: `Prüfen, ob ${vendor} unter dem Swiss-US Data Privacy Framework zertifiziert ist oder nach Art. 16 DSG anerkannte Vertragsklauseln vereinbart sind, und die Übermittlung in der Datenschutzerklärung nennen.`,
                hu: `Ellenőrizze, hogy ${huArticle(vendor)} ${vendor} rendelkezik-e Swiss-US Data Privacy Framework tanúsítással, vagy alkalmaznak-e az Art. 16 DSG szerint elismert szerződéses kikötéseket, és nevezze meg az adattovábbítást az adatkezelési tájékoztatóban.`,
                fr: `Vérifiez que ${vendor} est certifié au titre du Swiss-US Data Privacy Framework, ou que des clauses contractuelles approuvées selon l'art. 16 LPD sont en place, et mentionnez le transfert dans la politique de confidentialité.`,
                it: `Verifica che ${vendor} sia certificato ai sensi dello Swiss-US Data Privacy Framework oppure che siano in essere clausole contrattuali approvate ai sensi dell'art. 16 LPD, e indica il trasferimento nell'informativa sulla privacy.`,
                es: `Comprueba que ${vendor} esté certificado conforme al Swiss-US Data Privacy Framework o que existan cláusulas contractuales aprobadas según el art. 16 DSG, y menciona la transferencia en la política de privacidad.`,
                pl: `Sprawdź, czy ${vendor} ma certyfikację w ramach Swiss-US Data Privacy Framework albo czy obowiązują klauzule umowne zatwierdzone na podstawie art. 16 DSG, i wymień to przekazywanie w polityce prywatności.`,
              })
            : say(lang, {
                en: `Check that ${vendor} is certified under the EU-US Data Privacy Framework or that standard contractual clauses are in place, and name the transfer in the privacy policy. Where the provider offers an EU region, using it avoids the transfer.`,
                de: `Prüfen, ob ${vendor} unter dem EU-US Data Privacy Framework zertifiziert ist oder Standardvertragsklauseln vereinbart sind, und die Übermittlung in der Datenschutzerklärung nennen. Bietet der Anbieter eine EU-Region an, vermeidet sie die Übermittlung.`,
                hu: `Ellenőrizze, hogy ${huArticle(vendor)} ${vendor} rendelkezik-e EU-US Data Privacy Framework tanúsítással, vagy alkalmaznak-e általános adatvédelmi kikötéseket (SCC), és nevezze meg az adattovábbítást az adatkezelési tájékoztatóban. Ha a szolgáltató kínál EU-s régiót, annak használatával az adattovábbítás elkerülhető.`,
                fr: `Vérifiez que ${vendor} est certifié au titre du cadre de protection des données UE-États-Unis, ou que des clauses contractuelles types sont en place, et mentionnez le transfert dans la politique de confidentialité. Si le fournisseur propose une région UE, l'utiliser évite le transfert.`,
                it: `Verifica che ${vendor} sia certificato ai sensi dell'EU-US Data Privacy Framework oppure che siano in essere clausole contrattuali standard, e indica il trasferimento nell'informativa sulla privacy. Se il fornitore offre una regione UE, usarla evita il trasferimento.`,
                es: `Comprueba que ${vendor} esté certificado conforme al EU-US Data Privacy Framework o que existan cláusulas contractuales tipo, y menciona la transferencia en la política de privacidad. Si el proveedor ofrece una región en la UE, usarla evita la transferencia.`,
                pl: `Sprawdź, czy ${vendor} ma certyfikację w ramach EU-US Data Privacy Framework albo czy obowiązują standardowe klauzule umowne, i wymień to przekazywanie w polityce prywatności. Jeśli dostawca oferuje region w UE, korzystanie z niego pozwala uniknąć przekazywania.`,
              }),
      };
    });
  },
};
