import type { RecordedRequest } from './types.js';

/**
 * Requests that reached the vendor's host. Legacy records remain valid. Any HTTP response counts,
 * 4xx and 5xx included: a tracking pixel that answers 403 has still received the visitor's IP
 * address and referrer. An omitted beacon or a request the page cancelled itself counts too: the
 * page tried to contact that host, which is what the tracker rules look for. Failed and pending
 * requests do not, since they may never have left the browser.
 */
export const observedRequests = (requests: readonly RecordedRequest[]): RecordedRequest[] =>
  requests.filter(
    (request) =>
      request.outcome === undefined ||
      request.outcome === 'response' ||
      request.skippedReason === 'beacon' ||
      request.skippedReason === 'cancelled-by-page',
  );
