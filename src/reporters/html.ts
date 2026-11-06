import { say } from '../i18n.js';
import type { Finding, ScanResult, Severity } from '../types.js';
import { captureLines, coverageMessage, isPartial } from './capture.js';
import { messagesFor, type ReportMessages } from './messages.js';
import { countBySeverity, groupByPage, splitSiteWide } from './shared.js';

/**
 * A self-contained HTML report: one file with inline CSS that follows the reader's light or dark
 * setting, and no scripts, fonts, images or links that would load anything.
 *
 * Everything in it comes from the scanned site at some point (URLs, banner labels, vendor names in
 * evidence), so every value is escaped, and a Content-Security-Policy forbids any request even if
 * a value slipped through.
 */
export function formatHtml(result: ScanResult): string {
  const m = messagesFor(result.lang);
  const lang = result.lang;
  const counts = countBySeverity(result.findings);
  const labels: Record<Severity, string> = {
    error: say(lang, { en: 'Error', de: 'Fehler', hu: 'Hiba' }),
    warning: say(lang, { en: 'Warning', de: 'Warnung', hu: 'Figyelmeztetés' }),
    info: say(lang, { en: 'Info', de: 'Hinweis', hu: 'Megjegyzés' }),
  };
  const evidenceLabel = say(lang, { en: 'Evidence', de: 'Belege', hu: 'Bizonyítékok' });
  const body: string[] = [];

  body.push(
    '<header>',
    `<h1>privalint: <code>${escape(result.siteUrl)}</code></h1>`,
    '<p class="counts">',
    ...(['error', 'warning', 'info'] as const).map(
      (severity) =>
        `<span class="badge ${severity}">${escape(labels[severity])}: ${counts[severity]}</span>`,
    ),
    `<span class="muted">${escape(m.scanned(m.pages(result.pages.length)))} · ${escape(m.duration(result.durationMs))}</span>`,
    '</p>',
  );
  const notes: string[] = [];
  if (result.scannerVersion) {
    notes.push(`privalint ${result.scannerVersion} · schema ${result.schemaVersion ?? ''}`);
  }
  if (result.consent !== undefined) notes.push(m.consent(result.consent));
  if (result.baseline !== undefined) notes.push(m.baseline(result.baseline));
  if (isPartial(result)) notes.push(coverageMessage(result));
  if (notes.length > 0) {
    body.push(`<ul class="notes">${notes.map((note) => `<li>${escape(note)}</li>`).join('')}</ul>`);
  }
  // One line per rule and capture issue: useful for an audit, too long for the top of the page.
  const observations = captureLines(result);
  if (observations.length > 0) {
    const summary = say(lang, {
      en: 'Observation details',
      de: 'Details der Beobachtung',
      hu: 'A megfigyelés részletei',
    });
    body.push(
      `<details class="observations"><summary>${escape(summary)} (${observations.length})</summary><ul>`,
      ...observations.map((line) => `<li>${escape(line)}</li>`),
      '</ul></details>',
    );
  }
  body.push('</header>', '<main>');

  if (result.findings.length === 0) {
    body.push(
      `<p class="clean">${escape(isPartial(result) ? coverageMessage(result) : m.noProblems(m.pages(result.pages.length), m.duration(result.durationMs)))}</p>`,
    );
  }

  const { siteWide, perPage } = splitSiteWide(result.findings);
  if (siteWide.length > 0) {
    body.push(`<section><h2>${escape(m.severalPages)}</h2>`);
    for (const { finding, pages } of siteWide) {
      const evidence = [m.onPages(pages.length, result.pages.length), ...pages];
      body.push(findingHtml({ ...finding, evidence }, m, labels, evidenceLabel));
    }
    body.push('</section>');
  }
  for (const [page, findings] of groupByPage(perPage)) {
    body.push(`<section><h2><code>${escape(page)}</code></h2>`);
    for (const finding of bySeverity(findings)) {
      body.push(findingHtml(finding, m, labels, evidenceLabel));
    }
    body.push('</section>');
  }

  const failed = result.pages.filter((page) => page.error !== undefined);
  if (failed.length > 0) {
    body.push(
      `<section><h2>${escape(m.couldNotScan(failed.length))}</h2><ul>`,
      ...failed.map(
        (page) =>
          `<li><code>${escape(page.url)}</code> <span class="muted">${escape(page.error ?? '')}</span></li>`,
      ),
      '</ul></section>',
    );
  }
  const offSite = result.offSiteRedirects ?? [];
  if (offSite.length > 0) {
    body.push(
      `<section><h2>${escape(m.offSite(offSite.length))}</h2><ul>`,
      ...offSite.map(
        ({ url, finalUrl }) =>
          `<li><code>${escape(url)}</code> → <code>${escape(finalUrl)}</code></li>`,
      ),
      '</ul></section>',
    );
  }

  const thirdParties = result.thirdParties ?? [];
  if (thirdParties.length > 0) {
    const [host, vendor, requests, phases] = m.thirdPartyColumns;
    body.push(
      `<section><details><summary>${escape(m.thirdParties(thirdParties.length))}</summary>`,
      `<table><thead><tr><th>${escape(host)}</th><th>${escape(vendor)}</th><th>${escape(requests)}</th><th>${escape(phases)}</th></tr></thead><tbody>`,
      ...thirdParties.map(
        (entry) =>
          `<tr><td><code>${escape(entry.host)}</code></td><td>${escape(entry.vendor ?? '')}</td><td>${entry.requests}</td><td>${escape(entry.phases.join(', '))}</td></tr>`,
      ),
      '</tbody></table></details></section>',
    );
  }

  body.push('</main>', `<footer>${escape(m.disclaimer)}</footer>`);

  return `<!doctype html>
<html lang="${escape(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<meta name="referrer" content="no-referrer">
<title>privalint: ${escape(hostOf(result.siteUrl))}</title>
<style>${STYLE}</style>
</head>
<body>
${body.join('\n')}
</body>
</html>
`;
}

const ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

function bySeverity(findings: readonly Finding[]): Finding[] {
  return [...findings].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}

function findingHtml(
  finding: Finding,
  m: ReportMessages,
  labels: Record<Severity, string>,
  evidenceLabel: string,
): string {
  const parts = [
    `<article class="finding ${finding.severity}">`,
    '<p class="title">',
    `<span class="badge ${finding.severity}">${escape(labels[finding.severity])}</span> `,
    escape(finding.message),
    ` <code class="rule">${escape(finding.ruleId)}</code>`,
    finding.baseline === 'new' ? ` <span class="new">${escape(m.newFinding)}</span>` : '',
    '</p>',
  ];
  if (finding.policy) {
    parts.push(
      `<p class="muted">${escape(m.policy(finding.policy.allowed, finding.policy.originalSeverity))}</p>`,
    );
  }
  if (finding.evidence.length > 0) {
    parts.push(
      `<details><summary>${escape(evidenceLabel)} (${finding.evidence.length})</summary><ul>`,
      ...finding.evidence.map((item) => `<li><code>${escape(item)}</code></li>`),
      '</ul></details>',
    );
  }
  if (finding.fix) {
    parts.push(`<p class="fix"><strong>${escape(m.fix)}</strong> ${escape(finding.fix)}</p>`);
  }
  if (finding.references !== undefined && finding.references.length > 0) {
    parts.push(
      `<p class="muted">${escape(m.legalBasis)} ${escape(finding.references.join('; '))}</p>`,
    );
  }
  parts.push('</article>');
  return parts.join('');
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapes text for HTML element content and quoted attribute values. */
export const escape = (text: string): string => text.replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);

const STYLE = `
:root{color-scheme:light dark;--bg:#ffffff;--fg:#1d2433;--muted:#5b6474;--line:#d9dee7;--card:#f6f8fb;--code:#eef1f6;--error:#b42318;--warning:#9a6700;--info:#1f5fbf;--new:#7a3fbf}
@media (prefers-color-scheme:dark){:root{--bg:#12151c;--fg:#e6e9ef;--muted:#9aa3b2;--line:#2b313d;--card:#191d26;--code:#232835;--error:#ff6b5e;--warning:#e3b341;--info:#6ea8ff;--new:#c08bff}}
*{box-sizing:border-box}
body{overflow-wrap:anywhere;margin:0 auto;max-width:960px;padding:24px 16px 48px;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
h1{font-size:1.4rem;margin:0 0 8px;overflow-wrap:anywhere}
h2{font-size:1.05rem;margin:32px 0 12px;overflow-wrap:anywhere}
code{font:0.9em/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;background:var(--code);padding:1px 4px;border-radius:4px;overflow-wrap:anywhere}
.counts{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
.badge{display:inline-block;padding:1px 8px;border-radius:999px;font-size:0.8rem;font-weight:600;color:var(--bg)}
.badge.error{background:var(--error)}.badge.warning{background:var(--warning)}.badge.info{background:var(--info)}
.muted,.notes{color:var(--muted)}
.notes,.observations ul{padding-left:20px;margin:8px 0;font-size:0.9rem}.observations{color:var(--muted)}
.finding{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--info);border-radius:6px;padding:12px 14px;margin:0 0 12px}
.finding.error{border-left-color:var(--error)}.finding.warning{border-left-color:var(--warning)}
.finding p{margin:4px 0}
.title{font-weight:500}
.rule{color:var(--muted)}
.new{color:var(--new);font-weight:600;font-size:0.85rem}
details{margin:6px 0}
summary{cursor:pointer;color:var(--muted)}
details ul{margin:6px 0;padding-left:20px}
.fix strong{color:var(--fg)}
table{border-collapse:collapse;width:100%;margin-top:8px;font-size:0.9rem}
th,td{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top;overflow-wrap:anywhere}
.clean{font-weight:500}
footer{margin-top:40px;padding-top:12px;border-top:1px solid var(--line);color:var(--muted);font-size:0.85rem}
`
  .trim()
  .replaceAll('\n', '');
