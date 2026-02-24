package com.danphe.emr.controller;

import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.model.Notification;
import com.danphe.emr.repository.NotificationRepository;
import com.danphe.emr.security.SecurityUtil;
import com.danphe.emr.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/Notifications")
@CrossOrigin(origins = "*", maxAge = 3600)
public class NotificationController {

    @Autowired
    private NotificationRepository notificationRepository;

    @GetMapping("")
    public ResponseEntity<?> getMyNotifications() {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        UserDetailsImpl user = SecurityUtil.getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).body(DanpheHttpResponse.error("Unauthorized"));
        }

        // Get notifications targeted at this user or their role
        List<Notification> userNotifs = notificationRepository
                .findTop50ByHospitalIdAndTargetUserIdOrderByCreatedOnDesc(hospitalId, user.getId());
        List<Notification> roleNotifs = notificationRepository
                .findTop50ByHospitalIdAndTargetRoleOrderByCreatedOnDesc(hospitalId, user.getRole());

        // Merge and deduplicate
        Set<Long> seen = new HashSet<>();
        List<Notification> merged = new ArrayList<>();
        for (Notification n : userNotifs) {
            if (seen.add(n.getNotificationId()))
                merged.add(n);
        }
        for (Notification n : roleNotifs) {
            if (seen.add(n.getNotificationId()))
                merged.add(n);
        }
        merged.sort((a, b) -> b.getCreatedOn().compareTo(a.getCreatedOn()));

        return ResponseEntity.ok(DanpheHttpResponse.ok(merged));
    }

    @GetMapping("/UnreadCount")
    public ResponseEntity<?> getUnreadCount() {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        UserDetailsImpl user = SecurityUtil.getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).body(DanpheHttpResponse.error("Unauthorized"));
        }

        long userCount = notificationRepository.countByHospitalIdAndTargetUserIdAndIsRead(hospitalId, user.getId(),
                false);
        long roleCount = notificationRepository.countByHospitalIdAndTargetRoleAndIsRead(hospitalId, user.getRole(),
                false);

        return ResponseEntity.ok(DanpheHttpResponse.ok(Map.of("unread", userCount + roleCount)));
    }

    @PutMapping("/{id}/Read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        Optional<Notification> opt = notificationRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Notification not found"));
        }
        Notification n = opt.get();
        n.setIsRead(true);
        n.setReadOn(LocalDateTime.now());
        notificationRepository.save(n);
        return ResponseEntity.ok(DanpheHttpResponse.ok("Marked as read"));
    }

    @PutMapping("/ReadAll")
    public ResponseEntity<?> markAllAsRead() {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        UserDetailsImpl user = SecurityUtil.getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).body(DanpheHttpResponse.error("Unauthorized"));
        }

        List<Notification> unread = notificationRepository
                .findByHospitalIdAndTargetUserIdAndIsReadOrderByCreatedOnDesc(hospitalId, user.getId(), false);
        for (Notification n : unread) {
            n.setIsRead(true);
            n.setReadOn(LocalDateTime.now());
        }
        notificationRepository.saveAll(unread);
        return ResponseEntity.ok(DanpheHttpResponse.ok("All marked as read"));
    }

    @PostMapping("")
    public ResponseEntity<?> createNotification(@RequestBody Notification notification) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        notification.setHospitalId(hospitalId);
        Notification saved = notificationRepository.save(notification);
        return ResponseEntity.ok(DanpheHttpResponse.ok(saved));
    }
}
