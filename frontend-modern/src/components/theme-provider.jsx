import { createContext, useContext, useEffect, useState, useCallback } from 'react';

/**
 * Theme state for the app.
 *
 * Supports automatic day/night switching based on local time:
 * - Day (06:00 to 18:00 / 6:00 AM to 6:00 PM): Light mode
 * - Evening & Night (18:00 to 06:00 / 6:00 PM to 6:00 AM): Dark mode
 *
 * Users can also manually switch to 'light' or 'dark' at any time,
 * or choose 'auto' to follow the time-of-day schedule.
 *
 * The initial class is applied by an inline script in index.html, before React mounts,
 * preventing any white flash on reload during evening/night hours.
 */

const STORAGE_KEY = 'theme';
const ThemeContext = createContext(null);

export const isNightTime = () => {
    if (typeof window === 'undefined') return false;
    const hour = new Date().getHours();
    return hour < 6 || hour >= 18;
};

const prefersDark = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

function readStored() {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        if (v === 'light' || v === 'dark' || v === 'auto') return v;
        if (v === 'system') return 'auto';
        return 'auto';
    } catch {
        return 'auto';
    }
}

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(readStored);
    const [isNight, setIsNight] = useState(isNightTime);

    // Keep time-based check updated for 'auto'
    useEffect(() => {
        if (theme !== 'auto' && theme !== 'system') return;

        const checkTime = () => {
            const night = isNightTime();
            setIsNight(night);
        };

        // Re-check every 30 seconds for clock boundary transitions (e.g. 18:00)
        const timer = setInterval(checkTime, 30000);

        // Also re-check when the user returns to the tab/window
        const onVisibilityChange = () => {
            if (!document.hidden) checkTime();
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('focus', onVisibilityChange);

        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('focus', onVisibilityChange);
        };
    }, [theme]);

    // Calculate resolved theme
    const resolved = (theme === 'auto' || theme === 'system')
        ? (isNight ? 'dark' : 'light')
        : theme;

    // Apply dark class to <html> and update meta theme-color
    useEffect(() => {
        const root = document.documentElement;
        const dark = resolved === 'dark';
        root.classList.toggle('dark', dark);

        const metaThemeColor = document.querySelector('meta[name="theme-color"]:not([media])');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', dark ? '#101828' : '#ffffff');
        }
    }, [resolved]);

    const setTheme = useCallback((next) => {
        // Kill transitions for one frame during theme flip
        const root = document.documentElement;
        root.classList.add('theme-switching');
        window.setTimeout(() => root.classList.remove('theme-switching'), 0);

        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // Non-fatal: session still works
        }
        setThemeState(next);
        if (next === 'auto' || next === 'system') {
            setIsNight(isNightTime());
        }
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, resolved, setTheme, isNight }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
    return ctx;
}
