import { useEffect, useMemo } from 'react';
import { Header } from '../components/Header';
import { VoiceInput } from '../components/VoiceInput';
import { EntryList } from '../components/EntryList';
import { useHazloStore } from '../store/useStore';
import { groupEntriesByDate } from '../utils/dateUtils';

export function Home() {
    const entries = useHazloStore(state => state.entries);
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
