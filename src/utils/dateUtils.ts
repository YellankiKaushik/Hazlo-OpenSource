import { EntryGroup, Entry } from '../types';

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
    return formatDate(new Date());
}

/**
 * Format a Date object to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format time from Date to HH:mm
 */
export function formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Get a human-readable label for a date
 */
export function getDateLabel(dateStr: string): string {
    const today = getTodayDate();
    const yesterday = getYesterdayDate();
    const tomorrow = getTomorrowDate();

    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    if (dateStr === tomorrow) return 'Tomorrow';

    // Format as "May 21, 2026"
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

/**
 * Get yesterday's date
 */
export function getYesterdayDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return formatDate(date);
}

/**
 * Get tomorrow's date
 */
export function getTomorrowDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return formatDate(date);
}


/**
 * Group entries by date
 */
export function groupEntriesByDate(entries: Entry[]): EntryGroup[] {
    // Sort entries by date (newest first) and time (newest first)
    const sortedEntries = [...entries].sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.time.localeCompare(a.time);
    });

    // Group by date
    const groups: Map<string, Entry[]> = new Map();

    sortedEntries.forEach(entry => {
        const existing = groups.get(entry.date) || [];
        groups.set(entry.date, [...existing, entry]);
    });

    // Convert to array of EntryGroup
    return Array.from(groups.entries()).map(([date, dateEntries]) => ({
        date,
        dateLabel: getDateLabel(date),
        entries: dateEntries,
    }));
}

/**
 * Check if it's midnight and trigger rollover if needed
 */
export function shouldRollover(lastRolloverDate: string | null): boolean {
    if (!lastRolloverDate) return true;

    const today = getTodayDate();
    return lastRolloverDate !== today;
}
