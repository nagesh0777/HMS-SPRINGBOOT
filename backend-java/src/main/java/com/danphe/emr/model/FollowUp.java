package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Entity
@Table(name = "follow_up")
@Data
@NoArgsConstructor
public class FollowUp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer followUpId;

    private Integer hospitalId;
    private Integer patientId;
    private Integer doctorId;
    private Integer appointmentId;
    private Integer prescriptionId;

    // Patient snapshot
    @Transient
    private String patientName;

    private LocalDate followUpDate;

    @Column(length = 2000)
    private String careInstructions;

    @Column(columnDefinition = "TEXT")
    private String treatmentPlan; // Long-term treatment plan

    @Column(length = 500)
    private String reason;

    // "scheduled", "completed", "missed", "cancelled"
    private String status;

    // Priority: "routine", "urgent", "critical"
    private String priority;

    // Audit
    private LocalDateTime createdOn;
    private Integer createdBy;
    private LocalDateTime modifiedOn;

    @PrePersist
    protected void onCreate() {
        createdOn = LocalDateTime.now();
        if (status == null) {
            status = "scheduled";
        }
        if (priority == null) {
            priority = "routine";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        modifiedOn = LocalDateTime.now();
    }
}
