package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "email_otp")
@Data
@NoArgsConstructor
public class EmailOtp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer otpId;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String codeHash;

    private String verificationToken;
    private LocalDateTime expiresAt;
    private LocalDateTime verifiedAt;
    private LocalDateTime consumedAt;
    private Integer attempts;

    @Column(updatable = false)
    private LocalDateTime createdOn;

    @PrePersist
    protected void onCreate() {
        createdOn = LocalDateTime.now();
        if (attempts == null)
            attempts = 0;
    }
}
