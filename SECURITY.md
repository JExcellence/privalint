# Security

Please report vulnerabilities privately through
[GitHub's private vulnerability reporting](https://github.com/jexcellence/privalint/security/advisories/new),
not in public issues.

privalint loads arbitrary websites in a headless browser. Reports about sandbox escapes, the
crawler being steered to unintended hosts, or report output that can inject content into CI logs
or job summaries are especially welcome.

By default Chromium runs with Playwright's default launch options, which disable the Chromium
sandbox, so that scans work in CI containers. When you scan sites you don't trust on a machine
with secrets, pass `--sandbox` (or `sandbox: true` in the API). If the sandbox can't start,
privalint stops with an error instead of falling back to running without it.
