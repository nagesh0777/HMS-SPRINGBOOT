import { createContext, useContext, useEffect, useState, useCallback } from 'react';

/**
 * Theme state for the app.
 *
 * Three values, not two: 'system' is a real choice and stays live — if the OS flips to
 * dark at sunset the app follows, which a plain boolean cannot express.
 *
 * The initial class is applied by an inline script in index.html, before React mounts,
 * so a dark-mode reload never flashes a white screen. This provider mirrors that logic;
 * the two must agree on the storage key.
 */

const STORAGE_KEY = 'theme';
const ThemeContext = createContext(null);

const prefersDark = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

function readStored() {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
    } catch {
        // Private mode / blocked storage. Fall back to following the OS.
        return 'system';
    }
}

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(readStored);

    // Resolve 'system' to a concrete value and paint it on <html>.
    useEffect(() => {
        const root = document.documentElement;

        const apply = () => {
            const dark = theme === 'dark' || (theme === 'system' && prefersDark());
            root.classList.toggle('dark', dark);
        };

        apply();

        if (theme !== 'system') return;
        // Only 'system' needs to keep listening.
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener('change', apply);
        return () => mq.removeEventListener('change', apply);
    }, [theme]);

    const setTheme = useCallback((next) => {
        // Kill transitions for one frame, otherwise every element with a colour
        // transition animates on its own schedule and the flip looks like a wipe.
        const root = document.documentElement;
        root.classList.add('theme-switching');
        window.setTimeout(() => root.classList.remove('theme-switching'), 0);

        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // Non-fatal: the theme still applies for this session.
        }
        setThemeState(next);
    }, []);

    const resolved = theme === 'system' ? (prefersDark() ? 'dark' : 'light') : theme;

    return (
        <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
    return ctx;
}
