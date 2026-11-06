import { findProvider, isThirdCountry } from '../data/providers.js';
import { huArticle, say, type Text } from '../i18n.js';
import { observedRequests } from '../observations.js';
import type { Finding, Rule } from '../types.js';

const ID = 'third-country-providers';
const MAX_HOSTS = 5;
const COUNTRY_NAMES: Record<string, Text> = {
  US: { en: 'USA', de: 'USA', hu: 'USA' },
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
    return [...byVendor.values()].map(({ vendor, country, hosts }): Finding => {
      const where = COUNTRY_NAMES[country]?.[lang] ?? country;
      return {
        ruleId: ID,
        severity: 'info',
        subject: vendor,
        message: say(lang, {
          en: `${vendor} (${where}) receives data before consent. Transfers ${swiss ? 'abroad' : 'outside the EU/EEA'} need a legal basis.`,
          de: `${vendor} (${where}) erhält schon vor der Einwilligung Daten. Übermittlungen ${swiss ? 'ins Ausland' : 'außerhalb von EU/EWR'} brauchen eine Rechtsgrundlage.`,
          hu: `${huArticle(vendor, true)} ${vendor} (${where}) már a hozzájárulás előtt adatokat kap. ${swiss ? 'A külföldre' : 'Az EU-n és az EGT-n kívülre'} irányuló adattovábbításhoz jogalap kell.`,
        }),
        pageUrl: page.finalUrl,
        evidence: [...hosts].slice(0, MAX_HOSTS),
        fix: swiss
          ? say(lang, {
              en: `Check that ${vendor} is certified under the Swiss-US Data Privacy Framework or that contract clauses approved under Art. 16 DSG are in place, and name the transfer in the privacy policy.`,
              de: `Prüfen, ob ${vendor} unter dem Swiss-US Data Privacy Framework zertifiziert ist oder nach Art. 16 DSG anerkannte Vertragsklauseln vereinbart sind, und die Übermittlung in der Datenschutzerklärung nennen.`,
              hu: `Ellenőrizze, hogy ${huArticle(vendor)} ${vendor} rendelkezik-e Swiss-US Data Privacy Framework tanúsítással, vagy alkalmaznak-e az Art. 16 DSG szerint elismert szerződéses kikötéseket, és nevezze meg az adattovábbítást az adatkezelési tájékoztatóban.`,
            })
          : say(lang, {
              en: `Check that ${vendor} is certified under the EU-US Data Privacy Framework or that standard contractual clauses are in place, and name the transfer in the privacy policy. Where the provider offers an EU region, using it avoids the transfer.`,
              de: `Prüfen, ob ${vendor} unter dem EU-US Data Privacy Framework zertifiziert ist oder Standardvertragsklauseln vereinbart sind, und die Übermittlung in der Datenschutzerklärung nennen. Bietet der Anbieter eine EU-Region an, vermeidet sie die Übermittlung.`,
              hu: `Ellenőrizze, hogy ${huArticle(vendor)} ${vendor} rendelkezik-e EU-US Data Privacy Framework tanúsítással, vagy alkalmaznak-e általános adatvédelmi kikötéseket (SCC), és nevezze meg az adattovábbítást az adatkezelési tájékoztatóban. Ha a szolgáltató kínál EU-s régiót, annak használatával az adattovábbítás elkerülhető.`,
            }),
      };
    });
  },
};
