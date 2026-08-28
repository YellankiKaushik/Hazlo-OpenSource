import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActiveTheme,
    THEME_MEDIA_QUERY,
    ThemePreference,
    applyThemeToRoot,
    readStoredThemePreference,
    resolveActiveTheme,
    subscribeToSystemTheme,
    writeStoredThemePreference,
} from '../utils/theme';

function getStorage(): Storage | undefined {
    if (typeof window === 'undefined') return undefined;
    try {
        return window.localStorage;
    } catch (_) {
        return undefined;
    }
}

function getSystemPrefersDark(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
    }

    return window.matchMedia(THEME_MEDIA_QUERY).matches;
}

function getInitialPreference(): ThemePreference {
    return readStoredThemePreference(getStorage());
}

export function useTheme() {
    const [preference, setPreferenceState] = useState<ThemePreference>(getInitialPreference);
    const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemPrefersDark);

    const activeTheme: ActiveTheme = useMemo(
        () => resolveActiveTheme(preference, systemPrefersDark),
        [preference, systemPrefersDark]
    );

    useEffect(() => {
        if (typeof document === 'undefined') return;
        applyThemeToRoot(document.documentElement, activeTheme);
    }, [activeTheme]);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return;
        }

        return subscribeToSystemTheme(window.matchMedia.bind(window), setSystemPrefersDark);
    }, []);

    const setPreference = useCallback((nextPreference: ThemePreference) => {
        writeStoredThemePreference(getStorage(), nextPreference);
        setPreferenceState(nextPreference);
    }, []);

    return {
        preference,
        activeTheme,
        setPreference,
    };
}
