package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "final_bill")
@Data
@NoArgsConstructor
public class FinalBill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer finalBillId;

    @Column(nullable = false)
    private Integer hospitalId;

    @Column(nullable = false)
    private Integer patientId;

    @Column(unique = true)
    private String billNumber;

    // Comma-separated bill IDs that were combined
    private String sourceBillIds;

    // Merged items from all OPD + IPD bills as JSON
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
    private String paymentMode;
    private Double paidAmount;

    private Integer createdBy;
    private LocalDateTime createdAt;

    @Transient
    private String patientName;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (paymentStatus == null)
            paymentStatus = "Unpaid";
    }
}
