// ── Core data types ───────────────────────────────────────────────────────────

export interface Task {
    id: string;
    text: string;
    completed: boolean;
    createdAt: string;
}

export type SyncStatus = 'pending' | 'synced' | 'failed';

export interface Entry {
    id: string;
    rawText: string;   // full voice transcript
    tasks: Task[];     // extracted actionable tasks
    syncStatus?: SyncStatus;
    syncedAt?: string;
    syncError?: string;
    date: string;      // YYYY-MM-DD
    time: string;      // HH:mm
    createdAt: string; // ISO 8601
    updatedAt: string; // ISO 8601
}

export interface EntryGroup {
    date: string;
    dateLabel: string;
    entries: Entry[];
}
