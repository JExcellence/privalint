export const MARKER: string;
interface PullRequestEvent {
  pull_request?: {
    number: number;
    head?: { repo?: { full_name?: string } };
    base?: { repo?: { full_name?: string } };
  };
}
export function postPrComment(options: {
  event: PullRequestEvent;
  repository: string;
  token?: string;
  report: string;
  apiUrl?: string;
  fetcher?: (url: string, options: RequestInit) => Promise<Response>;
}): Promise<'skipped' | 'created' | 'updated'>;
