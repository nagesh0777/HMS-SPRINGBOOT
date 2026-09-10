package com.danphe.emr.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "team_chat_message", indexes = {
    @Index(name = "idx_team_chat_hosp_chan_time", columnList = "hospitalId, channel, createdAt"),
    @Index(name = "idx_team_chat_created_at", columnList = "createdAt")
})
@Data
@NoArgsConstructor
public class TeamChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer hospitalId;

    @Column(nullable = false, length = 64)
    private String channel; // e.g. general, doctors-lounge, urgent-calls, ipd-nursing, opd-reception

    private Integer senderUserId;
    private Integer senderEmployeeId;

    @Column(nullable = false, length = 128)
    private String senderName;

    @Column(nullable = false, length = 64)
    private String senderRole; // e.g. Doctor, Nurse, Admin, Receptionist

    @Column(length = 128)
    private String senderTitle; // e.g. Chief of Cardiology, ICU Ward, Reception

    @Column(nullable = false, length = 4000)
    private String message;

    private Boolean isUrgent;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (isUrgent == null) {
            isUrgent = false;
        }
        if (channel == null || channel.trim().isEmpty()) {
            channel = "general";
        }
    }
}
