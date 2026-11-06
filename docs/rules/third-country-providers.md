# third-country-providers

[Deutsch](third-country-providers.de.md)

Lists, as `info`, services outside the EU/EEA that a page contacts before consent, other than
trackers, embeds, fonts and CDNs, which have their own rules.

## What it checks

Every request a page makes before any interaction is matched against a list of error monitoring,
performance monitoring, feature flag and backend services, each with the country the data goes to:

| Service                                                                    | Hosts                                                         | Country               |
| -------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------- |
| Sentry                                                                     | `*.ingest.de.sentry.io`                                       | Germany, not reported |
| Sentry                                                                     | other `sentry.io` hosts, `sentry-cdn.com`                     | USA                   |
| Datadog                                                                    | `browser-intake-datadoghq.eu`                                 | EU, not reported      |
| Datadog                                                                    | `browser-intake-datadoghq.com` and the US3, US5 and AP1 hosts | USA                   |
| New Relic                                                                  | `bam.eu01.nr-data.net`                                        | EU, not reported      |
| New Relic                                                                  | other `nr-data.net` hosts, `js-agent.newrelic.com`            | USA                   |
| Supabase                                                                   | `*.supabase.co`                                               | USA (provider's seat) |
| Firebase                                                                   | `firebaseio.com`, Firestore and Firebase Auth APIs            | USA                   |
| Bugsnag, Rollbar, LaunchDarkly, Vercel Analytics, Cloudflare Web Analytics | their API hosts                                               | USA                   |

Where a host names a region, the region counts; otherwise the provider's seat. Each service gets
one finding with its hosts as evidence. Hosts that aren't on the list are not reported.

## Why

A request sends at least the visitor's IP address, which is personal data. Sending it to a country
outside the EU/EEA needs an adequacy decision, such as the EU-US Data Privacy Framework for certified
US companies, or safeguards such as standard contractual clauses. The privacy policy has to name
the transfer.

- Art. 44, 45 and 46 GDPR
- Commission Implementing Decision (EU) 2023/1795 (EU-US Data Privacy Framework)
- Switzerland (`--region ch`): Art. 16 and 17 DSG

## How to fix

- Check that the provider is certified under the Data Privacy Framework, or that standard
  contractual clauses are part of its data processing agreement.
- Name the provider and the transfer in the privacy policy.
- Where the provider offers an EU region, as Sentry, Datadog and New Relic do, using it avoids the
  transfer.

## Limits

- privalint can't see contracts or certifications. That is why the rule only notes, at `info`.
- The region of a Supabase or Firebase project isn't visible from its host, so the provider's seat
  counts.
- Requests through a proxy on the site's own domain are not recognised.

## Sources

Region hosts checked on 2026-11-06:

- [Sentry: Data Storage Location](https://docs.sentry.io/organization/data-storage-location/)
- [Datadog: Proxy your browser RUM data](https://docs.datadoghq.com/real_user_monitoring/guide/proxy-rum-data/)
- [New Relic: Network traffic](https://docs.newrelic.com/docs/new-relic-solutions/get-started/networks/)
