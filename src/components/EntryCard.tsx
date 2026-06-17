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
    if (status === 'pending') return 'text-amber-700 bg-amber-50';
    if (status === 'failed') return 'text-red-700 bg-red-50';
    return 'text-green-700 bg-green-50';
}

function getSyncDotClassName(status: SyncStatus): string {
    if (status === 'pending') return 'bg-amber-500';
    if (status === 'failed') return 'bg-red-500';
    return 'bg-green-500';
}

export function EntryCard({ entry }: EntryCardProps) {
    const deleteEntry = useHazloStore(state => state.deleteEntry);
    const retrySyncEntry = useHazloStore(state => state.retrySyncEntry);
    const syncStatus = entry.syncStatus ?? 'synced';

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                    {/* Timestamp */}
                    <span className="text-gray-400 text-xs flex items-center gap-1 mb-2">
                        <Clock className="w-3 h-3" />
                        {entry.time}
                    </span>

                    <div className="flex items-center gap-2 mb-3">
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${getSyncClassName(syncStatus)}`}
                            title={syncStatus === 'failed' ? entry.syncError : undefined}
                        >
                            <span className={`h-1.5 w-1.5 rounded-full ${getSyncDotClassName(syncStatus)}`} />
                            {getSyncLabel(syncStatus)}
                        </span>

                        {syncStatus === 'failed' && (
                            <button
                                onClick={() => retrySyncEntry(entry.id)}
                                className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                                title="Retry Notion sync"
                            >
                                <RefreshCw className="w-3 h-3" />
                                Retry
                            </button>
                        )}
                    </div>

                    {/* Raw speech transcript */}
                    <p className="text-gray-800 text-base leading-relaxed">
                        {entry.rawText}
                    </p>
                </div>

                {/* Delete button */}
                <button
                    onClick={() => deleteEntry(entry.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete entry"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Extracted tasks */}
            {entry.tasks.length > 0 && (
                <div className="space-y-2 mt-4 pt-4 border-t border-gray-100">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
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
        </div>
    );
}

export default EntryCard;
