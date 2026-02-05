package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "bed")
@Data
@NoArgsConstructor
public class Bed {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer bedId;
    private Integer hospitalId;

    private String bedNumber;
    private String ward;
    private String floor;

    private Double pricePerDay;

    // "available", "occupied", "maintenance"
    private String status;

    private Boolean isActive;

    @PrePersist
    protected void onCreate() {
        if (isActive == null)
            isActive = true;
    }
}
