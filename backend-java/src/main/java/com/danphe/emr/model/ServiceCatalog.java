package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "service_catalog")
@Data
@NoArgsConstructor
public class ServiceCatalog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer serviceId;

    @Column(nullable = false)
    private Integer hospitalId;

    @Column(nullable = false)
    private String serviceName;

    // OPD / IPD / Lab / Imaging / Procedure / Pharmacy / Room / Nursing / Other
    @Column(nullable = false)
    private String category;

    // Sub-category: e.g. "General Ward", "ICU", "Semi-Private" for Room category
    private String subCategory;

    @Column(nullable = false)
    private Double rate;

    // per_visit / per_day / per_unit / fixed
    private String rateType;

    // Description for staff reference
    @Column(length = 500)
    private String description;

    // Department this service belongs to
    private String department;

    private Boolean isActive;

    private LocalDateTime createdOn;
    private LocalDateTime modifiedOn;

    @PrePersist
    protected void onCreate() {
        createdOn = LocalDateTime.now();
        if (isActive == null)
            isActive = true;
        if (rateType == null)
            rateType = "fixed";
    }

    @PreUpdate
    protected void onUpdate() {
        modifiedOn = LocalDateTime.now();
    }
}
