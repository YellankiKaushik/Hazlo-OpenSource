import { useEffect, useMemo } from 'react';
import { Header } from '../components/Header';
import { VoiceInput } from '../components/VoiceInput';
import { EntryList } from '../components/EntryList';
import { useHazloStore } from '../store/useStore';
import { groupEntriesByDate } from '../utils/dateUtils';
import { isNotionSyncEnabled } from '../services/notion';

export function Home() {
    const entries = useHazloStore(state => state.entries);
    const storageWarning = useHazloStore(state => state.storageWarning);
    const performMidnightRollover = useHazloStore(state => state.performMidnightRollover);

    const groupedEntries = useMemo(() => groupEntriesByDate(entries), [entries]);
    const incompleteTasks = useMemo(() => entries.flatMap(entry =>
        entry.tasks.filter(t => !t.completed).map(task => ({ entry, task }))
    ), [entries]);

    // Check for midnight rollover on mount
    useEffect(() => {
        performMidnightRollover();
    }, [performMidnightRollover]);

    return (
        <div className="app-shell">
            <Header />

            <main className="app-container pb-[24rem] pt-5 sm:pb-[23rem] sm:pt-6">
                {!isNotionSyncEnabled() && <p className="mb-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>Local-only mode. Entries stay in this browser; Notion sync is disabled.</p>}
                {storageWarning && <p role="alert" className="mb-5 rounded-xl border p-4" style={{ color: 'var(--color-error-text)' }}>{storageWarning}</p>}
                {incompleteTasks.length > 0 && (
                    <div
                        className="mb-5 rounded-xl border px-4 py-3 shadow-sm"
                        style={{ background: 'var(--color-warning-bg)', borderColor: 'var(--color-border)', color: 'var(--color-warning-text)' }}
                    >
                        <span className="text-sm font-medium">
                            {incompleteTasks.length} pending task{incompleteTasks.length > 1 ? 's' : ''}
                        </span>
                    </div>
                )}

                <EntryList groups={groupedEntries} />
            </main>

            <VoiceInput />
        </div>
    );
}

export default Home;
