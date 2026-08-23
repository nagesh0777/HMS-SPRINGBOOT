package com.danphe.emr.repository;

import com.danphe.emr.model.EmailOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmailOtpRepository extends JpaRepository<EmailOtp, Integer> {
    Optional<EmailOtp> findTopByEmailOrderByCreatedOnDesc(String email);

    List<EmailOtp> findByEmailOrderByCreatedOnDesc(String email);

    Optional<EmailOtp> findByVerificationToken(String verificationToken);
}
