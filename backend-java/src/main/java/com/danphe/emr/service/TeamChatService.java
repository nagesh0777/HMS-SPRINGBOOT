package com.danphe.emr.service;

import com.danphe.emr.model.Employee;
import com.danphe.emr.model.Notification;
import com.danphe.emr.model.TeamChatMessage;
import com.danphe.emr.repository.EmployeeRepository;
import com.danphe.emr.repository.NotificationRepository;
import com.danphe.emr.repository.TeamChatRepository;
import com.danphe.emr.security.SecurityUtil;
import com.danphe.emr.security.UserDetailsImpl;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class TeamChatService {

    private final TeamChatRepository teamChatRepository;
    private final EmployeeRepository employeeRepository;
    private final NotificationRepository notificationRepository;

    public static final List<Map<String, String>> DEFAULT_CHANNELS = List.of(
            Map.of("id", "general", "name", "General", "desc", "Hospital-wide updates, handovers, and staff coordination"),
            Map.of("id", "urgent", "name", "Urgent", "desc", "Emergency alerts, critical patient calls, and rapid response")
    );

    public List<Map<String, String>> getAvailableChannels() {
        return DEFAULT_CHANNELS;
    }

    public List<TeamChatMessage> getMessages(Integer hospitalId, String channel) {
        if (hospitalId == null) return List.of();
        String targetChannel = (channel == null || channel.trim().isEmpty()) ? "general" : channel.trim().toLowerCase();
        LocalDateTime cutoff = LocalDateTime.now().minusDays(7);
        return teamChatRepository.findByHospitalIdAndChannelAndCreatedAtGreaterThanEqualOrderByCreatedAtAsc(hospitalId, targetChannel, cutoff);
    }

    @Transactional
    public TeamChatMessage postMessage(Integer hospitalId, String channel, String messageText, Boolean isUrgent) {
        if (hospitalId == null) {
            throw new IllegalArgumentException("Hospital ID is required");
        }
        if (messageText == null || messageText.trim().isEmpty()) {
            throw new IllegalArgumentException("Message content cannot be empty");
        }

        String targetChannel = (channel == null || channel.trim().isEmpty()) ? "general" : channel.trim().toLowerCase();
        UserDetailsImpl currentUser = SecurityUtil.getCurrentUser();

        String senderName = "Team Member";
        String senderRole = "Staff";
        String senderTitle = "Staff";
        Integer senderUserId = null;
        Integer senderEmpId = null;

        if (currentUser != null) {
            senderUserId = currentUser.getId();
            senderEmpId = currentUser.getEmployeeId();
            senderRole = currentUser.getRole() != null ? currentUser.getRole() : "Staff";
            senderName = currentUser.getUsername();

            if (senderEmpId != null) {
                Employee emp = employeeRepository.findById(senderEmpId).orElse(null);
                if (emp != null) {
                    senderName = emp.getFullName();
                    if (emp.getRole() != null && !emp.getRole().isBlank()) {
                        senderRole = emp.getRole();
                    }
                    if (emp.getDepartment() != null && !emp.getDepartment().isBlank()) {
                        senderTitle = emp.getDepartment();
                    } else {
                        senderTitle = senderRole;
                    }
                }
            } else if ("Doctor".equalsIgnoreCase(senderRole)) {
                senderName = "Dr. " + currentUser.getUsername();
                senderTitle = "Physician";
            }
        }

        TeamChatMessage msg = new TeamChatMessage();
        msg.setHospitalId(hospitalId);
        msg.setChannel(targetChannel);
        msg.setSenderUserId(senderUserId);
        msg.setSenderEmployeeId(senderEmpId);
        msg.setSenderName(senderName);
        msg.setSenderRole(senderRole);
        msg.setSenderTitle(senderTitle);
        msg.setMessage(messageText.trim());
        msg.setIsUrgent(Boolean.TRUE.equals(isUrgent));
        msg.setCreatedAt(LocalDateTime.now());

        TeamChatMessage saved = teamChatRepository.save(msg);

        // If urgent, broadcast as an emergency notification so everyone gets alerted in top bar
        if (Boolean.TRUE.equals(isUrgent)) {
            try {
                Notification notif = new Notification();
                notif.setHospitalId(hospitalId);
                notif.setType("emergency");
                notif.setPriority("urgent");
                notif.setTitle("Urgent Team Alert from " + senderName + " (" + senderRole + ")");
                notif.setMessage(messageText.trim());
                notif.setRelatedModule("teams");
                notif.setRelatedEntityId(targetChannel);
                notificationRepository.save(notif);
            } catch (Exception e) {
                log.warn("Failed to broadcast urgent team alert notification", e);
            }
        }

        return saved;
    }

    /**
     * Automated background pruning:
     * Deletes chat messages older than 7 days permanently to keep disk storage lean.
     */
    @PostConstruct
    public void initPurge() {
        purgeExpiredMessages();
    }

    @Scheduled(cron = "0 0 */4 * * *")
    @Transactional
    public int purgeExpiredMessages() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(7);
        int deleted = teamChatRepository.deleteExpiredMessages(cutoff);
        if (deleted > 0) {
            log.info("Team messages purge: removed {} records older than 7 days.", deleted);
        }
        return deleted;
    }
}
