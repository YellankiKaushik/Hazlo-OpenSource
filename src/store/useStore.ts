import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Entry } from '../types';
import { extractTasks } from '../utils/taskExtractor';
import { formatDate, formatTime, getTodayDate, shouldRollover, getYesterdayDate } from '../utils/dateUtils';
import { saveToNotion } from '../services/notion';

// ── Types ──────────────────────────────────────────────────────────────────────

interface HazloState {
    // Data
    entries: Entry[];
    lastRolloverDate: string | null;

    // Voice state
    isRecording: boolean;
    isProcessing: boolean;
    currentTranscript: string;
    error: string | null;

    // Entry actions
    addEntry: (rawText: string) => void;
    deleteEntry: (id: string) => void;
    retrySyncEntry: (entryId: string) => void;
    toggleTaskCompletion: (entryId: string, taskId: string) => void;
    deleteTask: (entryId: string, taskId: string) => void;

    // Voice actions
    setRecording: (recording: boolean) => void;
    setProcessing: (processing: boolean) => void;
    setTranscript: (transcript: string | ((prev: string) => string)) => void;
    setError: (error: string | null) => void;
    clearTranscript: () => void;

    // Rollover
    performMidnightRollover: () => void;

    // Getters
    getEntriesByDate: () => Entry[];
    getTodayEntries: () => Entry[];
    getIncompleteTasks: () => { entry: Entry; task: Entry['tasks'][0] }[];
}

const generateId = () => Math.random().toString(36).substring(2, 11);

// ── Store ──────────────────────────────────────────────────────────────────────

export const useHazloStore = create<HazloState>()(
    persist(
        (set, get) => {
            const applySyncResult = async (entry: Entry) => {
                const result = await saveToNotion(entry);
                const nowIso = new Date().toISOString();

                set(state => ({
                    entries: state.entries.map(current => {
                        if (current.id !== entry.id) return current;

                        if (result.ok) {
                            return {
                                ...current,
                                syncStatus: 'synced',
                                syncedAt: nowIso,
                                syncError: undefined,
                                updatedAt: nowIso,
                            };
                        }

                        return {
                            ...current,
                            syncStatus: 'failed',
                            syncError: result.error || 'This entry could not be synced. Please retry.',
                            updatedAt: nowIso,
                        };
                    }),
                }));
            };

            return ({
            // Initial state
            entries: [],
            lastRolloverDate: null,
            isRecording: false,
            isProcessing: false,
            currentTranscript: '',
            error: null,

            // ── Add entry ─────────────────────────────────────────────────────

            addEntry: (rawText: string) => {
                console.log('[Hazlo/Store] addEntry called with text:', rawText);
                if (typeof rawText !== 'string' || !rawText.trim()) {
                    console.warn('[Hazlo/Store] addEntry aborted: rawText is empty or invalid.');
                    return;
                }

                const now = new Date();
                const tasks = extractTasks(rawText);
                console.log('[Hazlo/Store] Extracted tasks:', tasks);

                const newEntry: Entry = {
                    id: generateId(),
                    rawText: rawText.trim(),
                    tasks,
                    syncStatus: 'pending',
                    syncError: undefined,
                    date: formatDate(now),
                    time: formatTime(now),
                    createdAt: now.toISOString(),
                    updatedAt: now.toISOString(),
                };

                // 1. Commit to localStorage immediately (synchronous, reliable)
                set(state => {
                    console.log('[Hazlo/Store] Committing new entry to state and clearing draft.');
                    return {
                        entries: [newEntry, ...state.entries],
                        currentTranscript: '',
                        error: null,
                    };
                });

                // 2. Fire-and-forget Notion sync (never blocks UI or localStorage)
                console.log('[Hazlo/Store] Triggering Notion background sync for entry:', newEntry.id);
                applySyncResult(newEntry).catch(err => {
                    console.error('[Hazlo/Notion] Unhandled background sync error:', err);
                });
            },

            // ── Delete entry ──────────────────────────────────────────────────

            deleteEntry: (id: string) => {
                set(state => ({
                    entries: state.entries.filter(e => e.id !== id),
                }));
            },

            retrySyncEntry: (entryId: string) => {
                const entry = get().entries.find(e => e.id === entryId);
                if (!entry || entry.syncStatus !== 'failed') return;

                const nowIso = new Date().toISOString();
                const retryEntry: Entry = {
                    ...entry,
                    syncStatus: 'pending',
                    syncError: undefined,
                    updatedAt: nowIso,
                };

                set(state => ({
                    entries: state.entries.map(current =>
                        current.id === entryId ? retryEntry : current
                    ),
                }));

                applySyncResult(retryEntry).catch(err => {
                    console.error('[Hazlo/Notion] Unhandled retry sync error:', err);
                });
            },

            // ── Task actions ──────────────────────────────────────────────────

            toggleTaskCompletion: (entryId: string, taskId: string) => {
                set(state => ({
                    entries: state.entries.map(entry => {
                        if (entry.id !== entryId) return entry;
                        return {
                            ...entry,
                            tasks: entry.tasks.map(task =>
                                task.id === taskId
                                    ? { ...task, completed: !task.completed }
                                    : task
                            ),
                            updatedAt: new Date().toISOString(),
                        };
                    }),
                }));
            },

            deleteTask: (entryId: string, taskId: string) => {
                set(state => ({
                    entries: state.entries.map(entry => {
                        if (entry.id !== entryId) return entry;
                        return {
                            ...entry,
                            tasks: entry.tasks.filter(t => t.id !== taskId),
                            updatedAt: new Date().toISOString(),
                        };
                    }),
                }));
            },

            // ── Voice state setters ───────────────────────────────────────────

            setRecording: (recording: boolean) => set({ isRecording: recording }),
            setProcessing: (processing: boolean) => set({ isProcessing: processing }),

            setTranscript: (transcript: string | ((prev: string) => string)) => {
                set(state => {
                    const newTranscript = typeof transcript === 'function'
                        ? transcript(typeof state.currentTranscript === 'string' ? state.currentTranscript : '')
                        : (typeof transcript === 'string' ? transcript : '');
                    console.log('[Hazlo/Store] setTranscript updated to:', newTranscript);
                    return {
                        currentTranscript: newTranscript
                    };
                });
            },

            setError: (error: string | null) => set({ error }),
            clearTranscript: () => set({ currentTranscript: '' }),

            // ── Midnight rollover ─────────────────────────────────────────────

            performMidnightRollover: () => {
                const { lastRolloverDate, entries } = get();
                if (!shouldRollover(lastRolloverDate)) return;

                const yesterday = getYesterdayDate();
                const today = getTodayDate();

                const entriesWithIncompleteTasks = entries
                    .filter(e => e.date === yesterday)
                    .filter(e => e.tasks.some(t => !t.completed));

                if (entriesWithIncompleteTasks.length === 0) {
                    set({ lastRolloverDate: today });
                    return;
                }

                const now = new Date();
                const rolledOver = entriesWithIncompleteTasks.map(entry => ({
                    ...entry,
                    id: generateId(),
                    date: today,
                    time: formatTime(now),
                    createdAt: now.toISOString(),
                    updatedAt: now.toISOString(),
                    tasks: entry.tasks
                        .filter(t => !t.completed)
                        .map(t => ({ ...t, id: generateId(), createdAt: now.toISOString() })),
                }));

                set(state => ({
                    entries: [...rolledOver, ...state.entries],
                    lastRolloverDate: today,
                }));
            },

            // ── Getters ───────────────────────────────────────────────────────

            getEntriesByDate: () => {
                const { entries } = get();
                return [...entries].sort((a, b) => {
                    const d = b.date.localeCompare(a.date);
                    return d !== 0 ? d : b.time.localeCompare(a.time);
                });
            },

            getTodayEntries: () => {
                const today = getTodayDate();
                return get().entries.filter(e => e.date === today);
            },

            getIncompleteTasks: () => {
                const result: { entry: Entry; task: Entry['tasks'][0] }[] = [];
                get().entries.forEach(entry => {
                    entry.tasks.forEach(task => {
                        if (!task.completed) result.push({ entry, task });
                    });
                });
                return result;
            },
            });
        },
        {
            name: 'hazlo-storage',
            partialize: state => ({
                entries: state.entries,
                lastRolloverDate: state.lastRolloverDate,
            }),
        }
    )
);
