package com.danphe.emr.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
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

    // Multi-tenancy
    private Integer hospitalId;

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    // Role: Doctor / Nurse / Admin / Receptionist
    @NotBlank(message = "Role is required")
    private String role;

    private String department;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[0-9]{10,15}$", message = "Invalid mobile number format")
    private String phoneNumber;

    @Email(message = "Invalid email format")
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
    @Size(min = 6, message = "Password must be at least 6 characters")
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
