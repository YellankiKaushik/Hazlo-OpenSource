import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Keyboard, Languages, Loader2, Mic, MicOff, Square, X } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useHazloStore } from '../store/useStore';

function formatElapsed(seconds: number): string {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainingSeconds}`;
}

export function VoiceInput() {
    const addEntry = useHazloStore(state => state.addEntry);
    const setRecording = useHazloStore(state => state.setRecording);
    const setProcessing = useHazloStore(state => state.setProcessing);
    const setTranscript = useHazloStore(state => state.setTranscript);
    const setError = useHazloStore(state => state.setError);
    const clearTranscript = useHazloStore(state => state.clearTranscript);
    const [isTextEntryOpen, setIsTextEntryOpen] = useState(false);
    const [manualText, setManualText] = useState('');
    const [manualError, setManualError] = useState<string | null>(null);

    const handleFinalTranscript = useCallback((text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        addEntry(trimmed);
    }, [addEntry]);

    const speech = useSpeechRecognition({
        onFinalTranscript: handleFinalTranscript,
    });

    const selectedLanguageLabel = useMemo(
        () => speech.languageOptions.find(option => option.value === speech.language)?.label || speech.language,
        [speech.language, speech.languageOptions]
    );

    useEffect(() => {
        setRecording(speech.isListening);
        setProcessing(speech.isProcessing);
        setTranscript(speech.displayTranscript);
        setError(speech.errorMessage);
    }, [
        speech.displayTranscript,
        speech.errorMessage,
        speech.isListening,
        speech.isProcessing,
        setError,
        setProcessing,
        setRecording,
        setTranscript,
    ]);

    const submitManualText = useCallback((event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const text = manualText.trim();
        if (!text) {
            setManualError('Enter a thought before saving.');
            return;
        }

        addEntry(text);
        setManualText('');
        setManualError(null);
        setIsTextEntryOpen(false);
        clearTranscript();
    }, [addEntry, clearTranscript, manualText]);

    const openTextEntry = useCallback(() => {
        setManualError(null);
        setIsTextEntryOpen(true);
    }, []);

    const closeTextEntry = useCallback(() => {
        setManualText('');
        setManualError(null);
        setIsTextEntryOpen(false);
    }, []);

    const toggleRecording = useCallback(() => {
        if (speech.isListening) {
            speech.stop();
            return;
        }

        speech.start();
    }, [speech]);

    const voiceButtonDisabled = speech.isProcessing || !speech.isSupported;
    const showTranscript = Boolean(speech.displayTranscript) || speech.isListening;
    const showManualFallback = isTextEntryOpen || !speech.isSupported || speech.status === 'permission-denied';

    return (
        <div className="voice-dock fixed bottom-0 left-0 right-0 z-20 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-10">
            <div className="app-container">
                {showTranscript && (
                    <div
                        className="mb-3 max-h-44 min-h-20 overflow-y-auto rounded-2xl border p-4 shadow-sm"
                        style={{ background: 'var(--color-surface-elevated)', borderColor: 'var(--color-border)' }}
                        aria-live="polite"
                    >
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                            <span className="inline-flex items-center gap-2">
                                <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: speech.isListening ? 'var(--color-error-dot)' : 'var(--color-text-muted)' }} aria-hidden="true" />
                                {speech.isListening ? 'Listening' : 'Transcript'}
                            </span>
                            {speech.isListening && (
                                <span aria-label={`Elapsed recording time ${formatElapsed(speech.elapsedSeconds)}`}>
                                    {formatElapsed(speech.elapsedSeconds)}
                                </span>
                            )}
                            <span>{selectedLanguageLabel}</span>
                        </div>

                        {speech.displayTranscript ? (
                            <p className="overflow-wrap-anywhere text-base leading-7" style={{ color: 'var(--color-text-primary)' }}>
                                {speech.finalTranscript}
                                {speech.interimTranscript && (
                                    <span style={{ color: 'var(--color-text-muted)' }}>
                                        {speech.finalTranscript ? ' ' : ''}
                                        {speech.interimTranscript}
                                    </span>
                                )}
                                {speech.isListening && (
                                    <span className="ml-0.5 animate-pulse">|</span>
                                )}
                            </p>
                        ) : (
                            <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                                Speak naturally. Finalized speech will be saved when you stop.
                            </p>
                        )}
                    </div>
                )}

                {speech.errorMessage && (
                    <div className="mb-3 rounded-xl border p-3 text-sm leading-6" style={{ background: 'var(--color-error-bg)', borderColor: 'var(--color-border)', color: 'var(--color-error-text)' }}>
                        {speech.errorMessage}
                    </div>
                )}

                {showManualFallback && (
                    <form
                        className="mb-3 rounded-2xl border p-3 shadow-sm"
                        style={{ background: 'var(--color-surface-elevated)', borderColor: 'var(--color-border)' }}
                        onSubmit={submitManualText}
                    >
                        <label className="mb-2 block text-sm font-semibold" htmlFor="manual-entry-text" style={{ color: 'var(--color-text-primary)' }}>
                            Type instead
                        </label>
                        <textarea
                            id="manual-entry-text"
                            value={manualText}
                            onChange={event => {
                                setManualText(event.target.value);
                                if (manualError) setManualError(null);
                            }}
                            rows={3}
                            className="min-h-28 w-full resize-y rounded-xl border bg-transparent p-3 text-base leading-6 outline-none"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                            placeholder="Type a Hazlo note or task..."
                        />
                        {manualError && (
                            <p className="mt-2 text-sm" style={{ color: 'var(--color-error-text)' }}>
                                {manualError}
                            </p>
                        )}
                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeTextEntry}
                                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors"
                                style={{ color: 'var(--color-text-secondary)' }}
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-transform hover:scale-[1.02]"
                                style={{ background: 'var(--color-accent)', color: 'var(--color-accent-text)' }}
                            >
                                <Keyboard className="h-4 w-4" aria-hidden="true" />
                                Save entry
                            </button>
                        </div>
                    </form>
                )}

                <div className="rounded-3xl border px-4 py-4 shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-dock)' }}>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <label className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                            <Languages className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">Recognition language</span>
                            <select
                                value={speech.language}
                                onChange={event => speech.setLanguage(event.target.value)}
                                disabled={speech.isListening || speech.isProcessing}
                                className="max-w-[11rem] bg-transparent text-sm font-semibold outline-none disabled:cursor-not-allowed disabled:opacity-60"
                                style={{ color: 'var(--color-text-primary)' }}
                                aria-label="Recognition language"
                            >
                                {speech.languageOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <button
                            type="button"
                            onClick={openTextEntry}
                            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors"
                            style={{ color: 'var(--color-text-secondary)' }}
                        >
                            <Keyboard className="h-4 w-4" aria-hidden="true" />
                            Type instead
                        </button>
                    </div>

                    <div className="flex items-center justify-center gap-3">
                        {speech.isListening && (
                            <button
                                type="button"
                                onClick={speech.cancel}
                                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors"
                                style={{ color: 'var(--color-text-secondary)' }}
                                aria-label="Cancel recording"
                                title="Cancel recording"
                            >
                                <X className="h-5 w-5" aria-hidden="true" />
                            </button>
                        )}

                        <button
                            id="voice-record-button"
                            type="button"
                            onClick={toggleRecording}
                            disabled={voiceButtonDisabled}
                            className={`
                                relative flex h-16 w-16 items-center justify-center rounded-full sm:h-20 sm:w-20
                                transition-transform duration-300 ease-out focus-visible:outline-offset-4
                                ${speech.isListening ? 'scale-105' : 'hover:scale-105'}
                                disabled:cursor-not-allowed disabled:opacity-50
                            `}
                            style={{
                                background: speech.isListening ? 'var(--color-error-dot)' : 'var(--color-accent)',
                                color: speech.isListening ? '#ffffff' : 'var(--color-accent-text)',
                                boxShadow: speech.isListening ? '0 14px 34px rgb(220 74 63 / 0.28)' : '0 14px 34px rgb(24 33 47 / 0.20)',
                            }}
                            aria-label={speech.isListening ? 'Stop recording and save finalized speech' : 'Start voice recording'}
                            aria-pressed={speech.isListening}
                        >
                            {speech.isProcessing ? (
                                <Loader2 className="h-7 w-7 animate-spin sm:h-8 sm:w-8" aria-hidden="true" />
                            ) : speech.isListening ? (
                                <>
                                    <MicOff className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
                                    <span className="absolute inset-0 rounded-full animate-ping opacity-25" style={{ background: 'var(--color-error-dot)' }} aria-hidden="true" />
                                </>
                            ) : (
                                <Mic className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
                            )}
                        </button>

                        {speech.isListening && (
                            <button
                                type="button"
                                onClick={speech.stop}
                                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors"
                                style={{ color: 'var(--color-text-secondary)' }}
                                aria-label="Stop recording and save"
                                title="Stop recording and save"
                            >
                                <Square className="h-5 w-5" aria-hidden="true" />
                            </button>
                        )}
                    </div>

                    <p className="mt-3 text-center text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                        {!speech.isSupported
                            ? 'Voice recognition unavailable in this browser'
                            : speech.isListening
                                ? 'Stop to save finalized speech, or cancel to discard'
                                : 'Tap to start recording your thoughts'}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default VoiceInput;
