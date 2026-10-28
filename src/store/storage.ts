import { StateStorage } from 'zustand/middleware';
import { Entry, SyncPayload, Task } from '../types';

const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const date = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
const task = (value: unknown): value is Task => object(value) && typeof value.id === 'string' &&
    typeof value.text === 'string' && typeof value.completed === 'boolean' && date(value.createdAt);
function snapshot(value: unknown): value is SyncPayload {
    return object(value) && typeof value.rawSpeech === 'string' && typeof value.clientEntryId === 'string' &&
        ['Not started', 'In progress', 'Done'].includes(value.status as string) && date(value.capturedAt) &&
        Array.isArray(value.tasks) && value.tasks.every(t => object(t) && typeof t.text === 'string' && typeof t.completed === 'boolean');
}
export function isStoredEntry(value: unknown): value is Entry {
    return object(value) && typeof value.id === 'string' && Boolean(value.id) && typeof value.rawText === 'string' &&
        typeof value.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.date) && typeof value.time === 'string' && /^\d{2}:\d{2}$/.test(value.time) &&
        date(value.createdAt) && date(value.updatedAt) && Array.isArray(value.tasks) && value.tasks.every(task) &&
        (value.syncStatus === undefined || ['local', 'pending', 'synced', 'failed'].includes(value.syncStatus as string)) &&
        (value.syncError === undefined || typeof value.syncError === 'string') &&
        (value.syncedAt === undefined || date(value.syncedAt)) &&
        (value.syncUncertain === undefined || typeof value.syncUncertain === 'boolean') &&
        (value.syncPayload === undefined || snapshot(value.syncPayload) && value.syncPayload.clientEntryId === value.id &&
            Date.parse(value.syncPayload.capturedAt) === Date.parse(value.createdAt) && value.syncPayload.rawSpeech === value.rawText);
}

export function recoverEntries(entries: Entry[]): Entry[] {
    // Copy data fields only. Persisted state must never replace store actions.
    return entries.map(e => ({
        id: e.id, rawText: e.rawText, date: e.date, time: e.time, createdAt: e.createdAt, updatedAt: e.updatedAt,
        tasks: e.tasks.map(t => ({ id: t.id, text: t.text, completed: t.completed, createdAt: t.createdAt })),
        syncStatus: e.syncStatus === 'pending' ? 'failed' : e.syncStatus,
        syncError: e.syncStatus === 'pending' ? 'Previous sync was interrupted. Check Notion before retrying; a duplicate is possible.' : e.syncError,
        syncUncertain: e.syncStatus === 'pending' || e.syncUncertain,
        syncedAt: e.syncedAt,
        syncPayload: e.syncPayload && {
            rawSpeech: e.syncPayload.rawSpeech, status: e.syncPayload.status, capturedAt: e.syncPayload.capturedAt,
            clientEntryId: e.syncPayload.clientEntryId, tasks: e.syncPayload.tasks.map(t => ({ text: t.text, completed: t.completed })),
        },
    }));
}

export function safeStorage(onIssue: (message: string) => void): StateStorage {
    let writable = true;
    let lastRead: string | null | undefined;
    const fail = (message: string) => {
        if (!writable) return;
        writable = false;
        queueMicrotask(() => onIssue(message));
    };
    return {
        getItem(name) {
            try {
                const raw = localStorage.getItem(name);
                lastRead = raw;
                if (raw === null) return null;
                const parsed = JSON.parse(raw);
                if (!object(parsed) || parsed.version !== 0 || !object(parsed.state) || !Array.isArray(parsed.state.entries) ||
                    !parsed.state.entries.every(isStoredEntry) ||
                    !(parsed.state.lastRolloverDate === null || typeof parsed.state.lastRolloverDate === 'string')) throw new Error('invalid persisted data');
                return raw;
            } catch {
                fail('Saved browser data could not be safely loaded. The original storage is preserved. Do not clear site data; back up hazlo-storage in browser tools before repairing it. New entries are temporary in this tab.');
                return null;
            }
        },
        setItem(name, value) {
            if (!writable) return;
            try {
                if (lastRead !== undefined && localStorage.getItem(name) !== lastRead) {
                    fail('Saved data changed in another tab. Its newer notes are preserved. Back up this tab\'s temporary changes before reloading, and use one active tab to edit.');
                    return;
                }
                localStorage.setItem(name, value);
                lastRead = value;
            } catch {
                fail('Browser storage is unavailable or full. Existing stored notes are preserved; new changes are temporary in this tab. Back up your notes before closing it.');
            }
        },
        removeItem(name) {
            if (writable) try { localStorage.removeItem(name); } catch { /* No automatic deletion or migration. */ }
        },
    };
}
