import http from 'node:http';
import https from 'node:https';

const httpsAgent = new https.Agent({
  keepAlive: true,
  family: 4,
  maxSockets: 10
});

const httpAgent = new http.Agent({
  keepAlive: true,
  family: 4,
  maxSockets: 10
});

/**
 * Apply permissive CORS headers for local frontend and health checks.
 * @param {http.ServerResponse} res
 */
export function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * Read and parse a JSON request body safely with a maximum byte cap.
 * @param {http.IncomingMessage} req
 * @param {number} [maxBytes]
 * @returns {Promise<Record<string, any>>}
 */
export async function readJsonBody(req, maxBytes = 15 * 1024 * 1024) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > maxBytes) {
      throw new Error('Ukuran berkas terlalu besar (maksimal 10MB).');
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf-8');
  return raw ? JSON.parse(raw) : {};
}

/**
 * Send a JSON HTTP response.
 * @param {http.ServerResponse} res
 * @param {number} statusCode
 * @param {unknown} data
 */
export function sendJson(res, statusCode, data) {
  applyCors(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

/**
 * Write a single Server-Sent Events frame.
 * @param {http.ServerResponse} res
 * @param {string | object} payload
 */
export function writeSse(res, payload) {
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
  res.write(`data: ${data}\n\n`);
}

/**
 * Perform an IPv4-enforced HTTP/HTTPS JSON request with explicit socket timeout.
 * Avoids Node fetch/undici IPv6 stall behavior on Windows networks.
 * @param {{
 *   url: string,
 *   method?: string,
 *   headers?: Record<string, string>,
 *   body?: unknown,
 *   timeoutMs?: number
 * }} options
 * @returns {Promise<{ ok: boolean, status: number, text: string, json: any }>}
 */
export function requestJsonIPv4({
  url,
  method = 'POST',
  headers = {},
  body,
  timeoutMs = 45000
}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttp = parsed.protocol === 'http:';
    const transport = isHttp ? http : https;
    const payloadStr =
      body === undefined
        ? ''
        : typeof body === 'string'
          ? body
          : JSON.stringify(body);

    const requestHeaders = {
      ...headers,
      ...(payloadStr
        ? { 'Content-Length': String(Buffer.byteLength(payloadStr, 'utf-8')) }
        : {})
    };

    const req = transport.request(
      parsed,
      {
        method,
        agent: isHttp ? httpAgent : httpsAgent,
        family: 4,
        timeout: timeoutMs,
        headers: requestHeaders
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf-8');
          let json = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            json = null;
          }
          const status = res.statusCode || 500;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            text,
            json
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error(`Request timeout setelah ${timeoutMs}ms ke ${parsed.hostname}`));
    });
    req.on('error', (err) => {
      reject(err);
    });

    if (payloadStr) {
      req.write(payloadStr);
    }
    req.end();
  });
}
