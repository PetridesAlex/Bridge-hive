import http from 'node:http';

import { gateDeletionRequest } from '../../../../supabase/functions/delete-worker-account/reauth-gate';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const REQUEST_ID = '22222222-2222-4222-8222-222222222222';
const NOW = 1_700_000_000;

function token(timestamp: number): string {
  const payload = Buffer.from(
    JSON.stringify({ amr: [{ method: 'password', timestamp }] }),
  ).toString('base64url');
  return `e30.${payload}.sig`;
}

async function withServer(
  run: (port: number, prepareCalls: { n: number }) => Promise<void>,
) {
  const prepareCalls = { n: 0 };
  const server = http.createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    let body: unknown = {};
    try {
      body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
    } catch {
      body = {};
    }
    const authorization = req.headers.authorization ?? null;
    const lookupFailed = req.headers['x-user-lookup'] === 'fail';
    const gate = gateDeletionRequest({
      method: req.method ?? 'GET',
      hasServiceConfig: true,
      authorization,
      body,
      user: lookupFailed ? null : { id: USER_ID, is_anonymous: false },
      userLookupFailed: lookupFailed,
      nowSec: NOW,
    });
    if (!gate.proceed) {
      res.writeHead(gate.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(gate.body));
      return;
    }
    prepareCalls.n += 1;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ reached_prepare: true, userId: gate.userId }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port');
  try {
    await run(address.port, prepareCalls);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function post(
  port: number,
  headers: Record<string, string>,
  body: Record<string, unknown>,
) {
  const response = await fetch(`http://127.0.0.1:${port}/delete-worker-account`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as { error?: string; reached_prepare?: boolean };
  return { status: response.status, payload };
}

describe('deletion API bypass of the mobile screen', () => {
  it('rejects an old JWT and a revoked session before any prepare call', async () => {
    await withServer(async (port, prepareCalls) => {
      const stale = await post(
        port,
        { authorization: `Bearer ${token(NOW - 601)}` },
        { client_request_id: REQUEST_ID },
      );
      const revoked = await post(
        port,
        { authorization: `Bearer ${token(NOW)}`, 'x-user-lookup': 'fail' },
        { client_request_id: REQUEST_ID },
      );
      const namedUser = await post(
        port,
        { authorization: `Bearer ${token(NOW)}` },
        { client_request_id: REQUEST_ID, user_id: USER_ID },
      );
      const fresh = await post(
        port,
        { authorization: `Bearer ${token(NOW)}` },
        { client_request_id: REQUEST_ID },
      );

      expect(stale.status).toBe(401);
      expect(stale.payload.error).toBe('reauth_required');
      expect(revoked.status).toBe(401);
      expect(revoked.payload.error).toBe('unauthorized');
      expect(namedUser.status).toBe(400);
      expect(namedUser.payload.error).toBe('invalid_request');
      expect(fresh.status).toBe(200);
      expect(fresh.payload.reached_prepare).toBe(true);
      expect(prepareCalls.n).toBe(1);
    });
  });
});
