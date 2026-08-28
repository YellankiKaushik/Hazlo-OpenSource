import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    getSpeechRecognitionConstructor,
    isSupportedSpeechLanguage,
    loadSpeechLanguage,
    persistSpeechLanguage,
    SpeechRecognitionController,
    SpeechRecognitionStatus,
    SPEECH_LANGUAGE_OPTIONS,
} from '../utils/speechRecognition';

interface UseSpeechRecognitionOptions {
    onFinalTranscript: (text: string) => void;
}

interface SpeechRecognitionViewState {
    status: SpeechRecognitionStatus;
    isSupported: boolean;
    isListening: boolean;
    isProcessing: boolean;
    displayTranscript: string;
    finalTranscript: string;
    interimTranscript: string;
    errorMessage: string | null;
    elapsedSeconds: number;
    language: string;
    languageOptions: typeof SPEECH_LANGUAGE_OPTIONS;
    setLanguage: (language: string) => void;
    start: () => void;
    stop: () => void;
    cancel: () => void;
}

function getSafeStorage(): Storage | null {
    if (typeof window === 'undefined') return null;

    try {
        return window.localStorage;
    } catch (_) {
        return null;
    }
}

function getInitialLanguage(): string {
    const navigatorLanguage = typeof navigator !== 'undefined' ? navigator.language : undefined;
    return loadSpeechLanguage(getSafeStorage(), navigatorLanguage);
}

export function useSpeechRecognition({ onFinalTranscript }: UseSpeechRecognitionOptions): SpeechRecognitionViewState {
    const onFinalTranscriptRef = useRef(onFinalTranscript);
    const [status, setStatus] = useState<SpeechRecognitionStatus>('idle');
    const [displayTranscript, setDisplayTranscript] = useState('');
    const [finalTranscript, setFinalTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [language, setLanguageState] = useState(getInitialLanguage);
    const controllerRef = useRef<SpeechRecognitionController | null>(null);

    const isSupported = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return Boolean(getSpeechRecognitionConstructor(window));
    }, []);

    useEffect(() => {
        onFinalTranscriptRef.current = onFinalTranscript;
    }, [onFinalTranscript]);

    useEffect(() => {
        const controller = new SpeechRecognitionController({
            createRecognition: () => {
                if (typeof window === 'undefined') return null;
                const SpeechRecognitionConstructor = getSpeechRecognitionConstructor(window);
                return SpeechRecognitionConstructor ? new SpeechRecognitionConstructor() : null;
            },
            callbacks: {
                onStatusChange: setStatus,
                onErrorChange: setErrorMessage,
                onTranscriptChange: transcriptState => {
                    setDisplayTranscript(transcriptState.displayTranscript);
                    setFinalTranscript(transcriptState.finalTranscript);
                    setInterimTranscript(transcriptState.interimTranscript);
                },
                onFinalTranscript: text => onFinalTranscriptRef.current(text),
            },
        });

        controllerRef.current = controller;

        if (!isSupported) {
            setStatus('unsupported');
            setErrorMessage('Browser does not support voice recognition. Type instead.');
        }

        return () => {
            controller.cleanup();
            controllerRef.current = null;
        };
    }, [isSupported]);

    useEffect(() => {
        if (status !== 'listening' && status !== 'requesting-permission') {
            setElapsedSeconds(0);
            return;
        }

        const startedAt = Date.now();
        const timer = window.setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
        }, 1000);

        return () => window.clearInterval(timer);
    }, [status]);

    const setLanguage = useCallback((nextLanguage: string) => {
        if (!isSupportedSpeechLanguage(nextLanguage)) return;
        setLanguageState(nextLanguage);
        persistSpeechLanguage(getSafeStorage(), nextLanguage);
    }, []);

    const start = useCallback(() => {
        setErrorMessage(null);
        controllerRef.current?.start(language);
    }, [language]);

    const stop = useCallback(() => {
        controllerRef.current?.stop();
    }, []);

    const cancel = useCallback(() => {
        controllerRef.current?.cancel();
    }, []);

    return {
        status,
        isSupported,
        isListening: status === 'listening' || status === 'requesting-permission',
        isProcessing: status === 'processing',
        displayTranscript,
        finalTranscript,
        interimTranscript,
        errorMessage,
        elapsedSeconds,
        language,
        languageOptions: SPEECH_LANGUAGE_OPTIONS,
        setLanguage,
        start,
        stop,
        cancel,
    };
}
