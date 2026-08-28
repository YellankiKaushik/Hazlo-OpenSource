export type ThemePreference = 'system' | 'light' | 'dark';
export type ActiveTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'hazlo-theme-preference';
export const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';

const THEME_VALUES: ThemePreference[] = ['system', 'light', 'dark'];

export function isThemePreference(value: unknown): value is ThemePreference {
    return typeof value === 'string' && THEME_VALUES.includes(value as ThemePreference);
}

export function normalizeThemePreference(value: unknown): ThemePreference {
    return isThemePreference(value) ? value : 'system';
}

export function resolveActiveTheme(
    preference: ThemePreference,
    systemPrefersDark: boolean
): ActiveTheme {
    if (preference === 'dark') return 'dark';
    if (preference === 'light') return 'light';
    return systemPrefersDark ? 'dark' : 'light';
}

export function readStoredThemePreference(storage: Storage | undefined): ThemePreference {
    if (!storage) return 'system';

    try {
        return normalizeThemePreference(storage.getItem(THEME_STORAGE_KEY));
    } catch (_) {
        return 'system';
    }
}

export function writeStoredThemePreference(
    storage: Storage | undefined,
    preference: ThemePreference
): void {
    if (!storage) return;

    try {
        storage.setItem(THEME_STORAGE_KEY, preference);
    } catch (_) {
        // Ignore storage failures; theme still works for the current session.
    }
}

export function applyThemeToRoot(root: HTMLElement, activeTheme: ActiveTheme): void {
    root.classList.toggle('dark', activeTheme === 'dark');
    root.dataset.theme = activeTheme;
    root.style.colorScheme = activeTheme;

    const themeMeta = root.ownerDocument.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
        themeMeta.setAttribute('content', activeTheme === 'dark' ? '#15171a' : '#f7f5f0');
    }
}

export function subscribeToSystemTheme(
    matchMedia: ((query: string) => MediaQueryList) | undefined,
    onChange: (prefersDark: boolean) => void
): () => void {
    if (!matchMedia) return () => {};

    const media = matchMedia(THEME_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
        onChange(event.matches);
    };

    onChange(media.matches);

    if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', handleChange);
        return () => media.removeEventListener('change', handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
}
