// Renders docs/demo.svg from a real scan of test/fixtures/demo.
// Run with `npm run demo` after changing rules or output, so the README image stays honest.
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatText } from '../dist/reporters/text.js';
import { scan } from '../dist/scanner.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SHOWN_ORIGIN = 'https://cafe-morgenrot.example';
const MAX_COLUMNS = 100;
const FONT_SIZE = 13;
const CHAR_WIDTH = 7.85;
const LINE_HEIGHT = 19;
const PADDING = 20;
const TITLE_BAR = 34;

const COLORS = {
  background: '#0d1117',
  bar: '#161b22',
  text: '#c9d1d9',
  dim: '#8b949e',
  red: '#ff7b72',
  yellow: '#e3b341',
  blue: '#79c0ff',
  cyan: '#56d4dd',
  green: '#3fb950',
};

const server = createServer(async (req, res) => {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  const file = join(ROOT, 'test/fixtures', path.endsWith('/') ? `${path}index.html` : path);
  try {
    res.writeHead(200, { 'content-type': 'text/html' }).end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

try {
  const result = await scan(`${origin}/demo/`, { offline: true, settleMs: 500 });
  const output = formatText(result).replaceAll(`${origin}/demo/`, `${SHOWN_ORIGIN}/`);
  const lines = [`$ npx privalint ${SHOWN_ORIGIN}`, ...output.split('\n')];
  await writeFile(join(ROOT, 'docs/demo.svg'), render(lines));
  console.log(`docs/demo.svg written (${result.findings.length} findings)`);
} finally {
  server.close();
}

function render(lines) {
  const width = Math.ceil(MAX_COLUMNS * CHAR_WIDTH + PADDING * 2);
  const height = TITLE_BAR + PADDING * 2 + lines.length * LINE_HEIGHT;
  const rows = lines
    .map((line, index) => {
      const y = TITLE_BAR + PADDING + (index + 1) * LINE_HEIGHT - 5;
      return `<text x="${PADDING}" y="${y}" xml:space="preserve">${colorize(truncate(line))}</text>`;
    })
    .join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="privalint output for a demo page">
  <rect width="${width}" height="${height}" rx="8" fill="${COLORS.background}"/>
  <rect width="${width}" height="${TITLE_BAR}" rx="8" fill="${COLORS.bar}"/>
  <rect y="${TITLE_BAR - 8}" width="${width}" height="8" fill="${COLORS.bar}"/>
  <circle cx="20" cy="17" r="6" fill="#ff5f57"/>
  <circle cx="40" cy="17" r="6" fill="#febc2e"/>
  <circle cx="60" cy="17" r="6" fill="#28c840"/>
  <g font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="${FONT_SIZE}" fill="${COLORS.text}">
  ${rows}
  </g>
</svg>
`;
}

function truncate(line) {
  return line.length > MAX_COLUMNS ? `${line.slice(0, MAX_COLUMNS - 1)}…` : line;
}

function span(color, text) {
  return `<tspan fill="${color}">${escape(text)}</tspan>`;
}

function colorize(line) {
  const mark = line.match(/^(\s+)([✖▲ℹ]) (.*) (\S+)$/u);
  if (mark) {
    const color = { '✖': COLORS.red, '▲': COLORS.yellow, ℹ: COLORS.blue }[mark[2]];
    return `${escape(mark[1])}${span(color, mark[2])} ${escape(mark[3])} ${span(COLORS.dim, mark[4])}`;
  }
  if (line.startsWith('$ ')) {
    return `${span(COLORS.green, '$')}${escape(line.slice(1))}`;
  }
  if (/^\s+fix:/.test(line)) {
    const [indent, rest] = [line.match(/^\s+/)[0], line.trimStart().slice(4)];
    return `${escape(indent)}${span(COLORS.cyan, 'fix:')}${escape(rest)}`;
  }
  const summary = line.match(/^(\d+ errors?), (\d+ warnings?)(.*)$/);
  if (summary) {
    return `${span(COLORS.red, summary[1])}, ${span(COLORS.yellow, summary[2])}${escape(summary[3])}`;
  }
  if (/^\s{6}|^Consent banner|^Automated checks/.test(line)) {
    return span(COLORS.dim, line);
  }
  return escape(line);
}

function escape(text) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
