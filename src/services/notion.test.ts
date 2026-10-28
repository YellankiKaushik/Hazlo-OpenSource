import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Entry } from '../types';

const entry = (extra: Partial<Entry> = {}): Entry => ({
    id: 'entry-1', rawText: 'Call Maya and send the deck', tasks: [{ id: 'task-1', text: 'Call Maya', completed: false, createdAt: '2026-06-17T00:00:00.000Z' }],
    date: '2026-06-17', time: '10:00', createdAt: '2026-06-17T00:00:00.000Z', updatedAt: '2026-06-17T00:00:00.000Z', ...extra,
});
const response = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
async function service(enabled = 'true') {
    vi.resetModules(); vi.stubEnv('VITE_NOTION_SYNC_ENABLED', enabled);
    return import('./notion');
}
describe('safe Notion client', () => {
    beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
    afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); vi.restoreAllMocks(); });
    it('uses same-origin JSON without browser secrets or cookies', async () => {
        const { saveToNotion } = await service();
        vi.mocked(fetch).mockResolvedValue(response(200, { ok: true, pageId: 'page' }));
        expect(await saveToNotion(entry())).toEqual({ ok: true });
        const [url, init] = vi.mocked(fetch).mock.calls[0];
        expect(url).toBe('/api/notion-sync');
        expect(init?.credentials).toBe('omit');
        expect(init?.headers).toEqual({ 'Content-Type': 'application/json', 'X-Idempotency-Key': 'entry-1' });
        expect(JSON.parse(init?.body as string)).toMatchObject({ capturedAt: entry().createdAt, tasks: [{ text: 'Call Maya', completed: false }] });
    });
    it.each(['false', '', 'TRUE'])('does not send local-only entries (%s)', async enabled => {
        const { saveToNotion } = await service(enabled);
        expect(await saveToNotion(entry())).toEqual({ ok: false, disabled: true });
        expect(fetch).not.toHaveBeenCalled();
    });
    it('keeps empty and oversized data off the API without losing local text', async () => {
        const { saveToNotion } = await service();
        expect((await saveToNotion(entry({ rawText: ' ' }))).ok).toBe(false);
        expect((await saveToNotion(entry({ rawText: 'x'.repeat(20001) }))).error).toContain('kept locally');
        expect(fetch).not.toHaveBeenCalled();
    });
    it('checks aggregate UTF-8 JSON bytes before sending otherwise valid strings', async () => {
        const { saveToNotion } = await service();
        const large = entry({ rawText: '测'.repeat(20000), tasks: Array.from({ length: 30 }, (_, i) => ({
            id: 'task-' + i, text: '测'.repeat(1000), completed: false, createdAt: entry().createdAt,
        })) });
        expect((await saveToNotion(large)).error).toContain('100 KiB');
        expect(fetch).not.toHaveBeenCalled();
    });
    it('stops after one ambiguous network failure and warns of duplicates', async () => {
        const { saveToNotion } = await service();
        vi.mocked(fetch).mockRejectedValue(new Error('PRIVATE DETAILS'));
        const result = await saveToNotion(entry());
        expect(result.uncertain).toBe(true);
        expect(result.error).toContain('Check Notion before retrying');
        expect(result.error).not.toContain('PRIVATE');
        expect(fetch).toHaveBeenCalledTimes(1);
    });
    it.each([500, 502, 504])('never automatically retries ambiguous HTTP %s', async status => {
        const { saveToNotion } = await service();
        vi.mocked(fetch).mockResolvedValue(response(status, { error: 'sync_outcome_unknown' }));
        expect((await saveToNotion(entry())).uncertain).toBe(true);
        expect(fetch).toHaveBeenCalledTimes(1);
    });
    it.each([408, 409])('requires uncertain-outcome recovery for HTTP %s without a trusted error body', async status => {
        const { saveToNotion } = await service();
        vi.mocked(fetch).mockResolvedValue(response(status, {}));
        expect((await saveToNotion(entry())).uncertain).toBe(true);
        expect(fetch).toHaveBeenCalledTimes(1);
    });
    it('provides explicit manual recovery for rate limits and disabled sync', async () => {
        const { saveToNotion } = await service();
        vi.mocked(fetch).mockResolvedValueOnce(response(429, { error: 'rate_limited' })).mockResolvedValueOnce(response(403, { error: 'sync_disabled' }));
        expect((await saveToNotion(entry())).error).toContain('60 seconds');
        expect(await saveToNotion(entry())).toEqual({ ok: false, disabled: true });
        expect(fetch).toHaveBeenCalledTimes(2);
    });
    it('freezes the original timestamp and first-send task snapshot across retries', async () => {
        const { saveToNotion, createSyncPayload } = await service();
        const original = entry();
        original.syncPayload = createSyncPayload(original);
        vi.mocked(fetch).mockResolvedValue(response(200, { ok: true, pageId: 'page' }));
        await saveToNotion({ ...original, tasks: [], updatedAt: '2026-06-18T00:00:00Z' });
        expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string)).toEqual(original.syncPayload);
    });
    it('coalesces matching concurrent requests in the tab', async () => {
        const { saveToNotion } = await service();
        let release!: (value: Response) => void;
        vi.mocked(fetch).mockImplementation(() => new Promise(resolve => { release = resolve; }));
        const first = saveToNotion(entry()), second = saveToNotion(entry());
        release(response(200, { ok: true, pageId: 'page' }));
        expect(await first).toEqual({ ok: true }); expect(await second).toEqual({ ok: true });
        expect(fetch).toHaveBeenCalledTimes(1);
    });
    it('aborts a hung network request and retains ambiguous recovery', async () => {
        vi.useFakeTimers();
        const { saveToNotion } = await service();
        vi.mocked(fetch).mockImplementation((_, options) => new Promise((_, reject) => {
            options?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }));
        const pending = saveToNotion(entry());
        await vi.advanceTimersByTimeAsync(12000);
        expect((await pending).uncertain).toBe(true);
        expect(fetch).toHaveBeenCalledTimes(1);
    });
    it('uses a non-destructive GET configuration check', async () => {
        const { checkNotionSyncConfiguration } = await service();
        vi.mocked(fetch).mockResolvedValue(response(200, { enabled: true, configured: true }));
        expect(await checkNotionSyncConfiguration()).toBe(true);
        expect(fetch).toHaveBeenCalledWith('/api/notion-sync', expect.objectContaining({ method: 'GET', cache: 'no-store' }));
        expect(vi.mocked(fetch).mock.calls[0][1]?.body).toBeUndefined();
    });
});
