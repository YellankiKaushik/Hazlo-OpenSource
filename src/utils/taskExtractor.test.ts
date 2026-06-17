import { beforeEach, describe, expect, it, vi } from 'vitest';
import { extractTasks } from './taskExtractor';

function taskTexts(input: string): string[] {
    return extractTasks(input).map(task => task.text);
}

beforeEach(() => {
    let id = 0;
    vi.stubGlobal('crypto', {
        randomUUID: vi.fn(() => `task-${++id}`),
    });
});

describe('extractTasks', () => {
    it('extracts numbered task lists', () => {
        expect(taskTexts('1. Call mom\n2. Send the report')).toEqual([
            'Call mom',
            'Send the report',
        ]);
    });

    it('extracts bullet task lists', () => {
        expect(taskTexts('- Buy milk\n* Book dentist')).toEqual([
            'Buy milk',
            'Book dentist',
        ]);
    });

    it('extracts simple and-separated tasks', () => {
        expect(taskTexts('Call Ana and email Sam')).toEqual([
            'Call Ana',
            'email Sam',
        ]);
    });

    it('treats a short imperative sentence as one task', () => {
        expect(taskTexts('Finish budget review')).toEqual([
            'Finish budget review',
        ]);
    });

    it('returns no tasks for empty input', () => {
        expect(taskTexts('   ')).toEqual([]);
    });

    it('returns no tasks for noisy text without clear tasks', () => {
        expect(taskTexts('I had a vague thought about the weekend and the weather.')).toEqual([]);
    });

    it('extracts multiple actions from longer spoken text', () => {
        const input = [
            'Call Maya and send the deck.',
            'Later I might think about lunch.',
            '1. Review contract',
            '2. Book venue',
        ].join('\n');

        expect(taskTexts(input)).toEqual([
            'Review contract',
            'Book venue',
            'Call Maya',
            'send the deck',
        ]);
    });
});
