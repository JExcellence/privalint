# form-preticked-consent

[Deutsch](form-preticked-consent.de.md)

Reports forms that tick a newsletter or advertising consent checkbox before the visitor chooses.

## What it checks

In every visible form with an e-mail, phone or password field (the forms
[`form-privacy-notice`](form-privacy-notice.md) looks at), privalint reads the checkboxes that are
ticked when the page has loaded. A ticked box whose label mentions a newsletter, offers, marketing,
promotions, "Werbung", "Angebote" or "hírlevél" is a `warning`, with up to three labels as
evidence. Ticked boxes for terms, privacy notices or "remember me" are not reported.

## Why

Consent has to be an unambiguous, active choice. A checkbox ticked in advance is not consent
(CJEU C-673/17, Planet49), and advertising by e-mail needs prior consent.

- Art. 4 Nr. 11, Art. 7 DSGVO; § 7 Abs. 2 UWG (Germany)
- Art. 4 Nr. 11, Art. 7 DSGVO; § 174 TKG 2021 (Austria)
- Art. 3 Abs. 1 lit. o UWG (Switzerland)
- GDPR 4. cikk 11. pont, 7. cikk; Grt. 6. § (Hungary)

## How to fix

Leave newsletter and offers checkboxes unticked, so that visitors tick them themselves.

## Limits

- Only checkboxes inside a `<form>` element are read; custom switches built from other elements
  are not.
- A box ticked by a script after the page settled is not seen.
