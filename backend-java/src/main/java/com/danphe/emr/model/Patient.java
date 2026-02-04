package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Entity
@Table(name = "patient")
@Data
@NoArgsConstructor
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer patientId;

    @Column(nullable = false)
    private Integer patientNo;

    @Column(length = 50)
    private String patientCode;

    private String firstName;
    private String middleName;
    private String lastName;

    private String gender; // Male/Female/Other
    private String age; // e.g., "20Y", "10M"
    private LocalDate dateOfBirth;

    private String phoneNumber;
    private String address;
    private String email;

    // Core optional fields
    private String maritalStatus;
    private String bloodGroup;
    private String countryId;
    private String countrySubDivisionId; // District/State

    private Boolean isActive;

    // Audit fields
    private LocalDateTime createdOn;
    private Integer createdBy;
    private LocalDateTime modifiedOn;
    private Integer modifiedBy;

    // Additional fields from original model
    private String empi; // Enterprise Master Patient Index
    private String panNumber;
    private Boolean isDobVerified;

    @PrePersist
    protected void onCreate() {
        createdOn = LocalDateTime.now();
        isActive = true;
    }

    @PreUpdate
    protected void onUpdate() {
        modifiedOn = LocalDateTime.now();
    }
}
