package com.danphe.emr.service;

import com.danphe.emr.model.EmailOtp;
import com.danphe.emr.repository.EmailOtpRepository;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class EmailOtpService {

    @Autowired
    private EmailOtpRepository emailOtpRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${spring.mail.username:croctechconnect@gmail.com}")
    private String senderEmail;

    @Value("${spring.mail.password:}")
    private String smtpPassword;

    private final SecureRandom secureRandom = new SecureRandom();

    public SendResult sendOtp(String email) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail == null) {
            throw new IllegalArgumentException("Valid email address is required");
        }

        String code = String.format("%06d", secureRandom.nextInt(1_000_000));
        EmailOtp otp = new EmailOtp();
        otp.setEmail(normalizedEmail);
        otp.setCodeHash(passwordEncoder.encode(code));
        otp.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        emailOtpRepository.save(otp);

        boolean mockMode = smtpPassword == null || smtpPassword.isBlank();
        if (mockMode) {
            System.out.println("Email OTP mock mode for " + normalizedEmail + ": " + code);
            return new SendResult(true, "OTP generated in test mode. Configure GMAIL_APP_PASSWORD for real email.",
                    true, code);
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            System.out.println("Email OTP mail sender unavailable for " + normalizedEmail + ": " + code);
            return new SendResult(true, "OTP generated. Mail sender is not configured.", true, code);
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(senderEmail);
        message.setTo(normalizedEmail);
        message.setSubject("Trikaar HMS OTP " + code);
        message.setText("Your Trikaar HMS verification OTP is " + code
                + ". It is valid for 10 minutes. Do not share this code.");
        mailSender.send(message);
        System.out.println("Email OTP sent to " + normalizedEmail);
        return new SendResult(true, "OTP sent to " + normalizedEmail, false, null);
    }

    public VerifyResult verifyOtp(String email, String code) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail == null || code == null || code.trim().length() != 6) {
            throw new IllegalArgumentException("Valid email and 6 digit OTP are required");
        }

        List<EmailOtp> activeOtps = emailOtpRepository.findByEmailOrderByCreatedOnDesc(normalizedEmail).stream()
                .filter(otp -> otp.getConsumedAt() == null)
                .filter(otp -> otp.getExpiresAt() != null && otp.getExpiresAt().isAfter(LocalDateTime.now()))
                .toList();
        if (activeOtps.isEmpty()) {
            throw new IllegalArgumentException("Please request an OTP first");
        }

        EmailOtp latestOtp = activeOtps.get(0);
        if (latestOtp.getAttempts() != null && latestOtp.getAttempts() >= 5) {
            throw new IllegalArgumentException("Too many incorrect attempts. Please request a new OTP.");
        }

        String submittedCode = code.trim();
        for (EmailOtp otp : activeOtps) {
            if (passwordEncoder.matches(submittedCode, otp.getCodeHash())) {
                otp.setVerifiedAt(LocalDateTime.now());
                otp.setVerificationToken(UUID.randomUUID().toString());
                emailOtpRepository.save(otp);
                return new VerifyResult(true, otp.getVerificationToken());
            }
        }

        latestOtp.setAttempts((latestOtp.getAttempts() == null ? 0 : latestOtp.getAttempts()) + 1);
        emailOtpRepository.save(latestOtp);
        throw new IllegalArgumentException("Invalid OTP");
    }

    public boolean isTokenValidForEmail(String token, String email) {
        String normalizedEmail = normalizeEmail(email);
        if (token == null || token.isBlank() || normalizedEmail == null) {
            return false;
        }

        return emailOtpRepository.findByVerificationToken(token)
                .filter(otp -> normalizedEmail.equals(otp.getEmail()))
                .filter(otp -> otp.getVerifiedAt() != null)
                .filter(otp -> otp.getConsumedAt() == null)
                .filter(otp -> otp.getExpiresAt() != null && otp.getExpiresAt().isAfter(LocalDateTime.now()))
                .isPresent();
    }

    public void consumeToken(String token) {
        if (token == null || token.isBlank())
            return;
        emailOtpRepository.findByVerificationToken(token).ifPresent(otp -> {
            otp.setConsumedAt(LocalDateTime.now());
            emailOtpRepository.save(otp);
        });
    }

    private String normalizeEmail(String email) {
        if (email == null)
            return null;
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        if (!normalized.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))
            return null;
        return normalized;
    }

    public record SendResult(boolean success, String message, boolean mockMode, String code) {
    }

    public record VerifyResult(boolean success, String verificationToken) {
    }
}
