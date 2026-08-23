package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "hospital_subscription")
@Data
@NoArgsConstructor
public class HospitalSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer subscriptionId;

    private Integer hospitalId;
    private String planCode;
    private String billingCycle;
    private Integer amountInPaise;
    private String currency;
    private String status;
    private String promoCode;
    private String razorpayOrderId;
    private String razorpayPaymentId;
    private String razorpaySignature;
    private LocalDateTime startsAt;
    private LocalDateTime expiresAt;
    private LocalDateTime paidAt;

    @Column(updatable = false)
    private LocalDateTime createdOn;

    @PrePersist
    protected void onCreate() {
        createdOn = LocalDateTime.now();
        if (currency == null)
            currency = "INR";
    }
}
