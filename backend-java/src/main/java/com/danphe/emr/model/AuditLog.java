package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_log")
@Data
@NoArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long logId;

    private Integer hospitalId;

    // Who performed the action
    private Integer userId;
    private String userName;
    private String userRole;

    // What action was performed
    // "CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "VIEW", "EXPORT",
    // "STATUS_CHANGE"
    private String action;

    // Which module/entity
    // "Patient", "Appointment", "Doctor", "Staff", "Billing", "Prescription",
    // "Admission", "FollowUp"
    private String module;

    // Target entity ID (e.g., patientId, appointmentId)
    private String entityId;
    private String entityName;

    // Details
    @Column(columnDefinition = "TEXT")
    private String description;

    // Change data (JSON: {field: {old, new}})
    @Column(columnDefinition = "TEXT")
    private String changeData;

    // Request metadata
    private String ipAddress;
    private String userAgent;

    // Severity: "info", "warning", "critical"
    private String severity;

    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        timestamp = LocalDateTime.now();
        if (severity == null)
            severity = "info";
    }

    // Constructor for convenience
    public AuditLog(Integer hospitalId, String userName, String userRole, String action,
            String module, String entityId, String entityName, String description) {
        this.hospitalId = hospitalId;
        this.userName = userName;
        this.userRole = userRole;
        this.action = action;
        this.module = module;
        this.entityId = entityId;
        this.entityName = entityName;
        this.description = description;
    }
}
