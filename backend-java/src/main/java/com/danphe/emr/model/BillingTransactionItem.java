package com.danphe.emr.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "billing_transaction_item")
@Data
@NoArgsConstructor
public class BillingTransactionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer billingTransactionItemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "billingTransactionId")
    @JsonIgnore
    private BillingTransaction billingTransaction;

    private Integer patientId;
    private Integer patientVisitId;

    private Integer serviceDepartmentId;
    private String serviceDepartmentName;

    private Integer itemId; // Maps to Master Service Item
    private String itemName;
    private Double price;
    private Double quantity;
    private Double subTotal;
    private Double discountPercent;
    private Double discountAmount;
    private Double tax;
    private Double totalAmount;

    // "provisional", "confirmed", "cancelled"
    private String billStatus;

    // Performer (Doctor)
    private Integer performerId;
    private String performerName;

    // Audit
    private Integer createdBy;
    private LocalDateTime createdOn;

    @PrePersist
    protected void onCreate() {
        createdOn = LocalDateTime.now();
    }
}
