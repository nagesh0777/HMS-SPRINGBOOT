package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "medical_record")
@Data
@NoArgsConstructor
public class MedicalRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer recordId;

    private Integer hospitalId;
    private Integer patientId;
    private Integer doctorId;
    private Integer appointmentId;

    // Record type: "consultation", "lab_result", "diagnosis", "procedure", "note"
    private String recordType;

    @Column(length = 500)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String findings;

    // For lab results
    private String labTestName;
    private String labResult;
    // "pending", "completed", "reviewed"
    private String labStatus;

    // Risk flags
    @Column(length = 1000)
    private String allergies;

    @Column(length = 1000)
    private String riskFlags; // e.g., "diabetic,hypertension,pregnant"

    // Attachments (file path or URL)
    @Column(length = 1000)
    private String attachmentUrl;
    private String attachmentName;

    // Audit
    private LocalDateTime createdOn;
    private Integer createdBy;
    private LocalDateTime modifiedOn;

    @PrePersist
    protected void onCreate() {
        createdOn = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        modifiedOn = LocalDateTime.now();
    }
}
