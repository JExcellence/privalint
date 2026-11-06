# mixed-content

[Deutsch](mixed-content.de.md)

Reports HTTPS pages whose forms submit over HTTP, and resources they reference over HTTP.

## What it checks

Only pages served over HTTPS; a page over plain HTTP is a case for
[`https-transport`](https-transport.md).

| Case                                                                                                                      | Finding |
| ------------------------------------------------------------------------------------------------------------------------- | ------- |
| A form with an e-mail, phone or password field whose `action`, or a submit button's `formaction`, is an `http://` address | `error` |
| Scripts, images, frames, media or stylesheets referenced over `http://`, or requests to `http://` addresses               | `info`  |

## Why

A form that submits over HTTP sends what visitors type, such as e-mail addresses and passwords,
unencrypted. Browsers block or upgrade resources over HTTP on HTTPS pages, but such references show
that the move to HTTPS is unfinished.

- Art. 32 DSGVO (Germany, Austria)
- Art. 8 DSG (Switzerland)
- GDPR 32. cikk (Hungary)

## How to fix

Point form actions to `https://` addresses and load every resource over `https://` or from your
own server.

## Limits

- Forms without a personal data field, such as a search form, are not checked.
- Resources added by a script after the page settled are not seen.
