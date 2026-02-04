package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "employee")
@Data
@NoArgsConstructor
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer employeeId;
    private Integer doctorId;

    private String firstName;
    private String lastName;

    // Role: Doctor / Nurse / Admin / Receptionist
    private String role;

    private String department;
    private String phoneNumber;
    private String email;

    // Login & Access
    private String userName;
    private String accessLevel; // SuperAdmin, Admin, Standard
    private String assignedModules; // e.g., "Patients, Appointment, ADT"

    // Work Info
    private String shiftTiming;
    private String dutyDays;
    private String assignedWard;

    // Status: Active / On Leave
    private String status;

    @Column(length = 1000)
    private String adminNotes;

    private Boolean isActive;

    @Transient
    private String password; // Used for creating/updating user credentials

    @Column(updatable = false)
    private LocalDateTime createdOn;

    @PrePersist
    protected void onCreate() {
        createdOn = LocalDateTime.now();
        if (isActive == null)
            isActive = true;
        if (status == null)
            status = "Active";
    }

    public String getFullName() {
        return firstName + " " + lastName;
    }
}
