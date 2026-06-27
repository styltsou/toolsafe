import { request as httpRequest } from 'node:http';
import { connect as netConnect } from 'node:net';
import { connect as tlsConnect } from 'node:tls';

export type FetchOptions = {
  headers?: Record<string, string>;
  proxy?: string;
};

export async function fetchText(url: URL, options?: FetchOptions): Promise<string> {
  const proxyUrl = resolveProxy(options?.proxy);

  if (proxyUrl) {
    return fetchViaProxy(url, new URL(proxyUrl), options?.headers);
  }

  return fetchDirect(url, options?.headers);
}

function resolveProxy(proxy?: string): string | undefined {
  if (proxy) return proxy;
  if (process.env.HTTPS_PROXY) return process.env.HTTPS_PROXY;
  if (process.env.HTTP_PROXY) return process.env.HTTP_PROXY;
  if (process.env.https_proxy) return process.env.https_proxy;
  if (process.env.http_proxy) return process.env.http_proxy;
  return undefined;
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
      socket.write(`CONNECT ${targetUrl.hostname}:${targetPort} HTTP/1.1\r\nHost: ${targetUrl.hostname}\r\n\r\n`);
    });

    let connected = false;

    socket.on('data', (data) => {
      if (connected) return;

      const response = data.toString();
      if (response.includes('200')) {
        connected = true;

        const tlsSocket = tlsConnect({ socket, host: targetUrl.hostname });

        tlsSocket.once('secureConnect', () => {
          const requestLines = [
            `GET ${targetUrl.pathname}${targetUrl.search} HTTP/1.1`,
            `Host: ${targetUrl.host}`,
            ...Object.entries(headers ?? {}).map(([k, v]) => `${k}: ${v}`),
            '',
            '',
          ];
          tlsSocket.write(requestLines.join('\r\n'));
        });

        let buffer = '';
        tlsSocket.on('data', (chunk) => {
          buffer += chunk.toString();
        });

        tlsSocket.on('end', () => {
          const bodyStart = buffer.indexOf('\r\n\r\n');
          if (bodyStart === -1) {
            reject(new Error('No HTTP response body found'));
            return;
          }

          const statusLine = buffer.substring(0, buffer.indexOf('\r\n'));
          const statusMatch = statusLine.match(/HTTP\/\d+\.\d+ (\d+)/);
          const statusCode = statusMatch?.[1] ? parseInt(statusMatch[1], 10) : 0;

          const body = buffer.substring(bodyStart + 4);

          if (statusCode >= 200 && statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`HTTP ${statusCode}`));
          }
        });

        tlsSocket.on('error', reject);
      } else {
        socket.end();
        reject(new Error(`Proxy CONNECT failed: ${response.trim()}`));
      }
    });

    socket.on('error', reject);
  });
}
