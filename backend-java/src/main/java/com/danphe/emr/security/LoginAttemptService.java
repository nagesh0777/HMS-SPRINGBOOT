package com.danphe.emr.security;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

/**
 * Throttles password guessing against the login endpoint.
 *
 * Without this the endpoint accepts unlimited attempts, which against a six-character minimum is
 * all an attacker needs — and this system holds patient records.
 *
 * Counters are keyed by username AND by client IP, and either can trigger a lockout: keying on
 * username alone lets an attacker spray one password across many accounts, and keying on IP alone
 * lets a distributed attempt through.
 *
 * In-memory and per-instance, which is correct for the single backend process this runs as.
 * Behind more than one instance these counters become per-instance — move them to Redis then.
 */
@Service
public class LoginAttemptService {

    private static final int MAX_ATTEMPTS = 8;
    private static final Duration WINDOW = Duration.ofMinutes(15);
    private static final Duration LOCKOUT = Duration.ofMinutes(15);
    /** Bounds memory so a spray across millions of usernames cannot exhaust the heap. */
    private static final int MAX_TRACKED_KEYS = 10_000;

    private record Attempts(int count, Instant windowStart, Instant lockedUntil) {}

    private final Map<String, Attempts> byKey = new ConcurrentHashMap<>();

    public boolean isBlocked(String username, String ip) {
        return blocked(key("u", username)) || blocked(key("i", ip));
    }

    public void recordFailure(String username, String ip) {
        bump(key("u", username));
        bump(key("i", ip));
    }

    public void recordSuccess(String username, String ip) {
        byKey.remove(key("u", username));
        byKey.remove(key("i", ip));
    }

    /** Seconds until the caller may try again, for the Retry-After header. */
    public long retryAfterSeconds(String username, String ip) {
        long u = remaining(key("u", username));
        long i = remaining(key("i", ip));
        return Math.max(u, i);
    }

    private boolean blocked(String key) {
        Attempts a = byKey.get(key);
        return a != null && a.lockedUntil() != null && Instant.now().isBefore(a.lockedUntil());
    }

    private long remaining(String key) {
        Attempts a = byKey.get(key);
        if (a == null || a.lockedUntil() == null) return 0;
        long secs = Duration.between(Instant.now(), a.lockedUntil()).getSeconds();
        return Math.max(0, secs);
    }

    private void bump(String key) {
        if (byKey.size() > MAX_TRACKED_KEYS) {
            byKey.entrySet().removeIf(e -> e.getValue().lockedUntil() == null
                    && Duration.between(e.getValue().windowStart(), Instant.now()).compareTo(WINDOW) > 0);
        }
        Instant now = Instant.now();
        byKey.compute(key, (ignored, prev) -> {
            boolean expired = prev == null
                    || Duration.between(prev.windowStart(), now).compareTo(WINDOW) > 0;
            int count = expired ? 1 : prev.count() + 1;
            Instant windowStart = expired ? now : prev.windowStart();
            Instant lockedUntil = count >= MAX_ATTEMPTS ? now.plus(LOCKOUT) : null;
            return new Attempts(count, windowStart, lockedUntil);
        });
    }

    private static String key(String prefix, String value) {
        return prefix + ":" + (value == null ? "" : value.trim().toLowerCase());
    }
}
