import type { RecordedRequest } from './types.js';

/** Legacy records remain valid; failed, pending and HTTP-error responses are not loaded vendors. */
export const observedRequests = (requests: readonly RecordedRequest[]): RecordedRequest[] =>
  requests.filter(
    (request) =>
      request.outcome === undefined ||
      (request.outcome === 'response' && (request.status ?? 200) < 400),
  );
