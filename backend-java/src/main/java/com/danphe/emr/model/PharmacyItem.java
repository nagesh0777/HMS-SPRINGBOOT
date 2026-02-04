package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "phrm_item_master")
@Data
@NoArgsConstructor
public class PharmacyItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer itemId;

    @Column(nullable = false)
    private String itemName;
    private String itemCode;

    // Core Pharmacy Fields
    private Integer genericId;
    private Integer companyId;
    private Integer itemTypeId;
    private Integer uomId;

    // Stock Config
    private Double reOrderQuantity;
    private Double minStockQuantity;

    // Financials
    private Boolean isVatApplicable;
    private Double purchaseVatPercentage;
    private Double salesVatPercentage;

    // Clinical
    private String dosage; // e.g. 500mg
    private Boolean isNarcotic;

    private Boolean isActive;

    private Integer createdBy;
    private LocalDateTime createdOn;

    @PrePersist
    protected void onCreate() {
        createdOn = LocalDateTime.now();
        isActive = true;
    }
}
