package com.danphe.emr.service;

import com.danphe.emr.model.Employee;
import com.danphe.emr.model.TeamChatMessage;
import com.danphe.emr.repository.EmployeeRepository;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class TeamChatService {

    private final TeamChatRepository teamChatRepository;
    private final EmployeeRepository employeeRepository;

    public static final List<Map<String, String>> DEFAULT_CHANNELS = List.of(
            Map.of("id", "general", "name", "General Huddle", "desc", "Hospital-wide handovers, shifts, and coordination announcements"),
            Map.of("id", "doctors-lounge", "name", "Doctors Lounge", "desc", "Physician-to-physician clinical consultations and case discussions"),
            Map.of("id", "urgent-calls", "name", "Urgent & Code Alerts", "desc", "High priority alerts, rapid response, emergency notifications"),
            Map.of("id", "ipd-nursing", "name", "IPD & Nursing Ward", "desc", "Inpatient bed transfers, medication checks, and nursing handovers"),
            Map.of("id", "opd-reception", "name", "OPD & Front Desk", "desc", "Patient arrivals, schedule delays, token status, registration queries")
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

        String senderName = "Care Team Member";
        String senderRole = "Staff";
        String senderTitle = "Hospital Care Team";
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

        return teamChatRepository.save(msg);
    }

    /**
     * Automated pruning routine:
     * Runs on startup and every 4 hours to purge any chat message older than 7 days,
     * permanently releasing disk and database space.
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
            log.info("CareTeams: Successfully purged {} ephemeral messages older than 7 days (before {}) to save disk space.", deleted, cutoff);
        }
        return deleted;
    }
}
