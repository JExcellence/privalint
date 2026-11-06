# third-country-providers

[English](third-country-providers.md)

Nennt als `info` Dienste außerhalb von EU/EWR, die eine Seite vor der Einwilligung kontaktiert,
außer Trackern, Einbindungen, Schriften und CDNs, für die es eigene Regeln gibt.

## Was geprüft wird

Jede Anfrage, die eine Seite vor jeder Interaktion stellt, wird mit einer Liste von Diensten für
Fehler- und Performance-Monitoring, Feature Flags und Backends abgeglichen, jeweils mit dem Land, in
das die Daten gehen:

| Dienst                                                                     | Hosts                                                             | Land                        |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------- |
| Sentry                                                                     | `*.ingest.de.sentry.io`                                           | Deutschland, nicht gemeldet |
| Sentry                                                                     | andere `sentry.io`-Hosts, `sentry-cdn.com`                        | USA                         |
| Datadog                                                                    | `browser-intake-datadoghq.eu`                                     | EU, nicht gemeldet          |
| Datadog                                                                    | `browser-intake-datadoghq.com` und die Hosts für US3, US5 und AP1 | USA                         |
| New Relic                                                                  | `bam.eu01.nr-data.net`                                            | EU, nicht gemeldet          |
| New Relic                                                                  | andere `nr-data.net`-Hosts, `js-agent.newrelic.com`               | USA                         |
| Supabase                                                                   | `*.supabase.co`                                                   | USA (Sitz des Anbieters)    |
| Firebase                                                                   | `firebaseio.com`, Firestore- und Firebase-Auth-APIs               | USA                         |
| Bugsnag, Rollbar, LaunchDarkly, Vercel Analytics, Cloudflare Web Analytics | ihre API-Hosts                                                    | USA                         |

Nennt ein Host eine Region, zählt die Region, sonst der Sitz des Anbieters. Jeder Dienst bekommt
einen Befund mit seinen Hosts als Beleg. Hosts, die nicht auf der Liste stehen, werden nicht
gemeldet.

## Warum

Eine Anfrage überträgt mindestens die IP-Adresse der Besucher, ein personenbezogenes Datum. Die
Übermittlung in ein Land außerhalb von EU/EWR braucht einen Angemessenheitsbeschluss, etwa das
EU-US Data Privacy Framework für zertifizierte US-Unternehmen, oder Garantien wie
Standardvertragsklauseln. Die Datenschutzerklärung muss die Übermittlung nennen.

- Art. 44, 45 und 46 DSGVO
- Durchführungsbeschluss (EU) 2023/1795 der Kommission (EU-US Data Privacy Framework)
- Schweiz (`--region ch`): Art. 16 und 17 DSG

## Wie beheben

- Prüfen, ob der Anbieter unter dem Data Privacy Framework zertifiziert ist oder ob
  Standardvertragsklauseln Teil seines Auftragsverarbeitungsvertrags sind.
- Anbieter und Übermittlung in der Datenschutzerklärung nennen.
- Bietet der Anbieter eine EU-Region an, wie Sentry, Datadog und New Relic, vermeidet sie die
  Übermittlung.

## Grenzen

- privalint sieht keine Verträge oder Zertifizierungen. Deshalb meldet die Regel nur als `info`.
- Die Region eines Supabase- oder Firebase-Projekts ist am Host nicht zu erkennen, daher zählt der
  Sitz des Anbieters.
- Anfragen über einen Proxy auf der eigenen Domain der Website werden nicht erkannt.

## Quellen

Region-Hosts geprüft am 2026-11-06:

- [Sentry: Data Storage Location](https://docs.sentry.io/organization/data-storage-location/)
- [Datadog: Proxy your browser RUM data](https://docs.datadoghq.com/real_user_monitoring/guide/proxy-rum-data/)
- [New Relic: Network traffic](https://docs.newrelic.com/docs/new-relic-solutions/get-started/networks/)
