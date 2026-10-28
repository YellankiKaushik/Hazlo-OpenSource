import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('security configuration regression', () => {
    it('keeps test runner files outside the deployable Vercel api directory', () => {
        expect(readdirSync(resolve(process.cwd(), 'api')).filter(name => /\.(?:test|spec)\.[cm]?[jt]s$/.test(name))).toEqual([]);
    });
    it('enforces a same-origin script policy while supporting React styles and microphone use', () => {
        const config = JSON.parse(read('vercel.json'));
        const headers = Object.fromEntries(config.headers[0].headers.map((h: { key: string; value: string }) => [h.key, h.value]));
        expect(headers['Content-Security-Policy']).toContain("script-src 'self';");
        expect(headers['Content-Security-Policy']).toContain("style-src 'self' 'unsafe-inline'");
        expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
        expect(headers['Content-Security-Policy']).toContain("connect-src 'self'");
        expect(headers['Permissions-Policy']).toContain('microphone=(self)');
        expect(headers['X-Content-Type-Options']).toBe('nosniff');
        expect(headers['Referrer-Policy']).toBe('no-referrer');
        expect(headers['Strict-Transport-Security']).toBe('max-age=31536000');
    });
    it('loads the pre-paint theme initializer externally for CSP compatibility', () => {
        const html = read('index.html');
        expect(html).toContain('<script src="/theme-init.js"></script>');
        expect(html).not.toMatch(/<script\s*>/);
        const theme = read('public/theme-init.js');
        expect(theme).toContain('hazlo-theme-preference');
        expect(theme).toContain('prefers-color-scheme: dark');
    });
    it('never references legacy frontend credentials or private Notion configuration', () => {
        const client = read('src/services/notion.ts');
        expect(client).not.toMatch(/VITE_API_SECRET|X-API-Secret|NOTION_TOKEN|API_SECRET|VITE_API_BASE_URL/);
        expect(read('.env.example')).toContain('NOTION_SYNC_ENABLED=false');
        expect(read('.env.example')).toContain('VITE_NOTION_SYNC_ENABLED=false');
    });
});
