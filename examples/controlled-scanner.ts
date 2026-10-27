import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';
import { type NetworkAdapter, NetworkError, scan } from '../src/index.js';

/**
 * Small, deny-by-default example. Pins are trusted deployment configuration, NOT user input.
 * The operator must vet addresses and run the browser in an egress-restricted worker.
 * Requests never resolve DNS or follow redirects here. Every redirect re-enters the adapter.
 */
export function createPinnedAdapter(pins: ReadonlyMap<string, string>): NetworkAdapter {
  return async ({ url: raw, method, headers, signal }) => {
    const url = new URL(raw);
    const address = pins.get(url.origin);
    const family = address === undefined ? 0 : isIP(address);
    if (
      !/^https?:$/.test(url.protocol) ||
      url.username ||
      url.password ||
      !address ||
      !family ||
      isIP(url.hostname) !== 0 ||
      url.hostname.startsWith('[')
    ) {
      throw new NetworkError('security-blocked');
    }
    if (method !== 'GET' && method !== 'HEAD') throw new NetworkError('unsupported-method');
    const outgoing = Object.fromEntries(
      Object.entries(headers).filter(
        ([name]) =>
          ![
            'host',
            'connection',
            'transfer-encoding',
            'proxy-authorization',
            'accept-encoding',
          ].includes(name.toLowerCase()),
      ),
    );
    const send = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const response = await new Promise<import('node:http').IncomingMessage>((resolve, reject) => {
      const request = send(
        url,
        {
          method,
          signal,
          agent: false,
          headers: {
            ...outgoing,
            host: url.host,
            'accept-encoding': 'identity',
            connection: 'close',
          },
          // Pin the actual socket destination, retaining the original hostname for TLS verification.
          lookup: (_hostname, options, callback) => {
            if (options.all) callback(null, [{ address, family }]);
            else callback(null, address, family);
          },
        },
        resolve,
      );
      request.on('error', reject);
      request.end();
    });
    const responseHeaders: Record<string, string | string[]> = {};
    for (const [name, value] of Object.entries(response.headers)) {
      if (value !== undefined && !['connection', 'transfer-encoding'].includes(name)) {
        responseHeaders[name] = value;
      }
    }
    return { status: response.statusCode ?? 502, headers: responseHeaders, body: response };
  };
}

/** Supply pre-vetted exact origins/IPs and an AbortSignal tied to the client connection. */
export async function scanPublicWebsite(
  url: string,
  pins: ReadonlyMap<string, string>,
  signal: AbortSignal,
) {
  return scan(url, {
    networkAdapter: createPinnedAdapter(pins),
    signal,
    captureTimeoutMs: 45_000,
    timeoutMs: 15_000,
    settleMs: 1_000,
    networkLimits: {
      concurrency: 6,
      maxRequests: 500,
      maxRedirects: 10,
      maxResponseBytes: 5 * 1024 * 1024,
      maxTotalBytes: 20 * 1024 * 1024,
      requestTimeoutMs: 10_000,
    },
    maxDiagnostics: 100,
    failureMode: 'report',
    lang: 'de',
    region: 'de',
  });
}
