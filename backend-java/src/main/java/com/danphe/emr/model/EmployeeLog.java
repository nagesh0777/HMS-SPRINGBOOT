package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "EmployeeLog")
@Data
public class EmployeeLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer logId;

    private Integer employeeId;
    private String employeeName;
    private String action; // e.g., "CREATED", "UPDATED", "DELETED", "STATUS_CHANGED"
    private String performedBy;
    private LocalDateTime timestamp;

    @Column(length = 2000)
    private String details;

    public EmployeeLog() {
    }

    public EmployeeLog(Integer employeeId, String employeeName, String action, String performedBy, String details) {
        this.employeeId = employeeId;
        this.employeeName = employeeName;
        this.action = action;
        this.performedBy = performedBy;
        this.timestamp = LocalDateTime.now();
        this.details = details;
    }
}
