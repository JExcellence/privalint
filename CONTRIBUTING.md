# Contributing

Thanks for helping. privalint is only as good as its rules and its tracker list, and both grow
with every site people point it at.

## Ways to help

- **Report a false positive or a missed tracker.** These are the most valuable issues. Include the
  URL (or a minimal HTML page that reproduces it) and what you expected.
- **Add a tracker** to [`src/data/trackers.ts`](src/data/trackers.ts). Small PR, big impact.
- **Write a rule.** The roadmap in the README lists the ones we know we want. Issues labelled
  [`good first issue`](https://github.com/jexcellence/privalint/labels/good%20first%20issue) are
  scoped for a first PR.
- **Improve the docs** in [`docs/rules`](docs/rules), especially legal references and fixes for
  specific frameworks.

## Setup

You need Node.js 20.12 or newer.

```bash
git clone https://github.com/jexcellence/privalint.git
cd privalint
npm install
npx playwright install chromium
npm test
```

Useful scripts:

| Command                  |                                                           |
| ------------------------ | --------------------------------------------------------- |
| `npm test`               | Unit tests plus browser tests against local fixture pages |
| `npm run lint`           | Biome lint and format check (`npm run lint:fix` to apply) |
| `npm run typecheck`      | TypeScript without emitting                               |
| `npm run build`          | Compile to `dist/`                                        |
| `node dist/cli.js <url>` | Run your local build                                      |

The test suite never touches the network. Fixture pages live in `test/fixtures`, and
third-party requests are answered with an empty response but still recorded.

## Adding a tracker

Add an entry to the list in `src/data/trackers.ts`:

```ts
{
  vendor: 'Example Analytics',
  category: 'analytics',
  domains: ['cdn.example-analytics.com', 'collect.example-analytics.com'],
  cookies: ['_exa_'],
},
```

- `domains` match the host and all its subdomains. Prefer the narrowest host that only serves
  tracking, so embeds and CDNs from the same company are not flagged by accident.
- `paths` restricts a match to URL paths starting with a prefix, for domains that also serve
  harmless content (see the Meta Pixel entry).
- `cookies` are name prefixes. Only list cookies the vendor's script actually sets.
- Order matters: the first matching entry wins.
- Link the vendor's own documentation for the domains or cookies in your PR description.

Please don't copy entries from Tracker Radar, trackerdb/WhoTracks.me or other lists under a
non-commercial license. privalint is MIT and must stay usable for commercial projects.

## Writing a rule

A rule is a plain object with metadata and a `check` function that turns one page snapshot into
findings. It never touches the browser. That keeps rules fast and easy to test.

1. Create `src/rules/<rule-id>.ts`, using
   [`google-fonts.ts`](src/rules/google-fonts.ts) as a template.
2. Register it in `src/rules/index.ts`.
3. Add unit tests in `test/rules.test.ts` with `snapshot()` from `test/helpers.ts`. Cover at
   least one hit, one clean page and one near miss that must not be flagged.
4. If the rule depends on real browser behaviour, add a fixture page and a case in
   `test/scan.test.ts`.
5. Document it in `docs/rules/<rule-id>.md`: what it checks, why, how to fix it, and
   references.

Guidelines for findings:

- **error** means a clear violation, **warning** means likely problematic or context-dependent,
  **info** is for hints.
- Write messages as plain statements of fact about the page. Put advice in `fix`.
- Always include evidence (URLs, cookie names, element snippets) so people can verify the finding
  themselves.
- Cite a law, ruling or regulator guidance in `references`. If there is none, it probably isn't
  a rule.
- When in doubt, prefer missing something over a false positive. A noisy linter gets disabled.

## Pull requests

- Keep each PR focused on one change.
- `npm run lint`, `npm run typecheck` and `npm test` must pass. CI runs them on Node 20, 22
  and 24.
- Write commit messages in the imperative ("Add Hotjar cookies"), with a short body explaining
  why if it isn't obvious.
- For user-facing changes, add a line under "Unreleased" in [CHANGELOG.md](CHANGELOG.md).

## Releases

Maintainers bump the version in `package.json` and move the "Unreleased" changelog entries
under the new version, then tag `vX.Y.Z` on `main`. The release workflow checks that the tag
matches `package.json`, runs lint, typecheck and tests, publishes to npm with provenance (skipped
with a warning while the `NPM_TOKEN` secret is missing), creates the GitHub release from the
changelog section and moves the major tag (`v0`, `v1`, …) so `uses: jexcellence/privalint@v0`
picks up the release.

## Conduct

Be kind and assume good intent. Harassment or personal attacks get you removed from the project.
Report problems privately to the maintainers via
[GitHub's private reporting](https://github.com/jexcellence/privalint/security/advisories/new) or
by contacting a maintainer directly.
