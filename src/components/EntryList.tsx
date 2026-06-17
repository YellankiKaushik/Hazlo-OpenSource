import { EntryGroup } from '../types';
import { EntryCard } from './EntryCard';

interface EntryListProps {
    groups: EntryGroup[];
}

export function EntryList({ groups }: EntryListProps) {
    if (groups.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No thoughts captured yet
                </h3>
                <p className="text-gray-500 max-w-sm leading-relaxed">
                    Start by speaking your thoughts. Hazlo will extract tasks and sync them to Notion.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-32">
            {groups.map(group => (
                <div key={group.date}>
                    {/* Date Header */}
                    <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3 px-1">
                        {group.dateLabel}
                    </h2>

                    {/* Entries */}
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
