import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('PWA metadata', () => {
    it('links the manifest and enables safe-area viewport support', () => {
        const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

        expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
        expect(html).toContain('viewport-fit=cover');
        expect(html).toContain('rel="apple-touch-icon"');
    });

    it('defines required installable manifest fields', () => {
        const manifest = JSON.parse(
            readFileSync(resolve(process.cwd(), 'public/manifest.webmanifest'), 'utf8')
        );

        expect(manifest).toEqual(expect.objectContaining({
            name: 'Hazlo by Kaushik',
            short_name: 'Hazlo',
            start_url: '/',
            scope: '/',
            display: 'standalone',
        }));
        expect(manifest.icons).toEqual(expect.arrayContaining([
            expect.objectContaining({ sizes: '192x192', type: 'image/png' }),
            expect.objectContaining({ sizes: '512x512', type: 'image/png' }),
        ]));
    });
});
