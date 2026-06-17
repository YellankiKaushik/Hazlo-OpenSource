import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Entry } from '../types';

function createEntry(overrides: Partial<Entry> = {}): Entry {
    const now = '2026-06-17T00:00:00.000Z';

    return {
        id: 'entry-1',
        rawText: 'Call Maya and send the deck',
        tasks: [
            {
                id: 'task-1',
                text: 'Call Maya',
                completed: false,
                createdAt: now,
            },
        ],
        date: '2026-06-17',
        time: '10:00',
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

function mockResponse(status: number): Response {
    return {
        ok: status >= 200 && status < 300,
        status,
        text: vi.fn().mockResolvedValue(''),
    } as unknown as Response;
}

async function settleRetryTimers<T>(promise: Promise<T>): Promise<T> {
    await vi.runAllTimersAsync();
    return promise;
}

async function getSaveToNotion() {
    vi.resetModules();
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.stubEnv('VITE_API_SECRET', 'test-api-secret');

    const module = await import('./notion');
    return module.saveToNotion;
}

describe('saveToNotion', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    it('returns ok for a successful API response', async () => {
        const saveToNotion = await getSaveToNotion();
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValue(mockResponse(200));

        await expect(saveToNotion(createEntry())).resolves.toEqual({ ok: true });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith('/api/notion-sync', expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
                'Content-Type': 'application/json',
                'X-Idempotency-Key': 'entry-1',
                'X-API-Secret': 'test-api-secret',
            }),
        }));
    });

    it('returns a safe authorization error for 401 responses', async () => {
        const saveToNotion = await getSaveToNotion();
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValue(mockResponse(401));

        await expect(saveToNotion(createEntry())).resolves.toEqual({
            ok: false,
            error: 'Notion sync is not authorized. Check the app configuration.',
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('returns a safe temporary error for 500 responses after retries', async () => {
        const saveToNotion = await getSaveToNotion();
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValue(mockResponse(500));

        const result = await settleRetryTimers(saveToNotion(createEntry()));

        expect(result).toEqual({
            ok: false,
            error: 'Notion sync is temporarily unavailable. Please retry later.',
        });
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('returns a safe network error after retrying fetch failures', async () => {
        const saveToNotion = await getSaveToNotion();
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockRejectedValue(new Error('socket closed'));

        const result = await settleRetryTimers(saveToNotion(createEntry()));

        expect(result).toEqual({
            ok: false,
            error: 'Network error while syncing. Please retry.',
        });
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('does not call the API for empty entries', async () => {
        const saveToNotion = await getSaveToNotion();
        const fetchMock = vi.mocked(fetch);

        await expect(saveToNotion(createEntry({ rawText: '   ' }))).resolves.toEqual({
            ok: false,
            error: 'Cannot sync an empty entry.',
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
