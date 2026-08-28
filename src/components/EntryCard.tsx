import { Trash2, Clock, RefreshCw } from 'lucide-react';
import { Entry, SyncStatus } from '../types';
import { TaskItem } from './TaskItem';
import { useHazloStore } from '../store/useStore';

interface EntryCardProps {
    entry: Entry;
}

function getSyncLabel(status: SyncStatus): string {
    if (status === 'pending') return 'Syncing';
    if (status === 'failed') return 'Sync failed';
    return 'Synced';
}

function getSyncClassName(status: SyncStatus): string {
    if (status === 'pending') return 'sync-pill sync-pill--pending';
    if (status === 'failed') return 'sync-pill sync-pill--failed';
    return 'sync-pill sync-pill--synced';
}

function getSyncDotClassName(status: SyncStatus): string {
    if (status === 'pending') return 'sync-dot sync-dot--pending';
    if (status === 'failed') return 'sync-dot sync-dot--failed';
    return 'sync-dot sync-dot--synced';
}

export function EntryCard({ entry }: EntryCardProps) {
    const deleteEntry = useHazloStore(state => state.deleteEntry);
    const retrySyncEntry = useHazloStore(state => state.retrySyncEntry);
    const syncStatus = entry.syncStatus ?? 'synced';

    return (
        <article
            className="rounded-2xl border p-4 transition-shadow duration-200 sm:p-5"
            style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-card)' }}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {entry.time}
                        </span>

                        <span
                            className={getSyncClassName(syncStatus)}
                            title={syncStatus === 'failed' ? entry.syncError : undefined}
                        >
                            <span className={getSyncDotClassName(syncStatus)} />
                            {getSyncLabel(syncStatus)}
                        </span>

                        {syncStatus === 'failed' && (
                            <button
                                type="button"
                                onClick={() => retrySyncEntry(entry.id)}
                                className="retry-button inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-semibold transition-colors"
                                aria-label="Retry Notion sync"
                                title="Retry Notion sync"
                            >
                                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                                Retry
                            </button>
                        )}
                    </div>

                    <p className="overflow-wrap-anywhere text-[0.98rem] leading-7" style={{ color: 'var(--color-text-primary)' }}>
                        {entry.rawText}
                    </p>

                    {syncStatus === 'failed' && entry.syncError && (
                        <p className="mt-2 text-sm leading-6" style={{ color: 'var(--color-error-text)' }}>
                            {entry.syncError}
                        </p>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => deleteEntry(entry.id)}
                    className="destructive-icon-button flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl transition-colors"
                    aria-label="Delete entry"
                    title="Delete entry"
                >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>

            {entry.tasks.length > 0 && (
                <div className="mt-4 space-y-2 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>
                        Tasks ({entry.tasks.filter(t => t.completed).length}/{entry.tasks.length})
                    </span>
                    <div className="space-y-2">
                        {entry.tasks.map(task => (
                            <TaskItem
                                key={task.id}
                                task={task}
                                entryId={entry.id}
                            />
                        ))}
                    </div>
                </div>
            )}
        </article>
    );
}

export default EntryCard;
