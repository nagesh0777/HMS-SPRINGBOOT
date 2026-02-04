package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "billing_transaction")
@Data
@NoArgsConstructor
public class BillingTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer billingTransactionId;

    private Integer patientId;
    private Integer patientVisitId;

    // "cash", "credit", "insurance"
    private String transactionType;

    // "paid", "unpaid", "cancelled", "returned"
    private String billStatus;

    // Amounts
    private Double totalQuantity;
    private Double subTotal;
    private Double discountPercent;
    private Double discountAmount;
    private Double taxTotal;
    private Double totalAmount;
    private Double paidAmount;
    private Double tender;
    private Double change;

    // Payment Details
    private String paymentMode; // Cash, Card, Cheque, etc.
    private String paymentDetails;

    // Fiscal Year & Invoice Logic
    private Integer fiscalYearId; // e.g. 2023 for 2023/24
    private String invoiceCode; // e.g. "BL"
    private Integer invoiceNo; // Sequential number

    private String remarks;

    // Audit
    private Integer createdBy;
    private LocalDateTime createdOn;

    @OneToMany(mappedBy = "billingTransaction", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BillingTransactionItem> billingTransactionItems = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdOn = LocalDateTime.now();
        if (billStatus == null)
            billStatus = "paid";
    }
}
