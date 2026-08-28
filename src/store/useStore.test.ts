import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const saveToNotionMock = vi.fn();

vi.mock('../services/notion', () => ({
    saveToNotion: saveToNotionMock,
}));

function createMemoryStorage(): Storage {
    const values = new Map<string, string>();

    return {
        get length() {
            return values.size;
        },
        clear: vi.fn(() => values.clear()),
        getItem: vi.fn((key: string) => values.get(key) ?? null),
        key: vi.fn((index: number) => Array.from(values.keys())[index] ?? null),
        removeItem: vi.fn((key: string) => {
            values.delete(key);
        }),
        setItem: vi.fn((key: string, value: string) => {
            values.set(key, value);
        }),
    };
}

describe('Hazlo store entry creation', () => {
    beforeEach(async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-17T08:45:30.000Z'));
        vi.stubGlobal('localStorage', createMemoryStorage());
        saveToNotionMock.mockClear();
        saveToNotionMock.mockResolvedValue({ ok: true });

        const { useHazloStore } = await import('./useStore');
        useHazloStore.setState({
            entries: [],
            lastRolloverDate: null,
            isRecording: false,
            isProcessing: false,
            currentTranscript: '',
            error: null,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('creates a normal entry from manual text and invokes the sync pipeline', async () => {
        const { useHazloStore } = await import('./useStore');

        useHazloStore.getState().addEntry('Remember to pay rent and send receipt');
        await vi.runAllTimersAsync();

        const [entry] = useHazloStore.getState().entries;
        expect(entry.rawText).toBe('Remember to pay rent and send receipt');
        expect(entry.createdAt).toBe('2026-06-17T08:45:30.000Z');
        expect(entry.tasks.map(task => task.text)).toContain('send receipt');
        expect(saveToNotionMock).toHaveBeenCalledWith(expect.objectContaining({
            id: entry.id,
            rawText: entry.rawText,
            createdAt: entry.createdAt,
            syncStatus: 'pending',
        }));
    });

    it('rejects empty manual text without creating or syncing an entry', async () => {
        const { useHazloStore } = await import('./useStore');

        useHazloStore.getState().addEntry('   ');

        expect(useHazloStore.getState().entries).toEqual([]);
        expect(saveToNotionMock).not.toHaveBeenCalled();
    });
});
