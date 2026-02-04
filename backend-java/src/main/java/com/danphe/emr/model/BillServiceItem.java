package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "bill_service_item")
@Data
@NoArgsConstructor
public class BillServiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer serviceItemId;

    private Integer serviceDepartmentId;

    // Master Item Name
    private String itemName;
    private String itemCode;

    // Link to external module ID (e.g., Lab Test ID)
    private Integer integrationItemId;

    // Normal Price (default)
    private Double price;

    private Boolean isTaxApplicable;
    private Boolean isDiscountApplicable;

    private Boolean isActive;

    private Integer createdBy;
    private LocalDateTime createdOn;

    @PrePersist
    protected void onCreate() {
        createdOn = LocalDateTime.now();
        isActive = true;
    }
}
