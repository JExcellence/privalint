# form-privacy-notice

[Deutsch](form-privacy-notice.de.md)

Notes forms that collect personal data without a link to the privacy policy next to them.

## What it checks

On every scanned page privalint looks at visible `<form>` elements with an email, phone or
password field. Search forms (`role="search"`, a search field, a search action) don't count. For
each form it looks for a link to the privacy policy inside the form or in the element around it,
as long as that element is small enough not to be the whole page.

| Situation                                                     | Severity                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| Every such form has a privacy link in or right around it      | passes                                                              |
| A form without one, while the page links the policy elsewhere | info                                                                |
| The page has no privacy link at all                           | nothing here; [`privacy-policy-link`](privacy-policy-link.md) warns |

## Why

Art. 13 GDPR asks for the information at the time the data is collected. A short line under the
form makes that obvious. Whether a privacy link in the footer is enough is not settled, so this is
only info.

- Art. 13 DSGVO

## How to fix

Add a line under the form, for example: "We use your data to answer your request. Details:
[Privacy policy]".

## Limits

Forms built without a `<form>` element, for example with JavaScript only, are not found. Only the
structure of a form is read, never what is typed in.
