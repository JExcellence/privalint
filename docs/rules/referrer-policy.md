# referrer-policy

[Deutsch](referrer-policy.de.md)

Notes pages whose referrer policy sends the full page address to other sites.

## What it checks

privalint reads the `Referrer-Policy` response header of the page (where the network adapter
passes headers on) and a `<meta name="referrer">` tag, which replaces the header's policy. When
the policy is `unsafe-url` or `no-referrer-when-downgrade` (or the old meta value `always`) and the
page made requests to other hosts, that is `info`, with the policy and up to three hosts as
evidence. Across pages the finding is shown once.

## Why

With these policies every request to another site carries the full page address, including
paths and query strings that can hold search terms, order numbers or tokens. Browsers send only
the origin to other sites by default; a site that weakens this shares more than needed.

- Art. 25 Abs. 2 DSGVO (Germany, Austria)
- Art. 7 Abs. 3 DSG (Switzerland)
- GDPR 25. cikk (2) bekezdés (Hungary)

## How to fix

Set `Referrer-Policy: strict-origin-when-cross-origin` or stricter, and remove `unsafe-url` and
`no-referrer-when-downgrade` from headers and meta tags.

## Limits

- `referrerpolicy` attributes on single links, images or frames are not read.
