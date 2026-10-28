import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import { renderServer } from './server.mjs';
import { root } from './lib.mjs';

test('render server exposes approved assets and rejects foreign/private requests', async () => {
  const server = renderServer(root);
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    for (const file of ['/', '/src/film.js', '/v2/index.html', '/assets/capture-manifest.json']) assert.equal((await fetch(base + file)).status, 200);
    for (const file of ['/.env', '/package.json', '/scripts/lib.mjs', '/node_modules/playwright/package.json', '/assets/../package.json', '/assets/%2e%2e/package.json']) assert.equal((await fetch(base + file)).status, 404);
    assert.equal((await fetch(base, { headers: { Origin: 'https://evil.example' } })).status, 404);
    assert.equal((await fetch(base, { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 404);
    const foreignHost = await new Promise((resolve, reject) => {
      const req = http.get(base, { headers: { Host: 'evil.example' } }, res => { res.resume(); resolve(res.statusCode); });
      req.on('error', reject);
    });
    assert.equal(foreignHost, 404);
    assert.equal((await fetch(base, { method: 'POST' })).status, 404);
    assert.equal((await fetch(base)).headers.get('x-content-type-options'), 'nosniff');
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
