# reject-option

[Deutsch](reject-option.de.md)

Warns when the first layer of a recognized consent banner offers "accept" but no supported
reject control was detected. Verify the banner manually before treating this as a site defect.

## What it checks

privalint finds the consent banner on the start page, either through selectors of common consent
managers (OneTrust, Cookiebot, Usercentrics, Borlabs Cookie, Complianz, CookieYes, Didomi,
consentmanager, iubenda, Klaro, CookieConsent) or by button labels in German, English, French,
Spanish, Italian and Dutch.

CookieFirst, Osano, Termly and Sourcepoint have additional frame-aware selectors. Real Cookie
Banner is named through its vendor marker plus the existing label heuristic. See the
[CMP support and verification notes](../consent-managers.md) ([Deutsch](../consent-managers.de.md)).

| Situation                                                        | Severity |
| ---------------------------------------------------------------- | -------- |
| Accept and reject buttons on the first layer                     | passes   |
| Accept on the first layer, reject only in settings or not at all | warning  |
| Accept or a subscription ("pay or OK"), no reject                | info     |
| No banner found                                                  | nothing  |

A banner counts as pay-or-OK when a button or link inside the banner mentions a subscription
("Abo", "abonnieren", "subscribe", "werbefrei", …). Links in the site's own navigation don't count.

Load failures and unsupported markup can prevent recognition. No banner detected is not itself
a privacy finding. Consult `consent.state`, capture diagnostics and per-rule evaluation status;
an untested reject path must not be interpreted as a successful test. Country profiles choose
tool references/severities and do not determine which law applies.

## Why

The EDPB's cookie banner taskforce found that most European regulators consider a missing reject
option on the same layer as the accept button a breach. Consent has to be as easy to refuse as to
give, and a banner that hides refusal in the settings pushes people towards accepting.

Pay-or-OK models are treated differently. The German Datenschutzkonferenz considers them generally
permissible if the paid option is an equivalent alternative at a reasonable price. The EDPB is much
stricter for large online platforms. privalint can't judge either, so it only notes the model.

- EDPB Cookie Banner Taskforce report, 17.01.2023
- DSK-Beschluss, 22.03.2023: Bewertung von Pur-Abo-Modellen auf Websites
- EDPB Opinion 08/2024 on consent or pay models implemented by large online platforms
- Art. 4(11) and Art. 7(3) GDPR, § 25 Abs. 1 TDDDG

## Limitations

- Some sites don't show their banner to headless browsers. privalint reports "no banner" for them
  and this rule stays silent. Scan them locally with `--headed`, see the README.
- A reject option that is a plain text link rather than a button is still found if its label
  matches. Whether a link is "as prominent" as the accept button is not judged.

## How to fix

Put a button such as "Alle ablehnen" or "Nur notwendige" next to the accept button, with the same
size and visual weight. Most consent managers have a setting for this.
