# https-transport

[Deutsch](https-transport.de.md)

Reports a site that is reachable over unencrypted HTTP.

## What it checks

On the start page, in native scans:

| Situation                                                     | Severity |
| ------------------------------------------------------------- | -------- |
| The start page itself is served over `http://`                | error    |
| HTTPS, but `http://<host>/` answers without redirecting to it | warning  |
| HTTPS and the redirect, but no `Strict-Transport-Security`    | info     |
| HTTPS, redirect and HSTS                                      | passes   |
| `localhost`, `127.0.0.1` and other development hosts          | nothing  |

For the redirect privalint sends one request to `http://<host>/` and doesn't follow it. If nothing
answers on port 80 at all, nothing is served in clear text, which passes. With a network adapter
(controlled scanning) or `offline`, this extra request isn't made and the rule is not evaluable.

## Why

Anything a visitor sends, from a contact form to a login or a cookie, has to be protected in
transit. Encryption is the baseline measure for that.

- Art. 32 DSGVO
- § 19 Abs. 4 TDDDG

## How to fix

- Serve the site over HTTPS; a free certificate from Let's Encrypt is enough.
- Redirect every `http://` request to the same address on `https://` with a 301.
- Once HTTPS works on every subdomain, send `Strict-Transport-Security: max-age=31536000`.
