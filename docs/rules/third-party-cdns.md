# third-party-cdns

Notes scripts, styles and icon fonts loaded from public CDNs.

## What it checks

Requests to jsDelivr, unpkg, cdnjs, Google Hosted Libraries, the jQuery CDN, BootstrapCDN, the
Tailwind Play CDN and the Font Awesome CDN. Each CDN is reported once per page, as **info**.

## Why

Every request to a CDN sends the visitor's IP address to its operator. The reasoning the
Landgericht München I applied to Google Fonts (a third party gets the IP address, and the files
could just as well be self-hosted) fits CDNs too. There is no ruling on CDNs specifically, and the
risk is lower because most of them don't use the data for their own purposes. That's why this rule
is a hint, not a warning.

- Art. 6(1) GDPR
- LG München I, 20.01.2022, Az. 3 O 17493/20, by analogy

## How to fix

Install the library with npm (or your package manager) and let your build bundle it, or copy the
files to your own server. That's usually faster too, since it saves a DNS lookup and a connection.

Disable the rule with `--disable third-party-cdns` if you have made a deliberate choice to keep a
CDN.
