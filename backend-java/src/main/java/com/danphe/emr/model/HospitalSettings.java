package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "hospital_settings")
@Data
@NoArgsConstructor
public class HospitalSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer settingsId;

    @Column(nullable = false, unique = true)
    private Integer hospitalId;

    private String hospitalName;
    private String logoPath;
    private String address;
    private String phoneNumber;
    private String email;
    private String gstNumber;
    private String registrationNumber;

    @Column(length = 2000)
    private String footerText;

    private String signatureImagePath;

    // Bill prefix code e.g. "APL" for Apollo
    private String hospitalCode;

    // Running bill counter
    private Integer lastBillNumber;

    private LocalDateTime createdOn;
    private LocalDateTime modifiedOn;

    @PrePersist
    protected void onCreate() {
        createdOn = LocalDateTime.now();
        if (lastBillNumber == null)
            lastBillNumber = 0;
    }

    @PreUpdate
    protected void onUpdate() {
        modifiedOn = LocalDateTime.now();
    }
}
