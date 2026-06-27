import { request as httpRequest, type RequestOptions } from 'node:http';
import { connect as netConnect } from 'node:net';
import { connect as tlsConnect } from 'node:tls';

export type FetchOptions = {
  headers?: Record<string, string>;
  proxy?: string;
};

const PROXY_TIMEOUT = 30_000;

export async function fetchText(url: URL, options?: FetchOptions): Promise<string> {
  const proxyUrl = resolveProxy(options?.proxy, url);

  if (proxyUrl) {
    return fetchViaProxy(url, new URL(proxyUrl), options?.headers);
  }

  return fetchDirect(url, options?.headers);
}

function resolveProxy(proxy: string | undefined, targetUrl: URL): string | undefined {
  if (proxy) return proxy;

  const noProxy = process.env.NO_PROXY ?? process.env.no_proxy;
  if (noProxy && isNoProxy(targetUrl.hostname, noProxy)) return undefined;

  if (process.env.HTTPS_PROXY) return process.env.HTTPS_PROXY;
  if (process.env.HTTP_PROXY) return process.env.HTTP_PROXY;
  if (process.env.https_proxy) return process.env.https_proxy;
  if (process.env.http_proxy) return process.env.http_proxy;
  return undefined;
}

function isNoProxy(hostname: string, noProxy: string): boolean {
  const patterns = noProxy
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  return patterns.some((pattern) => {
    if (pattern === '*') return true;
    if (pattern.startsWith('.')) return hostname.endsWith(pattern) || hostname === pattern.slice(1);
    return hostname === pattern;
  });
}

async function fetchDirect(url: URL, headers?: Record<string, string>): Promise<string> {
  const response = await fetch(url, headers ? { headers } : undefined);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function fetchViaProxy(
  targetUrl: URL,
  proxyUrl: URL,
  headers?: Record<string, string>,
): Promise<string> {
  if (targetUrl.protocol === 'https:') {
    return fetchHttpsViaProxy(targetUrl, proxyUrl, headers);
  }

  return fetchHttpViaProxy(targetUrl, proxyUrl, headers);
}

function fetchHttpViaProxy(
  targetUrl: URL,
  proxyUrl: URL,
  headers?: Record<string, string>,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        hostname: proxyUrl.hostname,
        port: parseInt(proxyUrl.port, 10) || 80,
        path: targetUrl.href,
        method: 'GET',
        headers: { host: targetUrl.host, ...headers },
        timeout: PROXY_TIMEOUT,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode} ${res.statusMessage}`));
          }
        });
      },
    );

    req.on('error', reject);
    req.end();
  });
}

function fetchHttpsViaProxy(
  targetUrl: URL,
  proxyUrl: URL,
  headers?: Record<string, string>,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const targetPort = parseInt(targetUrl.port, 10) || 443;

    const socket = netConnect(parseInt(proxyUrl.port, 10) || 8080, proxyUrl.hostname, () => {
      socket.write(
        `CONNECT ${targetUrl.hostname}:${targetPort} HTTP/1.1\r\nHost: ${targetUrl.hostname}\r\n\r\n`,
      );
    });

    socket.setTimeout(PROXY_TIMEOUT, () => {
      socket.destroy();
      reject(new Error('Proxy CONNECT timed out'));
    });

    let tunnelEstablished = false;

    socket.on('data', (data) => {
      if (tunnelEstablished) return;

      const response = data.toString();
      const statusMatch = response.match(/^HTTP\/\d+\.\d+ (\d+)/);

      if (!statusMatch || statusMatch[1] !== '200') {
        socket.end();
        reject(new Error(`Proxy CONNECT failed: ${response.split('\r\n')[0]}`));
        return;
      }

      tunnelEstablished = true;
      const tlsSocket = tlsConnect({ socket, host: targetUrl.hostname });

      tlsSocket.setTimeout(PROXY_TIMEOUT, () => {
        tlsSocket.destroy();
        reject(new Error('TLS connection timed out'));
      });

      tlsSocket.once('secureConnect', () => {
        const req = httpRequest(
          {
            hostname: targetUrl.hostname,
            port: targetPort,
            path: targetUrl.pathname + targetUrl.search,
            method: 'GET',
            headers: { host: targetUrl.host, ...headers },
            createConnection: () => tlsSocket,
            timeout: PROXY_TIMEOUT,
          } satisfies RequestOptions,
          (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve(body);
              } else {
                reject(new Error(`HTTP ${res.statusCode}`));
              }
            });
          },
        );

        req.on('error', reject);
        req.end();
      });

      tlsSocket.on('error', reject);
    });

    socket.on('error', reject);
  });
}
