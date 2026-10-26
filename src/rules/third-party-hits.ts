import type { ThirdParty } from '../data/third-parties.js';
import type { RecordedRequest } from '../types.js';

const MAX_EVIDENCE = 5;

/** Groups requests by the vendor `find` resolves them to. */
export function groupRequestsByVendor(
  requests: readonly RecordedRequest[],
  find: (url: string) => ThirdParty | undefined,
): Map<string, string[]> {
  const byVendor = new Map<string, Set<string>>();
  for (const request of requests) {
    const vendor = find(request.url)?.vendor;
    if (vendor !== undefined) {
      byVendor.set(vendor, (byVendor.get(vendor) ?? new Set()).add(request.url));
    }
  }
  return new Map([...byVendor].map(([vendor, urls]) => [vendor, [...urls].slice(0, MAX_EVIDENCE)]));
}
