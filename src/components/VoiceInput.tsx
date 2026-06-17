import { useEffect, useRef, useCallback, useState } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useHazloStore } from '../store/useStore';

interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
    isFinal: boolean;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

interface ISpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
}

declare global {
    interface Window {
        SpeechRecognition: new () => ISpeechRecognition;
        webkitSpeechRecognition: new () => ISpeechRecognition;
    }
}

export function VoiceInput() {
    const recognitionRef = useRef<ISpeechRecognition | null>(null);
    const [isSpeechSupported, setIsSpeechSupported] = useState<boolean | null>(null);

    const isRecordingRef = useRef(false);
    const previousSessionsFinalTextRef = useRef('');

    const isRecording = useHazloStore(state => state.isRecording);
    const isProcessing = useHazloStore(state => state.isProcessing);
    const currentTranscript = useHazloStore(state => state.currentTranscript);
    const error = useHazloStore(state => state.error);
    const setRecording = useHazloStore(state => state.setRecording);
    const setTranscript = useHazloStore(state => state.setTranscript);
    const setError = useHazloStore(state => state.setError);
    const addEntry = useHazloStore(state => state.addEntry);
    const clearTranscript = useHazloStore(state => state.clearTranscript);
    const unsupportedVoiceMessage = 'Voice input is not supported in this browser.';

    useEffect(() => {
        isRecordingRef.current = isRecording;
    }, [isRecording]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            setIsSpeechSupported(false);
            return;
        }

        setIsSpeechSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    }, []);

    const createRecognition = useCallback((): ISpeechRecognition | null => {
        if (typeof window === 'undefined') return null;
        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return null;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        return recognition;
    }, []);

    const handleResult = useCallback(
        (event: SpeechRecognitionEvent) => {
            console.log('[Hazlo/Speech] onresult event received. results count:', event.results.length);
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = 0; i < event.results.length; i++) {
                const result = event.results[i];
                const text = typeof result[0]?.transcript === 'string' ? result[0].transcript : '';

                if (result.isFinal) {
                    finalTranscript += text + ' ';
                } else {
                    interimTranscript += text;
                }
            }

            const accumulated = previousSessionsFinalTextRef.current + finalTranscript + interimTranscript;
            const display = accumulated.trim();
            console.log('[Hazlo/Speech] Live reconstructed transcript:', {
                base: previousSessionsFinalTextRef.current,
                final: finalTranscript,
                interim: interimTranscript,
                display,
            });

            setTranscript(display);
        },
        [setTranscript]
    );

    const handleError = useCallback(
        (event: SpeechRecognitionErrorEvent) => {
            console.warn('[Hazlo/Speech] Speech recognition error event:', event.error);

            if (event.error === 'no-speech') return;
            if (event.error === 'aborted') return;

            isRecordingRef.current = false;
            setRecording(false);

            switch (event.error) {
                case 'audio-capture':
                    setError('No microphone found. Check your device settings.');
                    break;
                case 'not-allowed':
                    setError('Microphone access denied. Please allow microphone access.');
                    break;
                case 'network':
                    setError('Network error. Please check your connection.');
                    break;
                default:
                    setError(`Speech error: ${event.error}`);
            }
        },
        [setRecording, setError]
    );

    const saveTranscript = useCallback(() => {
        const latestTranscript = useHazloStore.getState().currentTranscript;
        console.log('[Hazlo/Speech] saveTranscript called. Transcript text:', latestTranscript);
        const text =
            typeof latestTranscript === 'string' ? latestTranscript.trim() : '';
        if (text) {
            console.log('[Hazlo/Speech] Dispatching addEntry with text:', text);
            addEntry(text);
        } else {
            console.log('[Hazlo/Speech] Transcript is empty, nothing to add.');
        }
    }, [addEntry]);

    const attachHandlers = useCallback(
        (recognition: ISpeechRecognition) => {
            recognition.onresult = handleResult;
            recognition.onerror = handleError;

            recognition.onstart = () => {
                console.log('[Hazlo/Speech] Speech recognition engine started.');
                setRecording(true);
                isRecordingRef.current = true;
                setError(null);
            };

            recognition.onend = () => {
                console.log('[Hazlo/Speech] Speech recognition engine ended. isRecordingRef:', isRecordingRef.current);
                if (isRecordingRef.current) {
                    const latest = useHazloStore.getState().currentTranscript;
                    previousSessionsFinalTextRef.current = latest ? latest + ' ' : '';
                    console.log('[Hazlo/Speech] Auto-restarting. Accumulating previous final transcript:', previousSessionsFinalTextRef.current);
                    try {
                        recognition.start();
                    } catch (err) {
                        console.warn('[Hazlo/Speech] Recognition restart failed:', err);
                        isRecordingRef.current = false;
                        setRecording(false);
                        saveTranscript();
                    }
                } else {
                    console.log('[Hazlo/Speech] Recording stopped by user. Saving draft...');
                    saveTranscript();
                }
            };
        },
        [handleResult, handleError, setRecording, setError, saveTranscript]
    );

    const startRecording = useCallback(() => {
        console.log('[Hazlo/Speech] startRecording requested.');
        const recognition = createRecognition();
        if (!recognition) {
            setIsSpeechSupported(false);
            setError(unsupportedVoiceMessage);
            return;
        }

        previousSessionsFinalTextRef.current = '';
        clearTranscript();

        recognitionRef.current = recognition;
        attachHandlers(recognition);

        try {
            recognition.start();
        } catch (err) {
            console.error('[Hazlo/Speech] Failed to start recognition:', err);
            setError('Failed to start voice recognition. Please try again.');
        }
    }, [createRecognition, attachHandlers, setError, clearTranscript, unsupportedVoiceMessage]);

    const stopRecording = useCallback(() => {
        console.log('[Hazlo/Speech] stopRecording requested.');
        isRecordingRef.current = false;
        setRecording(false);

        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (err) {
                console.warn('[Hazlo/Speech] Stop recognition error:', err);
            }
        }
    }, [setRecording]);

    const toggleRecording = useCallback(() => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }, [isRecording, stopRecording, startRecording]);

    useEffect(() => {
        return () => {
            isRecordingRef.current = false;
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch (_) {
                    // Ignore cleanup errors.
                }
                recognitionRef.current = null;
            }
        };
    }, []);

    const transcriptText =
        typeof currentTranscript === 'string' ? currentTranscript : '';

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white/95 to-transparent pb-6">
            <div className="max-w-2xl mx-auto">
                {(transcriptText || isRecording) && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-2xl min-h-[80px] max-h-[200px] overflow-y-auto">
                        {isRecording && !transcriptText && (
                            <div className="flex items-center gap-2 text-gray-500">
                                <span className="animate-pulse">Listening...</span>
                            </div>
                        )}
                        {transcriptText && (
                            <p className="text-gray-800 text-base leading-relaxed">
                                {transcriptText}
                                {isRecording && (
                                    <span className="animate-pulse ml-0.5">|</span>
                                )}
                            </p>
                        )}
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
                        {typeof error === 'string' ? error : 'An error occurred'}
                    </div>
                )}

                {isSpeechSupported === false && (
                    <div className="mb-4 p-3 bg-gray-100 text-gray-700 rounded-xl text-sm leading-relaxed">
                        {unsupportedVoiceMessage}
                    </div>
                )}

                <div className="flex justify-center">
                    <button
                        id="voice-record-button"
                        onClick={toggleRecording}
                        disabled={isProcessing || isSpeechSupported === false}
                        className={`
                            relative w-20 h-20 rounded-full flex items-center justify-center
                            transition-all duration-300 ease-out
                            ${isRecording
                                ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-lg shadow-red-200'
                                : 'bg-gray-900 hover:bg-gray-800 hover:scale-105 shadow-lg shadow-gray-200'
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                    >
                        {isProcessing ? (
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                        ) : isRecording ? (
                            <>
                                <MicOff className="w-8 h-8 text-white" />
                                <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-30" />
                            </>
                        ) : (
                            <Mic className="w-8 h-8 text-white" />
                        )}
                    </button>
                </div>

                <p className="text-center text-gray-500 text-sm mt-3">
                    {isSpeechSupported === false
                        ? 'Voice input unavailable'
                        : isRecording
                            ? 'Tap to stop and save'
                            : 'Tap to start recording your thoughts'}
                </p>
            </div>
        </div>
    );
}

export default VoiceInput;
