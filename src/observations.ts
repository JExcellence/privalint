import type { RecordedRequest } from './types.js';

/**
 * Legacy records remain valid; failed, pending and HTTP-error responses are not loaded vendors.
 * An omitted beacon still counts: the page tried to send data to that host, which is what the
 * tracker rules look for.
 */
export const observedRequests = (requests: readonly RecordedRequest[]): RecordedRequest[] =>
  requests.filter(
    (request) =>
      request.outcome === undefined ||
      request.skippedReason === 'beacon' ||
      (request.outcome === 'response' && (request.status ?? 200) < 400),
  );
