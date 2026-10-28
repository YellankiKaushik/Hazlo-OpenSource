import { Entry, SyncPayload } from '../types';

export interface NotionSyncResult {
    ok: boolean;
    error?: string;
    disabled?: boolean;
    uncertain?: boolean;
}

export const isNotionSyncEnabled = () => import.meta.env.VITE_NOTION_SYNC_ENABLED === 'true';
const ENDPOINT = '/api/notion-sync';
const active = new Map<string, { serialized: string; promise: Promise<NotionSyncResult> }>();

export function createSyncPayload(entry: Entry): SyncPayload {
    return entry.syncPayload ?? {
        rawSpeech: entry.rawText,
        status: 'Not started',
        capturedAt: entry.createdAt,
        clientEntryId: entry.id,
        tasks: entry.tasks.map(task => ({ text: task.text, completed: task.completed })),
    };
}

function safeError(status: number, code: string): NotionSyncResult {
    if (code === 'sync_disabled') return { ok: false, disabled: true };
    if (code === 'sync_outcome_unknown') return {
        ok: false, uncertain: true,
        error: 'The sync outcome is unknown. Check Notion before retrying; a retry may create a duplicate page.',
    };
    if (status === 429) return { ok: false, error: 'Sync is rate limited. Wait at least 60 seconds before retrying.' };
    if (status === 409) return { ok: false, uncertain: true, error: 'This entry ID was already used with different content. Check Notion before retrying.' };
    if (status === 413 || (status === 400 && ['transcript_too_long', 'invalid_tasks'].includes(code))) {
        return { ok: false, error: 'This entry exceeds sync limits (20,000 transcript characters, 80 tasks, 2,000 characters per task, 100 KiB JSON). Your full entry is kept locally.' };
    }
    if (code === 'server_not_configured') return { ok: false, error: 'Notion sync needs server configuration. Your entry is saved locally.' };
    return { ok: false, error: 'This entry could not be synced. Check configuration before retrying. Your entry is saved locally.' };
}

async function submit(payload: SyncPayload): Promise<NotionSyncResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
        const response = await fetch(ENDPOINT, {
            method: 'POST', credentials: 'omit', redirect: 'error', cache: 'no-store', signal: controller.signal,
            headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': payload.clientEntryId },
            body: JSON.stringify(payload),
        });
        const body = await response.json().catch(() => null);
        if (response.ok && body?.ok === true && typeof body.pageId === 'string') return { ok: true };
        if (response.ok || response.status === 408 || response.status >= 500 && body?.error !== 'server_not_configured' && body?.error !== 'notion_sync_failed') {
            return safeError(response.status, 'sync_outcome_unknown');
        }
        return safeError(response.status, typeof body?.error === 'string' ? body.error : '');
    } catch {
        return safeError(0, 'sync_outcome_unknown');
    } finally { clearTimeout(timeout); }
}

export async function saveToNotion(entry: Entry): Promise<NotionSyncResult> {
    if (!entry.rawText.trim()) return { ok: false, error: 'Cannot sync an empty entry.' };
    if (!isNotionSyncEnabled()) return { ok: false, disabled: true };
    const payload = createSyncPayload(entry);
    if (payload.rawSpeech.length > 20000 || payload.tasks.length > 80 || payload.tasks.some(task => task.text.length > 2000)) {
        return safeError(400, 'transcript_too_long');
    }
    const serialized = JSON.stringify(payload);
    if (new TextEncoder().encode(serialized).byteLength > 102400) return safeError(413, 'body_too_large');
    const existing = active.get(entry.id);
    if (existing) return existing.serialized === serialized ? existing.promise : safeError(409, 'idempotency_conflict');
    const promise = submit(payload);
    active.set(entry.id, { serialized, promise });
    try { return await promise; } finally { active.delete(entry.id); }
}

/** Checks app configuration only, not Notion connectivity. Never performs a write. */
export async function checkNotionSyncConfiguration(): Promise<boolean> {
    if (!isNotionSyncEnabled()) return false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
        const response = await fetch(ENDPOINT, { method: 'GET', cache: 'no-store', credentials: 'omit', redirect: 'error', signal: controller.signal });
        const body = await response.json();
        return response.ok && body?.enabled === true && body?.configured === true;
    } catch { return false; } finally { clearTimeout(timeout); }
}
