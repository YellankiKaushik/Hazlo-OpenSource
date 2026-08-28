import { describe, expect, it, vi } from 'vitest';
import {
    THEME_MEDIA_QUERY,
    THEME_STORAGE_KEY,
    applyThemeToRoot,
    readStoredThemePreference,
    resolveActiveTheme,
    subscribeToSystemTheme,
    writeStoredThemePreference,
} from './theme';

class MemoryStorage {
    private values = new Map<string, string>();

    getItem(key: string): string | null {
        return this.values.get(key) ?? null;
    }

    setItem(key: string, value: string): void {
        this.values.set(key, value);
    }
}

function createMediaQueryList(matches: boolean) {
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    const media = {
        matches,
        media: THEME_MEDIA_QUERY,
        addEventListener: vi.fn((_event: string, listener: (event: MediaQueryListEvent) => void) => {
            listeners.add(listener);
        }),
        removeEventListener: vi.fn((_event: string, listener: (event: MediaQueryListEvent) => void) => {
            listeners.delete(listener);
        }),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatch(nextMatches: boolean) {
            media.matches = nextMatches;
            listeners.forEach(listener => listener({ matches: nextMatches } as MediaQueryListEvent));
        },
    };

    return media;
}

describe('theme preferences', () => {
    it('defaults to system preference when storage is empty', () => {
        const storage = new MemoryStorage();

        expect(readStoredThemePreference(storage as unknown as Storage)).toBe('system');
    });

    it('resolves system preference to dark when the operating system is dark', () => {
        expect(resolveActiveTheme('system', true)).toBe('dark');
    });

    it('resolves system preference to light when the operating system is light', () => {
        expect(resolveActiveTheme('system', false)).toBe('light');
    });

    it('uses explicit light selection regardless of operating-system preference', () => {
        expect(resolveActiveTheme('light', true)).toBe('light');
    });

    it('uses explicit dark selection regardless of operating-system preference', () => {
        expect(resolveActiveTheme('dark', false)).toBe('dark');
    });

    it('persists explicit selections and returning to system', () => {
        const storage = new MemoryStorage() as unknown as Storage;

        writeStoredThemePreference(storage, 'dark');
        expect(readStoredThemePreference(storage)).toBe('dark');

        writeStoredThemePreference(storage, 'light');
        expect(readStoredThemePreference(storage)).toBe('light');

        writeStoredThemePreference(storage, 'system');
        expect(readStoredThemePreference(storage)).toBe('system');
    });

    it('stores preferences under the documented localStorage key', () => {
        const storage = new MemoryStorage() as unknown as Storage;

        writeStoredThemePreference(storage, 'dark');

        expect(storage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    });

    it('updates when the operating-system theme changes in system mode', () => {
        const media = createMediaQueryList(false);
        const onChange = vi.fn();
        const matchMedia = vi.fn(() => media as unknown as MediaQueryList);

        subscribeToSystemTheme(matchMedia, onChange);
        media.dispatch(true);

        expect(matchMedia).toHaveBeenCalledWith(THEME_MEDIA_QUERY);
        expect(onChange).toHaveBeenNthCalledWith(1, false);
        expect(onChange).toHaveBeenNthCalledWith(2, true);
        expect(resolveActiveTheme('system', true)).toBe('dark');
    });

    it('keeps explicit overrides independent from operating-system changes', () => {
        expect(resolveActiveTheme('light', true)).toBe('light');
        expect(resolveActiveTheme('dark', false)).toBe('dark');
    });

    it('cleans up system-theme matchMedia listeners', () => {
        const media = createMediaQueryList(false);
        const onChange = vi.fn();

        const cleanup = subscribeToSystemTheme(
            () => media as unknown as MediaQueryList,
            onChange
        );

        cleanup();
        media.dispatch(true);

        expect(media.removeEventListener).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('applies active theme state to the html element', () => {
        const meta = {
            setAttribute: vi.fn(),
        };
        const root = {
            classList: { toggle: vi.fn() },
            dataset: {},
            style: {},
            ownerDocument: {
                querySelector: vi.fn(() => meta),
            },
        } as unknown as HTMLElement;

        applyThemeToRoot(root, 'dark');

        expect(root.classList.toggle).toHaveBeenCalledWith('dark', true);
        expect(root.dataset.theme).toBe('dark');
        expect(root.style.colorScheme).toBe('dark');
        expect(meta.setAttribute).toHaveBeenCalledWith('content', '#15171a');
    });
});
