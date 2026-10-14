import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createApp } from '../src/server.js';

async function startApp(t, options = {}) {
  const server = createApp({ logger: () => {}, ...options });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeIdleConnections();
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('root returns the configured message and environment', async (t) => {
  const url = await startApp(t, { message: 'Assessment test', environment: 'test' });
  const response = await fetch(url);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    application: 'hrmlabs-devops-demo', message: 'Assessment test', environment: 'test',
  });
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('health endpoint reports a running application', async (t) => {
  const url = await startApp(t);
  const response = await fetch(`${url}/healthz`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, 'ok');
  assert.ok(body.uptimeSeconds >= 0);
});

test('unknown routes return 404', async (t) => {
  const url = await startApp(t);
  const response = await fetch(`${url}/missing`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Not found' });
});

test('unsupported methods return 405 and advertise allowed methods', async (t) => {
  const url = await startApp(t);
  const response = await fetch(url, { method: 'POST' });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, HEAD');
});

test('HEAD returns headers without a body', async (t) => {
  const url = await startApp(t);
  const response = await fetch(`${url}/healthz`, { method: 'HEAD' });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
});
