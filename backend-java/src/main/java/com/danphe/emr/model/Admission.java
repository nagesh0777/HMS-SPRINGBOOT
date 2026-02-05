package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "admission")
@Data
@NoArgsConstructor
public class Admission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer patientAdmissionId;

    private Integer hospitalId;

    private Integer patientVisitId;
    private Integer patientId;
    private Integer admittingDoctorId;

    @Transient
    private String patientName;
    @Transient
    private String patientCode;

    // Link to Bed
    private Integer bedId;

    @Column(nullable = false)
    private LocalDateTime admissionDate;
    private LocalDateTime dischargeDate;

    @Column(length = 2000)
    private String admissionNotes;

    @Column(length = 2000)
    private String admissionOrders;

    // "admitted", "discharged", "cancelled", "provisional_discharge"
    private String admissionStatus;

    private String billStatusOnDischarge;
    private String dischargeRemarks;

    // Care Taker Info
    private String careOfPersonName;
    private String careOfPersonPhoneNo;
    private String careOfPersonRelation;

    // Audit
    private Integer createdBy;
    private LocalDateTime createdOn;
    private Integer modifiedBy;
    private LocalDateTime modifiedOn;
    private Integer dischargedBy;

    private Integer cancelledBy;
    private LocalDateTime cancelledOn;
    private String cancelledRemark;

    @PrePersist
    protected void onCreate() {
        createdOn = LocalDateTime.now();
        if (admissionStatus == null) {
            admissionStatus = "admitted";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        modifiedOn = LocalDateTime.now();
    }
}
