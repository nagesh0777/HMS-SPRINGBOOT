package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "appointment")
@Data
@NoArgsConstructor
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer appointmentId;

    private Integer patientId;

    // Snapshot of patient details (as per original model, likely for non-registered
    // or quick access)
    private String firstName;
    private String middleName;
    private String lastName;
    private String gender;
    private String age;
    private String contactNumber;
    private String patientCode;

    @Column(nullable = false)
    private LocalDateTime appointmentDate;

    // private LocalTime appointmentTime; // Merged into appointmentDate

    private Integer performerId; // Doctor ID
    private String performerName;

    // "New", "Followup", etc.
    private String appointmentType;

    // "Initiated", "CheckedIn", "Cancelled", "Completed"
    private String appointmentStatus;

    private String reason;
    private Integer departmentId;

    // Audit
    private LocalDateTime createdOn;
    private Integer createdBy;
    private LocalDateTime modifiedOn;
    private Integer modifiedBy;

    private LocalDateTime cancelledOn;
    private Integer cancelledBy;
    private String cancelledRemarks;

    @PrePersist
    protected void onCreate() {
        createdOn = LocalDateTime.now();
        if (appointmentStatus == null) {
            appointmentStatus = "initiated";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        modifiedOn = LocalDateTime.now();
    }
}
