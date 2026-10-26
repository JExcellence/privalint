# trackers-after-reject

Reports trackers that still load, or set new cookies, after the visitor clicked "reject".

## What it checks

On the start page privalint looks for the consent banner, clicks its reject button, waits for the
network to settle, reloads the page and waits again. Every request and every cookie that is new
since the click is matched against the same tracker list as
[`pre-consent-trackers`](pre-consent-trackers.md).

| Category                                      | Severity |
| --------------------------------------------- | -------- |
| analytics, advertising, session-replay, …     | error    |
| tag-manager (e.g. a GTM container on its own) | warning  |

The reload matters: many broken setups respect the click on the current page but load everything
again on the next page view, for example because the code checks whether _any_ choice was stored
instead of checking which one.

Only the start page is checked, since the banner and its configuration are the same everywhere on a
site. Skip the check with `--skip-consent`.

## Why

A refusal is not a missing consent, it is an explicit no. Processing after that has no legal
basis, and consent that can't be refused is not freely given.

- § 25 Abs. 1 TDDDG
- Art. 6(1)(a) GDPR
- Art. 7(3) GDPR: withdrawing consent must be as easy as giving it

## How to fix

- Check in your consent manager that every tool is assigned to a category, and that the category
  is off by default.
- If you load tags yourself, check for the specific choice (`consent === 'accepted'`, or the
  category flag), not just for whether a choice exists.
- With Google Tag Manager, give every tag a consent requirement or trigger. The container itself is
  reported as a warning.
