import { describe, expect, it } from 'vitest';
import { MARKER, postPrComment } from '../scripts/pr-comment.mjs';

const repository = 'JExcellence/privalint';
const event = {
  pull_request: {
    number: 16,
    head: { repo: { full_name: repository } },
    base: { repo: { full_name: repository } },
  },
};

describe('PR report comments', () => {
  it('skips forks and missing permissions without trying to post', async () => {
    const calls: string[] = [];
    const fetcher = async (url: string) => {
      calls.push(url);
      return new Response('', { status: 403 });
    };
    expect(
      await postPrComment({
        repository,
        event: {
          pull_request: { ...event.pull_request, head: { repo: { full_name: 'fork/repo' } } },
        },
        token: 'test',
        report: 'report',
        fetcher,
      }),
    ).toBe('skipped');
    expect(calls).toEqual([]);
    expect(
      await postPrComment({ repository, event, token: 'test', report: 'report', fetcher }),
    ).toBe('skipped');
  });
  it('creates one bot comment and preserves escaped Markdown exactly', async () => {
    const calls: Array<{ url: string; options: RequestInit }> = [];
    const report = '### `https://example.org/?![x](https://evil.invalid)`\n';
    const fetcher = async (url: string, options: RequestInit) => {
      calls.push({ url, options });
      return Response.json(options.method === 'POST' ? {} : []);
    };
    expect(await postPrComment({ repository, event, token: 'test', report, fetcher })).toBe(
      'created',
    );
    expect(JSON.parse(String(calls[1]?.options.body))).toEqual({ body: `${MARKER}\n${report}` });
    expect(calls[1]?.options.redirect).toBe('error');
  });
  it('updates only a matching bot comment, following pagination and ignoring forged markers', async () => {
    const calls: Array<{ url: string; method: string | undefined }> = [];
    const fetcher = async (url: string, options: RequestInit) => {
      calls.push({ url, method: options.method });
      if (options.method === 'PATCH') return Response.json({});
      if (url.endsWith('page=1'))
        return Response.json(
          Array.from({ length: 100 }, (_, id) => ({
            id,
            body: MARKER,
            user: { login: 'attacker', type: 'User' },
          })),
        );
      return Response.json([
        { id: 500, body: `${MARKER}\nold`, user: { login: 'github-actions[bot]', type: 'Bot' } },
      ]);
    };
    expect(await postPrComment({ repository, event, token: 'test', report: 'new', fetcher })).toBe(
      'updated',
    );
    expect(calls[2]).toMatchObject({
      url: expect.stringContaining('/issues/comments/500'),
      method: 'PATCH',
    });
  });
  it('bounds oversized comments and never sends the token through a redirect', async () => {
    let body = '';
    const fetcher = async (_url: string, options: RequestInit) => {
      if (!options.method) return Response.json([]);
      body = JSON.parse(String(options.body)).body;
      return Response.json({});
    };
    await postPrComment({ repository, event, token: 'test', report: 'x'.repeat(70_000), fetcher });
    expect(body.length).toBeLessThanOrEqual(60_000);
    expect(body).toContain('Report truncated');
  });
});
