import { Entry } from '../types';

interface NotionSyncPayload {
    rawSpeech: string;
    status: 'Not started' | 'In progress' | 'Done';
    clientEntryId?: string;
    tasks?: { text: string; completed: boolean }[];
}

export interface NotionSyncResult {
    ok: boolean;
    error?: string;
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '';
const NOTION_SYNC_ENDPOINT = `${API_BASE}/api/notion-sync`;
const RETRY_DELAYS_MS = [400, 1200];
const isDev = import.meta.env.DEV;
const log = (...args: unknown[]) => {
    if (isDev) console.log(...args);
};
const warn = (...args: unknown[]) => {
    if (isDev) console.warn(...args);
};
const errorLog = (...args: unknown[]) => {
    if (isDev) console.error(...args);
};

function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function shouldRetryStatus(status: number): boolean {
    return status === 408 || status === 429 || status >= 500;
}

function toSafeErrorMessage(status?: number): string {
    if (status === 401) {
        return 'Notion sync is not authorized. Check the app configuration.';
    }

    if (status === 429) {
        return 'Notion is rate limiting sync. Please retry shortly.';
    }

    if (status && status >= 500) {
        return 'Notion sync is temporarily unavailable. Please retry later.';
    }

    if (status) {
        return 'This entry could not be synced. Please retry.';
    }

    return 'Network error while syncing. Please retry.';
}

async function postNotionSync(payload: NotionSyncPayload, attempt: number): Promise<void> {
    let res: Response;

    try {
        res = await fetch(NOTION_SYNC_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Idempotency-Key': payload.clientEntryId ?? '',
                'X-API-Secret': import.meta.env.VITE_API_SECRET || '',
            },
            body: JSON.stringify(payload),
        });
    } catch (_) {
        if (attempt < RETRY_DELAYS_MS.length) {
            await wait(RETRY_DELAYS_MS[attempt]);
            return postNotionSync(payload, attempt + 1);
        }

        throw new Error(toSafeErrorMessage());
    }

    if (res.ok) return;

    await res.text().catch(() => '');

    if (attempt < RETRY_DELAYS_MS.length && shouldRetryStatus(res.status)) {
        await wait(RETRY_DELAYS_MS[attempt]);
        return postNotionSync(payload, attempt + 1);
    }

    throw new Error(toSafeErrorMessage(res.status));
}

export async function saveToNotion(entry: Entry): Promise<NotionSyncResult> {
    log('[Hazlo/Notion] saveToNotion initiated for entry:', entry.id);

    const payload: NotionSyncPayload = {
        rawSpeech: entry.rawText,
        status: 'Not started',
        clientEntryId: entry.id,
        tasks: entry.tasks.map(t => ({ text: t.text, completed: t.completed })),
    };

    if (!payload.rawSpeech.trim()) {
        warn('[Hazlo/Notion] Empty rawSpeech. Sync aborted.');
        return { ok: false, error: 'Cannot sync an empty entry.' };
    }

    try {
        await postNotionSync(payload, 0);
        log(`[Hazlo/Notion] Sync success for ${entry.id}`);
        return { ok: true };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errorLog(`[Hazlo/Notion] Sync failed for ${entry.id}: ${msg}`);
        return { ok: false, error: msg || 'This entry could not be synced. Please retry.' };
    }
}

export async function testNotionConnection(): Promise<boolean> {
    try {
        const res = await fetch(NOTION_SYNC_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Secret': import.meta.env.VITE_API_SECRET || '',
            },
            body: JSON.stringify({
                rawSpeech: '[Hazlo connectivity check]',
                status: 'Not started',
                clientEntryId: 'connectivity-check',
            } satisfies NotionSyncPayload),
        });
        return res.ok;
    } catch (err) {
        errorLog('[Hazlo/Notion] Connection test failed:', err);
        return false;
    }
}
