import { EventEmitter } from 'node:events';
import type { BrowserContext, Request } from 'playwright';
import { describe, expect, it } from 'vitest';
import { Diagnostics } from '../src/diagnostics.js';
import type { RecordedRequest } from '../src/types.js';

/** Just enough of Playwright's context and request for Diagnostics to listen to. */
function harness() {
  const context = new EventEmitter();
  const diagnostics = new Diagnostics(100);
  const records: RecordedRequest[] = [];
  diagnostics.attach(context as unknown as BrowserContext, records);
  const request = (url: string) => {
    const fake = {
      url: () => url,
      resourceType: () => 'script',
      failure: () => ({ errorText: 'net::ERR_FAILED' }),
    } as unknown as Request;
    context.emit('request', fake);
    return fake;
  };
  return { context, diagnostics, request };
}

describe('Diagnostics', () => {
  it('does not turn a real failure into a cancel when two requests share a URL', () => {
    const { context, diagnostics, request } = harness();
    const url = 'https://example.de/app.js';
    const failed = request(url);
    request(url);
    diagnostics.fail(failed, 'security-blocked');
    diagnostics.cancelledByPage(url);
    context.emit('requestfailed', failed);
    diagnostics.stop();

    const kinds = diagnostics.data.issues.map((issue) => issue.skippedReason ?? issue.kind);
    expect(kinds).toContain('security-blocked');
    expect(kinds).toContain('cancelled-by-page');
    expect(diagnostics.restrictingIssues).toBe(1);
  });

  it('leaves a lone failed request as it is when a cancel for its URL arrives', () => {
    const { context, diagnostics, request } = harness();
    const url = 'https://example.de/app.js';
    const failed = request(url);
    diagnostics.fail(failed, 'security-blocked');
    diagnostics.cancelledByPage(url);
    context.emit('requestfailed', failed);
    diagnostics.stop();

    expect(diagnostics.data.issues.map((issue) => issue.kind)).toEqual(['security-blocked']);
    expect(diagnostics.restrictingIssues).toBe(1);
  });
});
