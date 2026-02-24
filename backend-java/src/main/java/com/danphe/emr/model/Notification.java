package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "notification")
@Data
@NoArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long notificationId;

    private Integer hospitalId;

    // Who should see this
    private Integer targetUserId;
    private String targetRole; // if null, goes to targetUserId; if set, goes to all users with this role

    // "appointment_reminder", "lab_result", "billing", "follow_up", "system",
    // "emergency"
    private String type;

    private String title;

    @Column(length = 2000)
    private String message;

    // Link to relevant entity
    private String relatedModule;
    private String relatedEntityId;

    private Boolean isRead;
    // "low", "medium", "high", "urgent"
    private String priority;

    private LocalDateTime createdOn;
    private LocalDateTime readOn;

    @PrePersist
    protected void onCreate() {
        createdOn = LocalDateTime.now();
        if (isRead == null)
            isRead = false;
        if (priority == null)
            priority = "medium";
    }
}
