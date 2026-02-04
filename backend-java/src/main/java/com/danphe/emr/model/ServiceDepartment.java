package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "service_department")
@Data
@NoArgsConstructor
public class ServiceDepartment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer serviceDepartmentId;

    @Column(nullable = false)
    private String serviceDepartmentName;
    private String serviceDepartmentShortName;

    // Core department ID
    private Integer departmentId;

    // E.g., "Lab", "Radiology", "OPD"
    private String integrationName;

    private Boolean isActive;

    private Integer createdBy;
    private LocalDateTime createdOn;

    @PrePersist
    protected void onCreate() {
        createdOn = LocalDateTime.now();
        isActive = true;
    }
}
