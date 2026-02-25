package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "prescription")
@Data
@NoArgsConstructor
public class Prescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer prescriptionId;

    private Integer hospitalId;
    private Integer patientId;
    private Integer doctorId;
    private Integer appointmentId;

    // Patient snapshot
    @Transient
    private String patientName;

    // Prescription content stored as JSON string
    @Column(columnDefinition = "TEXT")
    private String medicines; // JSON array: [{name, dosage, frequency, duration, instructions}]

    @Column(length = 2000)
    private String diagnosis;

    @Column(length = 2000)
    private String clinicalNotes; // Chief complaint - what the patient reported

    @Column(length = 1000)
    private String allergyWarnings;

    // Patient vitals at time of consultation
    private Double patientWeight; // in kg
    private Double patientHeight; // in cm

    // "draft", "finalized", "sent_to_pharmacy", "dispensed"
    private String status;

    private String templateName;

    // Follow-up / Next appointment
    private LocalDate followUpDate;

    @Column(length = 500)
    private String followUpNotes;

    // Audit
    private LocalDateTime createdOn;
    private Integer createdBy;
    private LocalDateTime modifiedOn;
    private Integer modifiedBy;

    @PrePersist
    protected void onCreate() {
        createdOn = LocalDateTime.now();
        if (status == null) {
            status = "draft";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        modifiedOn = LocalDateTime.now();
    }
}
