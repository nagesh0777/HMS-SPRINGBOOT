package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "rbac_user")
@Data
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer userId;

    private Integer employeeId;

    @Column(unique = true, nullable = false)
    private String userName;

    private String password; // In production this should be hashed (BCrypt)

    private String email;

    private Boolean isActive;

    private Boolean needsPasswordUpdate;

    private Integer landingPageRouteId;

    @Column(updatable = false)
    private LocalDateTime createdOn;

    private Integer createdBy;

    private LocalDateTime modifiedOn;

    private Integer modifiedBy;

    @PrePersist
    protected void onCreate() {
        createdOn = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        modifiedOn = LocalDateTime.now();
    }
}
