import type { APIRequestContext, Response } from 'playwright';
import type { TransportObservation } from './types.js';

const PROBE_TIMEOUT_MS = 10_000;

/**
 * Whether `http://<host>/` sends visitors on to HTTPS. One request, no redirects followed. A refused
 * connection counts as a yes: nothing is served in clear text. DNS problems and timeouts are
 * unknown, not a finding.
 */
export async function probeHttp(
  request: APIRequestContext,
  httpUrl: string,
): Promise<boolean | undefined> {
  try {
    const response = await request.get(httpUrl, {
      maxRedirects: 0,
      timeout: PROBE_TIMEOUT_MS,
      failOnStatusCode: false,
    });
    const location = response.headers().location ?? '';
    const redirects = response.status() >= 300 && response.status() < 400;
    await response.dispose();
    return redirects && new URL(location, httpUrl).protocol === 'https:';
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    return /ECONNREFUSED|ERR_CONNECTION_REFUSED/.test(text) ? true : undefined;
  }
}

/** How the start page travels: scheme, HSTS, and what plain HTTP does on its host. */
export async function observeTransport(
  request: APIRequestContext,
  finalUrl: string,
  response: Response | null,
): Promise<TransportObservation> {
  const url = new URL(finalUrl);
  if (url.protocol !== 'https:') return { https: false };
  const hsts = response?.headers()['strict-transport-security'];
  const httpRedirectsToHttps = await probeHttp(request, `http://${url.hostname}/`);
  return {
    https: true,
    hsts: hsts !== undefined && /max-age=\d*[1-9]/i.test(hsts),
    ...(httpRedirectsToHttps === undefined ? {} : { httpRedirectsToHttps }),
  };
}
