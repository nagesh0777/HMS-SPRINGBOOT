package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "doctor")
@Data
@NoArgsConstructor
public class Doctor {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer doctorId;

    private String fullName;
    private String department;
    private String specialization;
    private String phoneNumber;
    private String email;

    // Availability Settings (Simple for now: startTime to endTime)
    private String startTime; // e.g., "09:00"
    private String endTime; // e.g., "17:00"

    private Boolean isActive;

    private Integer employeeId;

    @Transient
    private String userName;

    @Transient
    private String password;

    @PrePersist
    protected void onCreate() {
        if (isActive == null)
            isActive = true;
    }
}
