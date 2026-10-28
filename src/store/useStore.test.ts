import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const saveToNotionMock = vi.fn();
const syncMode = vi.hoisted(() => ({ enabled: true }));

vi.mock('../services/notion', () => ({
    saveToNotion: saveToNotionMock,
    isNotionSyncEnabled: () => syncMode.enabled,
    createSyncPayload: (entry: any) => entry.syncPayload ?? ({ rawSpeech: entry.rawText, capturedAt: entry.createdAt, clientEntryId: entry.id,
        status: 'Not started', tasks: entry.tasks.map((t: any) => ({ text: t.text, completed: t.completed })) }),
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
        syncMode.enabled = true;
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

    it('keeps local-only capture persistent without making a sync request', async () => {
        syncMode.enabled = false;
        const { useHazloStore } = await import('./useStore');
        useHazloStore.getState().addEntry('Call Maya');
        expect(useHazloStore.getState().entries[0].syncStatus).toBe('local');
        expect(useHazloStore.getState().entries[0].id).toMatch(/^[a-f0-9-]{36}$/);
        expect(localStorage.getItem('hazlo-storage')).toContain('Call Maya');
        expect(saveToNotionMock).not.toHaveBeenCalled();
    });

    it('retries original payload after task edits and prevents concurrent retries', async () => {
        saveToNotionMock.mockResolvedValueOnce({ ok: false, uncertain: true, error: 'Check Notion' });
        const { useHazloStore } = await import('./useStore');
        useHazloStore.getState().addEntry('Call Maya and send deck');
        await vi.runAllTimersAsync();
        const original = useHazloStore.getState().entries[0];
        useHazloStore.getState().toggleTaskCompletion(original.id, original.tasks[0].id);
        useHazloStore.getState().retrySyncEntry(original.id);
        useHazloStore.getState().retrySyncEntry(original.id);
        await vi.runAllTimersAsync();
        expect(saveToNotionMock).toHaveBeenCalledTimes(2);
        expect(saveToNotionMock.mock.calls[1][0].syncPayload).toEqual(original.syncPayload);
        expect(useHazloStore.getState().entries[0].createdAt).toBe(original.createdAt);
        expect(useHazloStore.getState().entries[0].tasks[0].completed).toBe(true);
    });

    it('deletes tasks and entries without remote writes', async () => {
        syncMode.enabled = false;
        const { useHazloStore } = await import('./useStore');
        useHazloStore.getState().addEntry('Call Maya');
        const original = useHazloStore.getState().entries[0];
        useHazloStore.getState().deleteTask(original.id, original.tasks[0].id);
        expect(useHazloStore.getState().entries[0].tasks).toHaveLength(0);
        useHazloStore.getState().deleteEntry(original.id);
        expect(useHazloStore.getState().entries).toHaveLength(0);
        expect(saveToNotionMock).not.toHaveBeenCalled();
    });

    it('rolls incomplete tasks forward once as local-only copies with fresh IDs', async () => {
        syncMode.enabled = false;
        const { useHazloStore } = await import('./useStore');
        useHazloStore.getState().addEntry('Call Maya');
        const original = useHazloStore.getState().entries[0];
        vi.advanceTimersByTime(86400000);
        useHazloStore.getState().performMidnightRollover();
        useHazloStore.getState().performMidnightRollover();
        const entries = useHazloStore.getState().entries;
        expect(entries).toHaveLength(2);
        expect(entries[0].id).not.toBe(original.id);
        expect(entries[0].syncStatus).toBe('local');
        expect(entries[0].syncPayload).toBeUndefined();
        expect(entries[1].createdAt).toBe(original.createdAt);
    });

    it('never replaces store actions with persisted properties', async () => {
        const { useHazloStore } = await import('./useStore');
        localStorage.setItem('hazlo-storage', JSON.stringify({ version: 0, state: {
            entries: [], lastRolloverDate: null, addEntry: 'malicious data', isRecording: true,
        } }));
        await useHazloStore.persist.rehydrate();
        expect(typeof useHazloStore.getState().addEntry).toBe('function');
        expect(useHazloStore.getState().isRecording).toBe(false);
    });
});
