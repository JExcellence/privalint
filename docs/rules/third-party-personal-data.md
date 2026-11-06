# third-party-personal-data

[Deutsch](third-party-personal-data.de.md)

Reports requests to other sites whose address carries visitors' e-mail addresses or phone numbers.

## What it checks

Every request the page sent before consent to a host outside the site is read for query
parameters that hold:

| Data           | How it is found                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| E-mail address | any parameter value that is an e-mail address, such as `?q=jane%40example.org`                                    |
| Hashed e-mail  | a SHA-256 hash in a parameter such as `em`, `ud[em]`, `email` or `sha256_email_address` (Meta, Google, TikTok, …) |
| Phone number   | a number or SHA-256 hash in a parameter such as `ph`, `ud[ph]`, `phone` or `tel`                                  |

Each host is one `warning`, with the parameter names as evidence. The values are never reported:
privalint also replaces them with `[redacted]` wherever a request address appears in a finding of
any rule.

## Why

Pixels with "advanced matching", analytics setups and search pages can pass form input to other
companies. A hash of an e-mail address still identifies the person, since the receiver hashes
its own customer list the same way. That is a transfer of personal data beyond the IP address and
needs a legal basis, usually consent.

- Art. 5 Abs. 1 lit. c, Art. 6 Abs. 1 DSGVO (Germany, Austria)
- Art. 6 Abs. 2 und 3 DSG (Switzerland)
- GDPR 5. cikk (1) c), 6. cikk (1) (Hungary)

## How to fix

Turn off advanced matching or automatic user data in the tag settings, send form input with POST
instead of in URLs, and send such data only after consent.

## Limits

- Only query strings are read. Request bodies and paths are not.
- Phone numbers are only recognised in parameters named for them; a phone number in another
  parameter is not reported.
