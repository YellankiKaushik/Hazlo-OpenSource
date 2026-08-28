import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    getDefaultSpeechLanguage,
    getSpeechRecognitionConstructor,
    loadSpeechLanguage,
    persistSpeechLanguage,
    SpeechRecognitionController,
    SpeechRecognitionLike,
    SpeechRecognitionResultEventLike,
    SPEECH_LANGUAGE_STORAGE_KEY,
} from './speechRecognition';

class MockRecognition implements SpeechRecognitionLike {
    static instances: MockRecognition[] = [];

    continuous = false;
    interimResults = false;
    lang = '';
    maxAlternatives = 0;
    startCalls = 0;
    stopCalls = 0;
    abortCalls = 0;
    onresult: SpeechRecognitionLike['onresult'] = null;
    onerror: SpeechRecognitionLike['onerror'] = null;
    onend: SpeechRecognitionLike['onend'] = null;
    onstart: SpeechRecognitionLike['onstart'] = null;

    constructor() {
        MockRecognition.instances.push(this);
    }

    start(): void {
        this.startCalls += 1;
        this.onstart?.();
    }

    stop(): void {
        this.stopCalls += 1;
    }

    abort(): void {
        this.abortCalls += 1;
    }

    emitResult(event: SpeechRecognitionResultEventLike): void {
        this.onresult?.(event);
    }

    emitError(error: string): void {
        this.onerror?.({ error });
    }

    emitEnd(): void {
        this.onend?.();
    }
}

function createResultEvent(resultIndex: number, results: Array<{ transcript: string; isFinal: boolean }>): SpeechRecognitionResultEventLike {
    return {
        resultIndex,
        results: Object.assign(
            results.map(result => Object.assign([{ transcript: result.transcript }], { isFinal: result.isFinal })),
            { length: results.length }
        ),
    } as SpeechRecognitionResultEventLike;
}

function createController(options: Partial<ConstructorParameters<typeof SpeechRecognitionController>[0]> = {}) {
    const statuses: string[] = [];
    const errors: Array<string | null> = [];
    const transcripts: string[] = [];
    const finalTranscripts: string[] = [];

    const controller = new SpeechRecognitionController({
        createRecognition: () => new MockRecognition(),
        restartDelayMs: 10,
        callbacks: {
            onStatusChange: status => statuses.push(status),
            onErrorChange: error => errors.push(error),
            onTranscriptChange: state => transcripts.push(state.displayTranscript),
            onFinalTranscript: text => finalTranscripts.push(text),
        },
        ...options,
    });

    return { controller, statuses, errors, transcripts, finalTranscripts };
}

describe('speech recognition utilities', () => {
    beforeEach(() => {
        MockRecognition.instances = [];
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('reports unsupported browsers without constructing recognition', () => {
        const { controller, statuses, errors } = createController({
            createRecognition: () => null,
        });

        expect(controller.start('en-US')).toBe(false);
        expect(statuses).toContain('unsupported');
        expect(errors.at(-1)).toBe('Browser does not support voice recognition. Type instead.');
    });

    it('detects the prefixed speech recognition constructor safely', () => {
        const mockWindow = {
            webkitSpeechRecognition: MockRecognition,
        } as unknown as Window;

        expect(getSpeechRecognitionConstructor(mockWindow)).toBe(MockRecognition);
    });

    it('sets the selected recognition language before starting', () => {
        const { controller } = createController();

        expect(controller.start('en-IN')).toBe(true);
        expect(MockRecognition.instances[0].lang).toBe('en-IN');
        expect(MockRecognition.instances[0].interimResults).toBe(true);
        expect(MockRecognition.instances[0].maxAlternatives).toBe(1);
    });

    it('loads and persists language preferences safely', () => {
        const storage = new Map<string, string>();
        const storageLike = {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, value: string) => storage.set(key, value),
        };

        expect(getDefaultSpeechLanguage('en-IN')).toBe('en-IN');
        expect(getDefaultSpeechLanguage('fr-FR')).toBe('en-US');

        persistSpeechLanguage(storageLike, 'hi-IN');
        expect(storage.get(SPEECH_LANGUAGE_STORAGE_KEY)).toBe('hi-IN');
        expect(loadSpeechLanguage(storageLike, 'en-US')).toBe('hi-IN');
    });

    it('replaces interim transcript text instead of appending it', () => {
        const { controller, transcripts } = createController();
        controller.start('en-US');
        const recognition = MockRecognition.instances[0];

        recognition.emitResult(createResultEvent(0, [{ transcript: 'pay card', isFinal: false }]));
        recognition.emitResult(createResultEvent(0, [{ transcript: 'pay card today', isFinal: false }]));

        expect(transcripts.at(-1)).toBe('pay card today');
    });

    it('accumulates finalized transcript segments without duplicating repeated result events', () => {
        const { controller, transcripts } = createController();
        controller.start('en-US');
        const recognition = MockRecognition.instances[0];

        recognition.emitResult(createResultEvent(0, [{ transcript: 'pay card', isFinal: true }]));
        recognition.emitResult(createResultEvent(0, [{ transcript: 'pay card', isFinal: true }]));
        recognition.emitResult(createResultEvent(1, [{ transcript: 'pay card', isFinal: true }, { transcript: 'send receipt', isFinal: true }]));

        expect(transcripts.at(-1)).toBe('pay card send receipt');
    });

    it('saves finalized speech when the user stops recording', () => {
        const { controller, finalTranscripts, statuses } = createController();
        controller.start('en-US');
        const recognition = MockRecognition.instances[0];

        recognition.emitResult(createResultEvent(0, [{ transcript: 'confirm rent payment', isFinal: true }]));
        controller.stop();
        recognition.emitEnd();

        expect(finalTranscripts).toEqual(['confirm rent payment']);
        expect(statuses.at(-1)).toBe('idle');
    });

    it('recovers from an unexpected end with a bounded restart', async () => {
        vi.useFakeTimers();
        const { controller, finalTranscripts } = createController({ maxUnexpectedRestarts: 1 });
        controller.start('en-US');
        const firstRecognition = MockRecognition.instances[0];

        firstRecognition.emitResult(createResultEvent(0, [{ transcript: 'pay electricity', isFinal: true }]));
        firstRecognition.emitEnd();
        await vi.advanceTimersByTimeAsync(10);

        expect(MockRecognition.instances).toHaveLength(2);
        const secondRecognition = MockRecognition.instances[1];
        secondRecognition.emitResult(createResultEvent(0, [{ transcript: 'send receipt', isFinal: true }]));
        controller.stop();
        secondRecognition.emitEnd();

        expect(finalTranscripts).toEqual(['pay electricity send receipt']);
    });

    it('stops retrying after repeated unexpected end events', async () => {
        vi.useFakeTimers();
        const { controller, errors } = createController({ maxUnexpectedRestarts: 1 });
        controller.start('en-US');
        MockRecognition.instances[0].emitResult(createResultEvent(0, [{ transcript: 'pay tax', isFinal: true }]));
        MockRecognition.instances[0].emitEnd();
        await vi.advanceTimersByTimeAsync(10);

        MockRecognition.instances[1].emitEnd();

        expect(MockRecognition.instances).toHaveLength(2);
        expect(errors.at(-1)).toBe('Recognition paused repeatedly. Saved anything that was finalized.');
    });

    it('does not retry or save after permission denial', () => {
        const { controller, statuses, finalTranscripts } = createController();
        controller.start('en-US');
        const recognition = MockRecognition.instances[0];

        recognition.emitResult(createResultEvent(0, [{ transcript: 'private note', isFinal: true }]));
        recognition.emitError('not-allowed');
        recognition.emitEnd();

        expect(statuses).toContain('permission-denied');
        expect(statuses.at(-1)).toBe('permission-denied');
        expect(finalTranscripts).toEqual([]);
    });

    it('shows a no-speech message without creating an empty entry', () => {
        const { controller, errors, finalTranscripts } = createController({ maxUnexpectedRestarts: 0 });
        controller.start('en-US');
        const recognition = MockRecognition.instances[0];

        recognition.emitError('no-speech');
        recognition.emitEnd();

        expect(errors).toContain('No speech detected. Try again or type instead.');
        expect(finalTranscripts).toEqual([]);
    });

    it('cleans up active recognition without leaving handlers attached', () => {
        const { controller } = createController();
        controller.start('en-US');
        const recognition = MockRecognition.instances[0];

        controller.cleanup();

        expect(recognition.abortCalls).toBe(1);
        expect(recognition.onresult).toBeNull();
        expect(recognition.onerror).toBeNull();
        expect(recognition.onend).toBeNull();
        expect(recognition.onstart).toBeNull();
    });

    it('does not create an entry when stopped with no finalized transcript', () => {
        const { controller, finalTranscripts } = createController();
        controller.start('en-US');
        const recognition = MockRecognition.instances[0];

        recognition.emitResult(createResultEvent(0, [{ transcript: 'draft words', isFinal: false }]));
        controller.stop();
        recognition.emitEnd();

        expect(finalTranscripts).toEqual([]);
    });
});
