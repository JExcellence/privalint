# privacy-policy-link

[Deutsch](privacy-policy-link.de.md)

Warns when a page has no link to a privacy policy.

## What it checks

Every link on the page is matched by its text, `aria-label`, `title` and URL path against common
names for a privacy policy: Datenschutz, Datenschutzerklärung, Privacy, Data protection,
Confidentialité, Privacidad, Protezione dei dati, Privacybeleid and Polityka prywatności.

The rule runs on every crawled page.

## Why

People have to be informed about the processing of their data when it is collected. A website
processes the IP address with every page view, at the very least in server logs, so the privacy
policy has to be reachable from every page, in practice through a link in the footer.

- Art. 12 GDPR: information must be easily accessible
- Art. 13 GDPR: information at the time of collection

## How to fix

Add a link labelled "Datenschutz" or "Datenschutzerklärung" to the footer, next to the Impressum
link.
