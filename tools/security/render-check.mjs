import { once } from 'node:events';
import assert from 'node:assert/strict';
import { renderServer } from '../promo-video/scripts/server.mjs';
import { dependency, root, chromeOptions } from '../promo-video/scripts/lib.mjs';

// Load both editable compositions under the restricted asset server, without re-encoding videos.
const server = renderServer(root);
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const browser = await dependency('playwright').chromium.launch(chromeOptions);
try {
  for (const url of ['/', '/v2/index.html']) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port + url);
    await page.waitForFunction(() => window.filmReady);
    await page.evaluate(async () => { await window.renderFrame(150); });
    assert.deepEqual(errors, []);
    const dimensions = await page.locator('canvas').evaluate(canvas => [canvas.width, canvas.height]);
    assert.deepEqual(dimensions, [1920, 1080]);
    console.log('PASS: sandboxed composition loaded and frame drawn: ' + url);
    await page.close();
  }
} finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
