import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const MARKER = '<!-- privalint -->';
const MAX_BODY = 60_000;

/** No credentials or server response bodies are logged on failure. Forks never issue API calls. */
export async function postPrComment({
  event,
  repository,
  token,
  report,
  apiUrl = 'https://api.github.com',
  fetcher = fetch,
}) {
  const pr = event.pull_request;
  if (
    !pr ||
    !Number.isSafeInteger(pr.number) ||
    pr.number < 1 ||
    pr.head?.repo?.full_name !== repository ||
    pr.base?.repo?.full_name !== repository
  )
    return 'skipped';
  if (!token || !/^[\w.-]+\/[\w.-]+$/.test(repository)) return 'skipped';
  const api = new URL(apiUrl);
  if (api.protocol !== 'https:' || api.username || api.password)
    throw new Error('Invalid GitHub API origin');
  const base = `${api.href.replace(/\/$/, '')}/repos/${repository}`;
  const headers = {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github+json',
    'content-type': 'application/json',
    'x-github-api-version': '2022-11-28',
  };
  const send = (url, options = {}) =>
    fetcher(url, { ...options, headers, redirect: 'error', signal: AbortSignal.timeout(15_000) });
  let existing;
  for (let page = 1; page <= 10; page++) {
    const response = await send(`${base}/issues/${pr.number}/comments?per_page=100&page=${page}`);
    if ([401, 403].includes(response.status)) return 'skipped';
    if (!response.ok) throw new Error('Could not list PR comments');
    const comments = await response.json();
    if (!Array.isArray(comments)) throw new Error('Invalid comment response');
    existing = comments.find(
      (comment) =>
        comment.user?.login === 'github-actions[bot]' &&
        comment.user?.type === 'Bot' &&
        Number.isSafeInteger(comment.id) &&
        comment.body?.startsWith(MARKER),
    );
    if (existing) break;
    if (comments.length < 100) break;
    if (page === 10) return 'skipped'; // Do not create a duplicate beyond bounded pagination.
  }
  const body = `${MARKER}\n${report}`;
  const truncated =
    body.length > MAX_BODY
      ? `${body.slice(0, MAX_BODY - 100)}\n\nReport truncated. See the full workflow summary.`
      : body;
  const response = await send(
    existing ? `${base}/issues/comments/${existing.id}` : `${base}/issues/${pr.number}/comments`,
    {
      method: existing ? 'PATCH' : 'POST',
      body: JSON.stringify({ body: truncated }),
    },
  );
  if ([401, 403].includes(response.status)) return 'skipped';
  if (!response.ok) throw new Error('Could not write PR comment');
  return existing ? 'updated' : 'created';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const report = await readFile(process.env.PRIVALINT_REPORT, 'utf8');
    const status = await postPrComment({
      event,
      report,
      repository: process.env.GITHUB_REPOSITORY,
      token: process.env.GH_TOKEN,
      apiUrl: process.env.GITHUB_API_URL,
    });
    console.log(`privalint PR comment: ${status}`);
  } catch {
    console.log('::warning::privalint could not publish its PR comment. See the workflow summary.');
  }
}
