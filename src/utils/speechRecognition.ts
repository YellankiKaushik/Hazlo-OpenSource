export type SpeechRecognitionStatus =
    | 'idle'
    | 'requesting-permission'
    | 'listening'
    | 'processing'
    | 'unsupported'
    | 'permission-denied'
    | 'error';

export interface SpeechLanguageOption {
    label: string;
    value: string;
}

export const SPEECH_LANGUAGE_STORAGE_KEY = 'hazlo-speech-language';

export const SPEECH_LANGUAGE_OPTIONS: SpeechLanguageOption[] = [
    { label: 'English (India)', value: 'en-IN' },
    { label: 'English (United States)', value: 'en-US' },
    { label: 'English (United Kingdom)', value: 'en-GB' },
    { label: 'Hindi', value: 'hi-IN' },
];

export interface SpeechRecognitionAlternativeLike {
    transcript: string;
    confidence?: number;
}

export interface SpeechRecognitionResultLike {
    isFinal: boolean;
    item?: (index: number) => SpeechRecognitionAlternativeLike;
    [index: number]: SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionResultListLike {
    length: number;
    item?: (index: number) => SpeechRecognitionResultLike;
    [index: number]: SpeechRecognitionResultLike;
}

export interface SpeechRecognitionResultEventLike {
    resultIndex: number;
    results: SpeechRecognitionResultListLike;
}

export interface SpeechRecognitionErrorEventLike {
    error: string;
    message?: string;
}

export interface SpeechRecognitionLike {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
    interface Window {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
    }
}

interface TranscriptState {
    displayTranscript: string;
    finalTranscript: string;
    interimTranscript: string;
}

interface SpeechRecognitionCallbacks {
    onStatusChange: (status: SpeechRecognitionStatus) => void;
    onTranscriptChange: (state: TranscriptState) => void;
    onErrorChange: (message: string | null) => void;
    onFinalTranscript: (text: string) => void;
}

interface SpeechRecognitionControllerOptions {
    createRecognition: () => SpeechRecognitionLike | null;
    callbacks: SpeechRecognitionCallbacks;
    restartDelayMs?: number;
    maxUnexpectedRestarts?: number;
    setTimeoutFn?: typeof setTimeout;
    clearTimeoutFn?: typeof clearTimeout;
}

export function normalizeSpeechText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
}

export function isSupportedSpeechLanguage(value: string): boolean {
    return SPEECH_LANGUAGE_OPTIONS.some(option => option.value === value);
}

export function normalizeLanguageTag(value: string | undefined | null): string | null {
    if (!value) return null;

    try {
        const [canonical] = Intl.getCanonicalLocales(value);
        return canonical || null;
    } catch (_) {
        return null;
    }
}

export function getDefaultSpeechLanguage(navigatorLanguage: string | undefined | null): string {
    const canonical = normalizeLanguageTag(navigatorLanguage);
    return canonical && isSupportedSpeechLanguage(canonical) ? canonical : 'en-US';
}

export function loadSpeechLanguage(
    storage: Pick<Storage, 'getItem'> | null,
    navigatorLanguage: string | undefined | null
): string {
    try {
        const stored = storage?.getItem(SPEECH_LANGUAGE_STORAGE_KEY);
        if (stored && isSupportedSpeechLanguage(stored)) return stored;
    } catch (_) {
        // localStorage can be unavailable in private browsing or restricted contexts.
    }

    return getDefaultSpeechLanguage(navigatorLanguage);
}

export function persistSpeechLanguage(
    storage: Pick<Storage, 'setItem'> | null,
    language: string
): void {
    if (!isSupportedSpeechLanguage(language)) return;

    try {
        storage?.setItem(SPEECH_LANGUAGE_STORAGE_KEY, language);
    } catch (_) {
        // Preference persistence is best-effort only.
    }
}

export function getSpeechRecognitionConstructor(win: Window | undefined): SpeechRecognitionConstructor | null {
    if (!win) return null;
    return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

function getResult(results: SpeechRecognitionResultListLike, index: number): SpeechRecognitionResultLike | null {
    return results[index] || results.item?.(index) || null;
}

function getAlternative(result: SpeechRecognitionResultLike): SpeechRecognitionAlternativeLike | null {
    return result[0] || result.item?.(0) || null;
}

function getSpeechErrorMessage(error: string): string {
    switch (error) {
        case 'not-allowed':
        case 'service-not-allowed':
            return 'Microphone permission denied. Allow microphone access or type instead.';
        case 'audio-capture':
            return 'No microphone found. Check your device microphone or type instead.';
        case 'no-speech':
            return 'No speech detected. Try again or type instead.';
        case 'network':
            return 'Recognition service unavailable. Check your connection or type instead.';
        case 'language-not-supported':
        case 'language-unavailable':
            return 'Selected language unavailable. Choose another recognition language.';
        default:
            return 'Voice recognition stopped unexpectedly. Try again or type instead.';
    }
}

function isPermissionError(error: string): boolean {
    return error === 'not-allowed' || error === 'service-not-allowed';
}

function isFatalError(error: string): boolean {
    return (
        isPermissionError(error) ||
        error === 'audio-capture' ||
        error === 'network' ||
        error === 'language-not-supported' ||
        error === 'language-unavailable'
    );
}

export class SpeechRecognitionController {
    private callbacks: SpeechRecognitionCallbacks;
    private recognition: SpeechRecognitionLike | null = null;
    private status: SpeechRecognitionStatus = 'idle';
    private finalSegments: string[] = [];
    private finalizedResultKeys = new Set<string>();
    private interimTranscript = '';
    private sessionId = 0;
    private userAuthorized = false;
    private userStopped = false;
    private fatalError = false;
    private restartAttempts = 0;
    private restartTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly restartDelayMs: number;
    private readonly maxUnexpectedRestarts: number;
    private readonly createRecognition: () => SpeechRecognitionLike | null;
    private readonly setTimeoutFn: typeof setTimeout;
    private readonly clearTimeoutFn: typeof clearTimeout;

    constructor(options: SpeechRecognitionControllerOptions) {
        this.callbacks = options.callbacks;
        this.createRecognition = options.createRecognition;
        this.restartDelayMs = options.restartDelayMs ?? 250;
        this.maxUnexpectedRestarts = options.maxUnexpectedRestarts ?? 2;
        this.setTimeoutFn = options.setTimeoutFn ?? setTimeout;
        this.clearTimeoutFn = options.clearTimeoutFn ?? clearTimeout;
    }

    setCallbacks(callbacks: SpeechRecognitionCallbacks): void {
        this.callbacks = callbacks;
    }

    getStatus(): SpeechRecognitionStatus {
        return this.status;
    }

    start(language: string): boolean {
        if (this.status === 'requesting-permission' || this.status === 'listening' || this.status === 'processing') {
            return false;
        }

        this.resetSession();
        this.userAuthorized = true;
        this.userStopped = false;
        this.sessionId += 1;

        return this.startRecognition(language, this.sessionId);
    }

    stop(): void {
        if (!this.recognition) {
            this.finishSession(true);
            return;
        }

        this.userAuthorized = false;
        this.userStopped = true;
        this.setStatus('processing');

        try {
            this.recognition.stop();
        } catch (_) {
            this.finishSession(true);
        }
    }

    cancel(): void {
        this.userAuthorized = false;
        this.userStopped = true;
        this.clearRestartTimer();

        if (this.recognition) {
            try {
                this.recognition.abort();
            } catch (_) {
                // Ignore abort failures during user cancellation.
            }
        }

        this.detachRecognition();
        this.resetSession();
        this.setStatus('idle');
        this.callbacks.onErrorChange(null);
        this.emitTranscript();
    }

    cleanup(): void {
        this.userAuthorized = false;
        this.clearRestartTimer();

        if (this.recognition) {
            try {
                this.recognition.abort();
            } catch (_) {
                // Ignore cleanup failures.
            }
        }

        this.detachRecognition();
    }

    private startRecognition(language: string, sessionId: number): boolean {
        const recognition = this.createRecognition();

        if (!recognition) {
            this.setStatus('unsupported');
            this.callbacks.onErrorChange('Browser does not support voice recognition. Type instead.');
            return false;
        }

        this.detachRecognition();
        this.recognition = recognition;
        this.fatalError = false;

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = language;
        recognition.onstart = () => {
            if (sessionId !== this.sessionId) return;
            this.setStatus('listening');
            this.callbacks.onErrorChange(null);
        };
        recognition.onresult = event => {
            if (sessionId !== this.sessionId) return;
            this.handleResult(event);
        };
        recognition.onerror = event => {
            if (sessionId !== this.sessionId) return;
            this.handleError(event);
        };
        recognition.onend = () => {
            if (sessionId !== this.sessionId) return;
            this.handleEnd(language, sessionId);
        };

        this.setStatus('requesting-permission');

        try {
            recognition.start();
            return true;
        } catch (_) {
            this.userAuthorized = false;
            this.detachRecognition();
            this.setStatus('error');
            this.callbacks.onErrorChange('Failed to start voice recognition. Try again or type instead.');
            return false;
        }
    }

    private handleResult(event: SpeechRecognitionResultEventLike): void {
        const interimSegments: string[] = [];
        const startIndex = Math.max(0, event.resultIndex || 0);

        for (let index = startIndex; index < event.results.length; index += 1) {
            const result = getResult(event.results, index);
            if (!result) continue;

            const alternative = getAlternative(result);
            const segment = normalizeSpeechText(alternative?.transcript || '');
            if (!segment) continue;

            if (result.isFinal) {
                const key = `${index}:${segment}`;
                const previousSegment = this.finalSegments[this.finalSegments.length - 1];
                if (!this.finalizedResultKeys.has(key) && previousSegment !== segment) {
                    this.finalSegments.push(segment);
                    this.finalizedResultKeys.add(key);
                }
            } else {
                interimSegments.push(segment);
            }
        }

        this.interimTranscript = normalizeSpeechText(interimSegments.join(' '));
        this.emitTranscript();
    }

    private handleError(event: SpeechRecognitionErrorEventLike): void {
        if (event.error === 'aborted') return;

        const message = getSpeechErrorMessage(event.error);
        this.callbacks.onErrorChange(message);

        if (isPermissionError(event.error)) {
            this.userAuthorized = false;
            this.fatalError = true;
            this.setStatus('permission-denied');
            return;
        }

        if (isFatalError(event.error)) {
            this.userAuthorized = false;
            this.fatalError = true;
            this.setStatus('error');
        }
    }

    private handleEnd(language: string, sessionId: number): void {
        this.detachRecognition();

        if (this.userAuthorized && !this.userStopped && !this.fatalError) {
            if (this.restartAttempts < this.maxUnexpectedRestarts) {
                this.restartAttempts += 1;
                this.setStatus('requesting-permission');
                this.clearRestartTimer();
                this.restartTimer = this.setTimeoutFn(() => {
                    if (sessionId === this.sessionId && this.userAuthorized && !this.userStopped) {
                        this.startRecognition(language, sessionId);
                    }
                }, this.restartDelayMs);
                return;
            }

            this.userAuthorized = false;
            this.callbacks.onErrorChange('Recognition paused repeatedly. Saved anything that was finalized.');
            this.finishSession(true);
            return;
        }

        if (this.fatalError) {
            this.resetSession();
            this.emitTranscript();
            return;
        }

        this.finishSession(this.userStopped);
    }

    private finishSession(shouldSave: boolean): void {
        this.clearRestartTimer();
        const finalText = normalizeSpeechText(this.finalSegments.join(' '));

        this.detachRecognition();
        this.setStatus('processing');

        if (shouldSave && finalText) {
            this.callbacks.onFinalTranscript(finalText);
        }

        this.resetSession();
        this.setStatus('idle');
        this.emitTranscript();
    }

    private emitTranscript(): void {
        const finalTranscript = normalizeSpeechText(this.finalSegments.join(' '));
        const displayTranscript = normalizeSpeechText([finalTranscript, this.interimTranscript].filter(Boolean).join(' '));

        this.callbacks.onTranscriptChange({
            displayTranscript,
            finalTranscript,
            interimTranscript: this.interimTranscript,
        });
    }

    private resetSession(): void {
        this.finalSegments = [];
        this.finalizedResultKeys = new Set();
        this.interimTranscript = '';
        this.restartAttempts = 0;
        this.fatalError = false;
        this.clearRestartTimer();
    }

    private detachRecognition(): void {
        if (!this.recognition) return;

        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.onstart = null;
        this.recognition = null;
    }

    private clearRestartTimer(): void {
        if (!this.restartTimer) return;
        this.clearTimeoutFn(this.restartTimer);
        this.restartTimer = null;
    }

    private setStatus(status: SpeechRecognitionStatus): void {
        this.status = status;
        this.callbacks.onStatusChange(status);
    }
}
