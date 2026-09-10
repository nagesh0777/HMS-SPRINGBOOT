/**
 * Team Chat Notification & Audio Chime Service
 * Handles browser desktop notifications, Web Audio chimes, and user preference persistence.
 */

const STORAGE_KEY = 'teams_notif_enabled';

// Shared Web Audio context
let audioCtx = null;

export const unlockAudio = () => {
    try {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    } catch (e) {
        console.warn('Audio unlock warning:', e);
    }
};

// Automatically unlock audio on first user gesture anywhere on the window
if (typeof window !== 'undefined') {
    ['click', 'keydown', 'touchstart'].forEach(eventName => {
        window.addEventListener(eventName, unlockAudio, { once: true, passive: true });
    });
}

/**
 * Play a pleasant Web Audio chime.
 * - Standard: WhatsApp/Slack-like pleasant two-tone chord (587Hz -> 880Hz)
 * - Urgent: 3-pulse emergency clinical alert (880Hz -> 659Hz -> 880Hz)
 */
export const playNotificationChime = (isUrgent = false) => {
    try {
        unlockAudio();
        if (!audioCtx) return;

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (isUrgent) {
            // Urgent clinical pulse
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.setValueAtTime(659.25, now + 0.12);
            osc.frequency.setValueAtTime(880, now + 0.24);
            gain.gain.setValueAtTime(0.28, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
            osc.start(now);
            osc.stop(now + 0.42);
        } else {
            // Soft pleasant two-tone ping
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, now); // D5
            osc.frequency.setValueAtTime(880, now + 0.09); // A5
            gain.gain.setValueAtTime(0.22, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
        }
    } catch (e) {
        console.warn('Could not play notification sound:', e);
    }
};

/**
 * Check if notifications are enabled by the user (default: true)
 */
export const isNotificationsEnabled = () => {
    if (typeof window === 'undefined') return true;
    const val = localStorage.getItem(STORAGE_KEY);
    return val === null ? true : val === 'true';
};

/**
 * Persist user preference for chat notifications
 */
export const setNotificationsEnabled = (enabled) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, String(enabled));
    window.dispatchEvent(new CustomEvent('teams_notif_changed', { detail: { enabled } }));
};

/**
 * Request browser desktop notification permission
 */
export const requestDesktopNotificationPermission = async () => {
    try {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            return 'unsupported';
        }
        if (Notification.permission === 'granted') {
            return 'granted';
        }
        if (Notification.permission !== 'denied') {
            try {
                const p = Notification.requestPermission();
                if (p && typeof p.then === 'function') {
                    return await p;
                } else {
                    return new Promise((resolve) => {
                        try {
                            Notification.requestPermission((perm) => resolve(perm));
                        } catch {
                            resolve(Notification.permission || 'denied');
                        }
                    });
                }
            } catch {
                return Notification.permission || 'denied';
            }
        }
        return Notification.permission;
    } catch (e) {
        console.warn('requestDesktopNotificationPermission failed:', e);
        return 'unsupported';
    }
};

/**
 * Show a browser desktop notification
 */
export const showDesktopNotification = (title, body, onClick) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (!isNotificationsEnabled()) return;

    try {
        const notif = new Notification(title, {
            body: body || 'New message in Teams',
            icon: '/favicon.ico',
            silent: true, // We trigger custom chime
        });

        if (onClick) {
            notif.onclick = () => {
                window.focus();
                onClick();
                notif.close();
            };
        }
    } catch (e) {
        console.warn('Failed to fire desktop notification:', e);
    }
};
