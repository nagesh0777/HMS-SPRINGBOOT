package com.danphe.emr.security;

import java.security.SecureRandom;

/**
 * Generates a one-off password for a newly created or repaired account.
 *
 * Accounts used to fall back to a single hardcoded value, so every account created without an
 * explicit password shared the same known credential — and usernames here are derived from names,
 * so they are guessable. One leaked default was enough to sign in as any of them.
 *
 * The generated value is returned to the administrator who triggered the action so they can pass
 * it on, and the account is flagged to force a change at first sign-in. It is never written to a
 * log.
 */
public final class TemporaryPassword {

    // Ambiguous characters (0/O, 1/l/I) left out — these get read aloud and typed by hand.
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    private static final int LENGTH = 12;
    private static final SecureRandom RANDOM = new SecureRandom();

    private TemporaryPassword() {}

    public static String generate() {
        StringBuilder sb = new StringBuilder(LENGTH);
        for (int i = 0; i < LENGTH; i++) {
            sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }
}
