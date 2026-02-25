package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "billing")
@Data
@NoArgsConstructor
public class Billing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer billId;

    @Column(nullable = false)
    private Integer hospitalId;

    @Column(nullable = false)
    private Integer patientId;

    // OPD / IPD
    @Column(nullable = false)
    private String billType;

    // Auto-generated: BILL-{hospitalCode}-{runningNumber}
    @Column(unique = true)
    private String billNumber;

    // Stored as JSON: [{itemName, category, quantity, unitPrice, total}]
    @Column(columnDefinition = "TEXT")
    private String billItems;

    private Double subtotal;
    private Double discountPercent;
    private Double discountAmount;
    private Double taxPercent;
    private Double taxAmount;
    private Double grandTotal;

    // Paid / Unpaid / Partial
    private String paymentStatus;

    // Cash / UPI / Card / Insurance
    private String paymentMode;

    private Double paidAmount;

    private Integer createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime modifiedAt;

    @Transient
    private String patientName;
    @Transient
    private String patientCode;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (paymentStatus == null)
            paymentStatus = "Unpaid";
    }

    @PreUpdate
    protected void onUpdate() {
        modifiedAt = LocalDateTime.now();
    }
}
