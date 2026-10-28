import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dependency, chromeOptions } from '../promo-video/scripts/lib.mjs';

// Use only after verifying deployment/project/branch/SHA with scoped Vercel metadata.
// Run via `vercel.cmd env run` from a verified isolated local project context.
const target = new URL(process.env.HAZLO_SECURITY_PREVIEW_URL || '');
const sha = process.env.HAZLO_SECURITY_PREVIEW_SHA || '';
if (target.protocol !== 'https:' || !target.hostname.endsWith('.vercel.app') || target.username || target.password ||
    target.pathname !== '/' || target.search || !/^[a-f0-9]{40}$/.test(sha)) throw new Error('Verified Preview URL/SHA required');
if (!process.env.VERCEL_OIDC_TOKEN) throw new Error('Short-lived development OIDC unavailable; do not create a persistent bypass secret');
const token = process.env.VERCEL_OIDC_TOKEN;
const auth = { 'x-vercel-trusted-oidc-idp-token': token };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, 'artifacts/security');
await fs.mkdir(out, { recursive: true });
const report = { preview: target.origin, metadataVerifiedSha: sha, passed: [], blocked: [], headers: {}, api: {}, network: {}, browserErrors: [], cspViolations: [], realNotionWrites: 0 };
const checkedHeaders = ['content-security-policy', 'x-content-type-options', 'referrer-policy', 'x-frame-options', 'strict-transport-security', 'permissions-policy', 'cache-control', 'content-type'];
let browser;
try {
  const config = await fetch(new URL('/api/notion-sync', target), { headers: auth, redirect: 'manual' });
  report.api.configStatus = config.status;
  const configBody = await config.json().catch(() => null);
  if (config.status !== 200 || configBody?.enabled !== false || configBody?.configured !== false) {
    report.blocked.push('Preview API not verified disabled; no POST or browser testing attempted. Protection/config response status: ' + config.status);
  } else {
    report.passed.push('OIDC-authorized configuration GET: enabled=false, configured=false');
    report.api.config = configBody;
    report.api.configHeaders = Object.fromEntries(checkedHeaders.map(name => [name, config.headers.get(name)]));
    const synthetic = await fetch(new URL('/api/notion-sync', target), { method: 'POST', headers: {
      ...auth, Origin: target.origin, 'Content-Type': 'application/json', 'X-Idempotency-Key': 'security-preview-fictional',
    }, body: JSON.stringify({ rawSpeech: 'Fictional security verification; must remain disabled', clientEntryId: 'security-preview-fictional',
      capturedAt: '2026-10-28T00:00:00.000Z', status: 'Not started', tasks: [] }), redirect: 'manual' });
    const rejected = await synthetic.json();
    assert.equal(synthetic.status, 403); assert.equal(rejected.error, 'sync_disabled');
    assert.equal(synthetic.headers.get('cache-control'), 'no-store');
    report.api.syntheticPost = { status: synthetic.status, error: rejected.error, cache: synthetic.headers.get('cache-control') };
    report.passed.push('single fictional Preview POST rejected with sync_disabled/no-store (no enabled Notion write)');
    browser = await dependency('playwright').chromium.launch(chromeOptions);
    const unexpected = [], origins = new Set(), assets = [];
    async function newContext() {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      // Never place the token in global extraHTTPHeaders; scope it to this exact origin.
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        origins.add(url.origin);
        if (url.origin !== target.origin) { unexpected.push(url.origin + url.pathname); return route.abort(); }
        return route.continue({ headers: { ...request.headers(), ...auth } });
      });
      await context.addInitScript(() => document.addEventListener('securitypolicyviolation', e => {
        window.__securityCsp = [...(window.__securityCsp || []), { directive: e.violatedDirective, blocked: e.blockedURI }];
      }));
      return context;
    }
    const context = await newContext(), page = await context.newPage();
    page.on('pageerror', error => report.browserErrors.push(error.message));
    let appPosts = 0;
    page.on('request', req => { if (req.url().endsWith('/api/notion-sync') && req.method() === 'POST') appPosts++; });
    page.on('response', async response => {
      if (response.url().endsWith('.js') && response.url().startsWith(target.origin)) {
        const text = await response.text().catch(() => '');
        assets.push({ path: new URL(response.url()).pathname, status: response.status(), bytes: text.length,
          credentialSignature: /(?:ntn_|secret_)[A-Za-z0-9]{25,}|gh[pousr]_[A-Za-z0-9]{30,}|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY|VITE_API_SECRET|NOTION_TOKEN/.test(text) });
      }
    });
    const home = await page.goto(target.origin, { waitUntil: 'networkidle' });
    report.headers = Object.fromEntries(checkedHeaders.map(name => [name, home.headers()[name] ?? null]));
    for (const header of checkedHeaders.slice(0, 6)) assert.ok(report.headers[header], 'Missing deployed ' + header);
    assert.ok(report.headers['content-security-policy'].includes("script-src 'self'"));
    assert.equal(report.headers['x-content-type-options'], 'nosniff');
    assert.equal(report.headers['x-frame-options'], 'DENY');
    report.passed.push('actual deployed CSP/nosniff/referrer/framing/HSTS/permissions headers');
    await page.getByRole('heading', { name: 'Hazlo by Kaushik', exact: true }).waitFor();
    await page.getByText('Local-only mode.', { exact: false }).waitFor();
    await page.getByRole('button', { name: 'Type instead', exact: true }).click();
    await page.getByLabel('Type instead', { exact: true }).fill('Review the release plan and check the documentation');
    await page.getByRole('button', { name: 'Save entry', exact: true }).click();
    await page.getByText('Tasks (0/2)', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Mark task complete', exact: true }).first().click();
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText('Tasks (1/2)', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Mark task incomplete', exact: true }).click();
    report.passed.push('real deployed manual capture/extraction/task completion+incompletion/refresh persistence');
    await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.getByRole('button', { name: 'Light theme', exact: true }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.getByRole('button', { name: 'System theme', exact: true }).click();
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    report.passed.push('deployed light/dark/system themes and pre-paint persistence');
    const manifest = await context.request.get(new URL('/manifest.webmanifest', target).href, { headers: auth });
    assert.equal((await manifest.json()).name, 'Hazlo by Kaushik');
    for (const icon of ['/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png']) {
      const response = await context.request.get(target.origin + icon, { headers: auth });
      assert.equal(response.status(), 200); assert.ok(response.headers()['content-type'].startsWith('image/png'));
    }
    report.passed.push('deployed manifest and all three PWA icons');
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(out, 'phase2-preview-mobile.png'), fullPage: true });
    report.passed.push('deployed 390px responsive layout/no horizontal overflow');
    await page.getByRole('button', { name: 'Delete task', exact: true }).first().click();
    await page.getByRole('button', { name: 'Delete entry', exact: true }).click();
    assert.equal(await page.locator('article').count(), 0);
    assert.equal(appPosts, 0);
    report.passed.push('deployed task/entry deletion; browser capture emitted zero sync POSTs');
    const recoveryContext = await newContext();
    await recoveryContext.addInitScript(() => localStorage.setItem('hazlo-storage', '{fictional malformed storage'));
    const recovery = await recoveryContext.newPage();
    await recovery.goto(target.origin, { waitUntil: 'networkidle' });
    await recovery.getByRole('alert').filter({ hasText: 'original storage is preserved' }).waitFor();
    assert.equal(await recovery.evaluate(() => localStorage.getItem('hazlo-storage')), '{fictional malformed storage');
    report.passed.push('deployed corrupt-storage warning and original-data preservation');
    report.cspViolations = await page.evaluate(() => window.__securityCsp || []);
    report.network = { origins: [...origins], blockedExternalRequests: [...new Set(unexpected)], javascriptAssets: assets, capturePosts: appPosts };
    assert.equal(assets.some(asset => asset.credentialSignature), false);
    assert.deepEqual(report.browserErrors, []);
    if (report.cspViolations.length) report.blocked.push('CSP violations observed; inspect provider injection separately from application behavior');
    if (unexpected.length) report.blocked.push('External request attempts blocked by test harness; inspect recorded origins before claiming no telemetry');
    report.passed.push('no runtime JavaScript exceptions or credential signatures in loaded JavaScript');
  }
} catch (error) {
  report.blocked.push(error instanceof Error ? error.message : 'Preview check failed');
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await fs.writeFile(path.join(out, 'phase2-preview-' + sha.slice(0, 8) + '.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
if (report.blocked.length) process.exitCode = 1;
