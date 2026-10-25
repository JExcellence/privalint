# Security

Please report vulnerabilities privately through
[GitHub's private vulnerability reporting](https://github.com/jexcellence/privalint/security/advisories/new),
not in public issues.

privalint loads arbitrary websites in a headless browser. Reports about sandbox escapes, the
crawler being steered to unintended hosts, or report output that can inject content into CI logs
or job summaries are especially welcome.

Note that Chromium runs with Playwright's default launch options, which disable the Chromium
sandbox. Scanning untrusted sites on a machine with secrets is at your own risk until sandboxing
is configurable.
