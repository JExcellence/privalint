# withdrawal-button

[Deutsch](withdrawal-button.de.md)

Warns when a site looks like an online shop and its start page has no link to a withdrawal
function.

## What it checks

A site counts as a shop when its start page links a cart or checkout ("Warenkorb", "Kasse",
"Cart", "Checkout", "Panier", "Kosár", …) or loads the scripts of a shop system (Shopify,
WooCommerce, Shopware, Magento). On such a start page privalint looks for a link or button labelled
like the law asks: "Vertrag widerrufen", "Vertrag hier widerrufen", "Withdraw from contract here"
and close variants in French, Spanish, Italian and Dutch.

| Situation                                                          | Severity |
| ------------------------------------------------------------------ | -------- |
| Shop, a withdrawal link on the start page                          | passes   |
| Shop, only a cancellation policy ("Widerrufsbelehrung") or nothing | warning  |
| Not a shop, or not the start page                                  | nothing  |
| `--region ch`                                                      | info     |

## Why

Directive (EU) 2023/2673 added Art. 11a to the Consumer Rights Directive. Since 19 June 2026,
traders who conclude contracts with consumers online must offer a withdrawal function: a clearly
labelled "withdraw from contract here" control, available for the whole withdrawal period, that
leads to a confirmation step. Germany implements it in § 356a BGB, with the labels "Vertrag
widerrufen" and "Widerruf bestätigen".

- § 356a BGB
- Art. 11a Directive 2011/83/EU

Swiss law has no such duty; with `--region ch` the finding is info, for shops that sell into the
EU.

## How to fix

- Put a "Vertrag widerrufen" / "Withdraw from contract here" link in the footer of every page.
- It leads to a form that asks for the order (name, order number, e-mail) and ends with a "Widerruf
  bestätigen" / "Confirm withdrawal" button. Send a confirmation of receipt by e-mail.
- A page with the cancellation policy or a PDF form does not replace the function.

## Limits

privalint checks the start page only. A function that is offered only in the customer account is
not found; if that is your setup, disable the rule or allow it in your config.
