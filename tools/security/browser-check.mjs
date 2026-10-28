import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { dependency, chromeOptions } from '../promo-video/scripts/lib.mjs';
import { createHandler } from '../../api/notion-sync.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const build = path.resolve(root, process.argv.includes('--enabled') ? 'artifacts/security/enabled' : 'dist');
const out = path.join(root, 'artifacts/security');
await fs.mkdir(out, { recursive: true });
// Never use real integration credentials or permit an upstream write in browser QA.
process.env.NOTION_SYNC_ENABLED = 'false';
const handler = createHandler();
const config = JSON.parse(await fs.readFile(path.join(root, 'vercel.json'), 'utf8'));
const headers = Object.fromEntries(config.headers[0].headers.map(h => [h.key, h.value]));
const server = http.createServer(async (req, res) => {
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
  if (req.url === '/api/notion-sync') {
    req.body = await new Promise(resolve => { let value = ''; req.on('data', c => { value += c; }); req.on('end', () => resolve(value)); });
    res.status = code => { res.statusCode = code; return res; };
    return handler(req, res);
  }
  try {
    const relative = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
    if (relative.includes('..') || relative.includes('\\')) throw new Error('path');
    const target = path.join(build, relative);
    const bytes = await fs.readFile(target);
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
    res.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream');
    res.end(bytes);
  } catch { res.statusCode = 404; res.end('not found'); }
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const base = 'http://127.0.0.1:' + server.address().port;
const { chromium } = dependency('playwright');
const browser = await chromium.launch(chromeOptions);
const passed = [], errors = [];
const enabled = process.argv.includes('--enabled');
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => {
  window.__speechInstances = [];
  window.SpeechRecognition = undefined;
  window.webkitSpeechRecognition = class {
    start() { window.__speechInstances.push(this); this.onstart?.(); }
    stop() { this.onend?.(); }
    abort() { this.onend?.(); }
  };
  document.addEventListener('securitypolicyviolation', e => { window.__cspErrors = [...(window.__cspErrors || []), e.violatedDirective]; });
});
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
let posts = 0;
page.on('request', req => { if (req.url().endsWith('/api/notion-sync') && req.method() === 'POST') posts++; });
try {
  if (enabled) {
    const sent = [];
    await page.route('**/api/notion-sync', async route => {
      sent.push(route.request().postDataJSON());
      await route.fulfill({ status: sent.length === 1 ? 504 : 200, contentType: 'application/json', body: JSON.stringify(sent.length === 1 ? { error: 'sync_outcome_unknown' } : { ok: true, pageId: '22222222-2222-4222-8222-222222222222' }) });
    });
    await page.goto(base);
    await page.getByRole('button', { name: 'Type instead', exact: true }).click();
    await page.getByLabel('Type instead', { exact: true }).fill('Finish landing page and review deployment');
    await page.getByRole('button', { name: 'Save entry', exact: true }).click();
    await page.getByText('Sync failed', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Mark task complete', exact: true }).first().click();
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: 'Retry Notion sync', exact: true }).click();
    assert.equal(sent.length, 1);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Retry Notion sync', exact: true }).click();
    await page.getByText('Synced', { exact: true }).waitFor();
    assert.deepEqual(sent[0], sent[1]);
    passed.push('enabled pipeline with mocked Notion, uncertain retry cancellation/confirmation, stable original payload after edits');
  } else {
    await page.goto(base);
    await page.getByText('Local-only mode.', { exact: false }).waitFor();
    await page.getByRole('button', { name: 'Type instead', exact: true }).click();
    await page.getByLabel('Type instead', { exact: true }).fill('Call Maya and send the deck');
    await page.getByRole('button', { name: 'Save entry', exact: true }).click();
    await page.getByText('Saved locally', { exact: true }).waitFor();
    await page.getByText('Tasks (0/2)', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Mark task complete', exact: true }).first().click();
    await page.reload();
    await page.getByText('Tasks (1/2)', { exact: true }).waitFor();
    passed.push('manual capture, rule-based extraction, task completion and refresh persistence');
    await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.getByRole('button', { name: 'Light theme', exact: true }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.getByRole('button', { name: 'System theme', exact: true }).click();
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    await page.getByRole('combobox', { name: 'Recognition language' }).selectOption('en-US');
    await page.reload();
    assert.equal(await page.getByRole('combobox', { name: 'Recognition language' }).inputValue(), 'en-US');
    passed.push('light/dark/system themes and speech-language persistence under enforced CSP');
    await page.getByRole('button', { name: 'Start voice recording', exact: true }).click();
    await page.evaluate(() => {
      const current = window.__speechInstances.at(-1);
      current.onresult({ resultIndex: 0, results: [{ 0: { transcript: 'Review security changes', confidence: 1 }, length: 1, isFinal: true }] });
    });
    await page.getByRole('button', { name: 'Stop recording and save', exact: true }).click();
    await page.locator('article').filter({ hasText: 'Review security changes' }).waitFor();
    passed.push('webkitSpeechRecognition finalized transcript through the real UI/store pipeline (microphone simulated)');
    await page.getByRole('button', { name: 'Type instead', exact: true }).click();
    const attack = '<img src=x onerror=alert(1)>';
    await page.getByLabel('Type instead', { exact: true }).fill(attack);
    await page.getByRole('button', { name: 'Save entry', exact: true }).click();
    assert.equal(await page.locator('article img').count(), 0);
    await page.getByText(attack, { exact: true }).waitFor();
    assert.equal(posts, 0);
    passed.push('HTML-like input rendered as text; disabled mode makes zero POSTs');
    await page.getByRole('button', { name: 'Delete entry', exact: true }).first().click();
    await page.getByRole('button', { name: 'Delete task', exact: true }).first().click();
    passed.push('entry and task deletion');
    await page.screenshot({ path: path.join(out, 'desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(out, 'mobile.png'), fullPage: true });
    passed.push('responsive 390px layout, no horizontal overflow');
    const manifest = await (await context.request.get(base + '/manifest.webmanifest')).json();
    assert.equal(manifest.name, 'Hazlo by Kaushik');
    const denied = await context.request.post(base + '/api/notion-sync', { data: { rawSpeech: 'fictional' } });
    assert.equal(denied.status(), 403);
    assert.equal(denied.headers()['cache-control'], 'no-store');
    assert.equal((await denied.json()).error, 'sync_disabled');
    passed.push('PWA manifest and actual disabled API/no-store response');
    const corrupt = await browser.newContext();
    await corrupt.addInitScript(() => { localStorage.setItem('hazlo-storage', '{corrupt retained'); });
    const recovery = await corrupt.newPage();
    await recovery.goto(base);
    await recovery.getByRole('alert').filter({ hasText: 'original storage is preserved' }).waitFor();
    await recovery.getByRole('button', { name: 'Type instead', exact: true }).click();
    await recovery.getByLabel('Type instead', { exact: true }).fill('Temporary safe capture');
    await recovery.getByRole('button', { name: 'Save entry', exact: true }).click();
    assert.equal(await recovery.evaluate(() => localStorage.getItem('hazlo-storage')), '{corrupt retained');
    await corrupt.close();
    passed.push('corrupt storage remains unchanged during temporary in-tab capture');
    const tabs = await browser.newContext();
    const tabA = await tabs.newPage(), tabB = await tabs.newPage();
    await tabA.goto(base); await tabB.goto(base);
    await tabB.getByRole('button', { name: 'Type instead', exact: true }).click();
    await tabB.getByLabel('Type instead', { exact: true }).fill('Newer note from another tab');
    await tabB.getByRole('button', { name: 'Save entry', exact: true }).click();
    const newer = await tabB.evaluate(() => localStorage.getItem('hazlo-storage'));
    await tabA.getByRole('button', { name: 'Type instead', exact: true }).click();
    await tabA.getByLabel('Type instead', { exact: true }).fill('Temporary older-tab edit');
    await tabA.getByRole('button', { name: 'Save entry', exact: true }).click();
    await tabA.getByRole('alert').filter({ hasText: 'another tab' }).waitFor();
    assert.equal(await tabA.evaluate(() => localStorage.getItem('hazlo-storage')), newer);
    await tabs.close();
    passed.push('two-tab regression: stale tab warns and cannot overwrite the newer stored note');
  }
  const csp = await page.evaluate(() => window.__cspErrors || []);
  assert.deepEqual(csp, []); assert.deepEqual(errors, []);
  passed.push('zero browser exceptions or CSP violations');
  const report = { mode: enabled ? 'enabled (mocked writes)' : 'local-only', passed, productionWrites: 0 };
  await fs.writeFile(path.join(out, enabled ? 'browser-enabled.json' : 'browser-local.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
