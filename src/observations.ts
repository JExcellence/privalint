import type { RecordedRequest } from './types.js';

/**
 * Legacy records remain valid; failed, pending and HTTP-error responses are not loaded vendors.
 * An omitted beacon or a request the page cancelled itself still counts: the page tried to
 * contact that host, which is what the tracker rules look for.
 */
export const observedRequests = (requests: readonly RecordedRequest[]): RecordedRequest[] =>
  requests.filter(
    (request) =>
      request.outcome === undefined ||
      request.skippedReason === 'beacon' ||
      request.skippedReason === 'cancelled-by-page' ||
      (request.outcome === 'response' && (request.status ?? 200) < 400),
  );
