import { EntryGroup } from '../types';
import { EntryCard } from './EntryCard';

interface EntryListProps {
    groups: EntryGroup[];
}

export function EntryList({ groups }: EntryListProps) {
    if (groups.length === 0) {
        return (
            <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border px-6 py-12 text-center shadow-sm sm:py-14" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'var(--color-subtle)', color: 'var(--color-text-secondary)' }}>
                    <span className="text-xl" aria-hidden="true">+</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    No thoughts captured yet
                </h3>
                <p className="max-w-sm text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
                    Tap the microphone, speak naturally, and Hazlo by Kaushik will extract tasks and save the entry.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-7">
            {groups.map(group => (
                <div key={group.date}>
                    <h2 className="mb-3 px-1 text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>
                        {group.dateLabel}
                    </h2>

                    <div className="space-y-3">
                        {group.entries.map(entry => (
                            <EntryCard key={entry.id} entry={entry} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default EntryList;
