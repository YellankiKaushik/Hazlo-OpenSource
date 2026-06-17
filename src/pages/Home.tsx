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
        <div className="min-h-screen bg-[#FAFAFA]">
            <Header />

            <main className="max-w-2xl mx-auto px-4 py-6">
                {/* Pending tasks banner */}
                {incompleteTasks.length > 0 && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                        <span className="font-medium text-amber-800">
                            {incompleteTasks.length} pending task{incompleteTasks.length > 1 ? 's' : ''}
                        </span>
                    </div>
                )}

                {/* Entry list */}
                <EntryList groups={groupedEntries} />
            </main>

            {/* Voice input fixed at bottom */}
            <VoiceInput />
        </div>
    );
}

export default Home;
