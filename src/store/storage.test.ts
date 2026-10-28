import { afterEach, describe, expect, it, vi } from 'vitest';
import { isStoredEntry, recoverEntries, safeStorage } from './storage';

const entry = () => ({ id: 'legacy123', rawText: 'Keep this old note', tasks: [{ id: 't', text: 'Call Maya', completed: false, createdAt: '2026-06-17T00:00:00Z' }],
    date: '2026-06-17', time: '10:00', createdAt: '2026-06-17T00:00:00Z', updatedAt: '2026-06-17T00:00:00Z' });
const envelope = (entries: unknown[], extra = {}) => JSON.stringify({ state: { entries, lastRolloverDate: null, ...extra }, version: 0 });
afterEach(() => vi.unstubAllGlobals());
describe('defensive browser persistence', () => {
    it('loads old entries and preserves text, IDs, tasks and original timestamps', () => {
        const original = entry();
        vi.stubGlobal('localStorage', { getItem: () => envelope([original]), setItem: vi.fn() });
        const storage = safeStorage(vi.fn());
        expect(storage.getItem('hazlo-storage')).toBe(envelope([original]));
        expect(recoverEntries([original])[0]).toMatchObject(original);
    });
    it('copies only data fields, never injected entry fields', () => {
        const original = { ...entry(), unexpected: 'payload' };
        expect(recoverEntries([original])[0]).not.toHaveProperty('unexpected');
    });
    it.each(['{broken', envelope([null]), envelope([{ ...entry(), tasks: {} }]), envelope([{ ...entry(), createdAt: 'bad' }]),
        JSON.stringify({ state: { entries: [entry()], lastRolloverDate: null }, version: 99 })])('preserves malformed storage instead of overwriting it (%s)', async raw => {
        const setItem = vi.fn(), removeItem = vi.fn(), notify = vi.fn();
        vi.stubGlobal('localStorage', { getItem: () => raw, setItem, removeItem });
        const storage = safeStorage(notify);
        expect(storage.getItem('hazlo-storage')).toBeNull();
        storage.setItem('hazlo-storage', envelope([]));
        storage.removeItem('hazlo-storage');
        await Promise.resolve();
        expect(setItem).not.toHaveBeenCalled(); expect(removeItem).not.toHaveBeenCalled();
        expect(notify).toHaveBeenCalledWith(expect.stringContaining('original storage is preserved'));
    });
    it('retains oversized historic notes locally without truncating them', () => {
        const old = { ...entry(), rawText: 'x'.repeat(30000) };
        expect(isStoredEntry(old)).toBe(true);
        expect(recoverEntries([old])[0].rawText).toHaveLength(30000);
    });
    it('recovers interrupted pending sync as failed/uncertain without automatic submission', () => {
        const restored = recoverEntries([{ ...entry(), syncStatus: 'pending' }])[0];
        expect(restored.syncStatus).toBe('failed'); expect(restored.syncUncertain).toBe(true);
        expect(restored.createdAt).toBe(entry().createdAt);
    });
    it('handles quota errors without throwing or repeatedly overwriting', async () => {
        const notify = vi.fn(), setItem = vi.fn(() => { throw new Error('quota'); });
        vi.stubGlobal('localStorage', { getItem: () => null, setItem });
        const storage = safeStorage(notify);
        expect(() => storage.setItem('hazlo-storage', envelope([]))).not.toThrow();
        storage.setItem('hazlo-storage', envelope([]));
        await Promise.resolve();
        expect(setItem).toHaveBeenCalledTimes(1);
        expect(notify).toHaveBeenCalledWith(expect.stringContaining('temporary in this tab'));
    });
    it('handles blocked reads and retains usable in-tab state', async () => {
        const notify = vi.fn();
        vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); } });
        expect(safeStorage(notify).getItem('hazlo-storage')).toBeNull();
        await Promise.resolve(); expect(notify).toHaveBeenCalledTimes(1);
    });
});
