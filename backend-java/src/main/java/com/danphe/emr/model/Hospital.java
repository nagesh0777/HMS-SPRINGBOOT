package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "hospital")
@Data
@NoArgsConstructor
public class Hospital {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer hospitalId;

    @Column(nullable = false, unique = true)
    private String name;

    private String address;
    private String contactNumber;
    private String email;

    private Boolean isActive;

    private String logoPath;

    // License/Subscription fields can be added here
    private LocalDateTime subscriptionExpiry;

    @Column(updatable = false)
    private LocalDateTime createdOn;

    @PrePersist
    protected void onCreate() {
        createdOn = LocalDateTime.now();
        if (isActive == null)
            isActive = true;
    }
}
