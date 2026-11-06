# privacy-policy-content

[Deutsch](privacy-policy-content.de.md)

Checks that the privacy policy linked from the start page names a way to reach the controller and
contains no leftover template text.

## What it checks

privalint reads the privacy policy the same way as for
[`privacy-policy-vendors`](privacy-policy-vendors.md): the page the start page links as its
privacy policy, on the same site, plus a cookie policy it links. Both rules share that one load.

| Detail                  | How it is found                                                                                                                                       | Finding                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Controller contact      | an e-mail address (also a `mailto:` link or `(at)`) or a postal address, as in [`legal-notice-content`](legal-notice-content.md)                      | `warning` when neither is there                    |
| Template text           | bracketed fields such as `[Firmenname]` or `[Your name]`, "Musterstraße", "Max Mustermann", "Musterfirma", "Lorem ipsum", `example.com`               | `warning`, with up to three of the fragments found |
| Data protection officer | "Datenschutzbeauftragte", "data protection officer", "DPO" or "adatvédelmi tisztviselő" with an e-mail, address or phone number in the next few lines | `info` when none follows                           |

When the policy page is only an overview that links further privacy documents (its own sub-pages,
or pages and PDFs labelled as privacy notices), a missing contact is `info` instead, with up to
three of those links as "not read" evidence.

A line saying that no data protection officer was appointed ("Wir haben keinen
Datenschutzbeauftragten bestellt") is not reported.

## Why

Art. 13(1)(a) and (b) GDPR ask the privacy policy to give the identity and contact details of the
controller and, where one is appointed, the contact details of the data protection officer. A
policy copied from a generator with its placeholders left in gives neither.

- Art. 13 Abs. 1 lit. a und b DSGVO (Germany, Austria)
- Art. 19 Abs. 2 lit. a DSG (Switzerland)
- GDPR 13. cikk (1) bekezdés a) és b) pont (Hungary)

## How to fix

Name the company or person running the site with a postal address and an e-mail address in the
privacy policy. Replace every placeholder with the real details. If you have a data protection
officer, give an e-mail address or another way to reach them where they are named.

## Limits

- Only the start page's privacy policy is read; a policy in a PDF or on another domain is not.
- A contact link without a `mailto:` target, such as a contact form, does not count as an e-mail
  address.
- Whether the named controller is the right one isn't checked.
