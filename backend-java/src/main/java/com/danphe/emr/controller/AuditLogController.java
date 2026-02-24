package com.danphe.emr.controller;

import com.danphe.emr.model.AuditLog;
import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.repository.AuditLogRepository;
import com.danphe.emr.security.SecurityUtil;
import com.danphe.emr.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/AuditLog")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuditLogController {

    @Autowired
    private AuditLogRepository auditLogRepository;

    @GetMapping("")
    public ResponseEntity<?> getAuditLogs(
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo) {

        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null) {
            return ResponseEntity.status(401).body(DanpheHttpResponse.error("Unauthorized"));
        }

        List<AuditLog> logs;

        if (dateFrom != null && dateTo != null) {
            LocalDateTime start = LocalDate.parse(dateFrom).atStartOfDay();
            LocalDateTime end = LocalDate.parse(dateTo).atTime(LocalTime.MAX);
            logs = auditLogRepository.findByHospitalIdAndTimestampBetweenOrderByTimestampDesc(hospitalId, start, end);
        } else if (module != null && !module.isBlank()) {
            logs = auditLogRepository.findByHospitalIdAndModuleOrderByTimestampDesc(hospitalId, module);
        } else if (action != null && !action.isBlank()) {
            logs = auditLogRepository.findByHospitalIdAndActionOrderByTimestampDesc(hospitalId, action);
        } else if (severity != null && !severity.isBlank()) {
            logs = auditLogRepository.findByHospitalIdAndSeverityOrderByTimestampDesc(hospitalId, severity);
        } else {
            logs = auditLogRepository.findTop200ByHospitalIdOrderByTimestampDesc(hospitalId);
        }

        return ResponseEntity.ok(DanpheHttpResponse.ok(logs));
    }

    @GetMapping("/Stats")
    public ResponseEntity<?> getStats() {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null) {
            return ResponseEntity.status(401).body(DanpheHttpResponse.error("Unauthorized"));
        }

        List<AuditLog> allLogs = auditLogRepository.findTop200ByHospitalIdOrderByTimestampDesc(hospitalId);

        Map<String, Long> byModule = allLogs.stream()
                .filter(l -> l.getModule() != null)
                .collect(Collectors.groupingBy(AuditLog::getModule, Collectors.counting()));

        Map<String, Long> byAction = allLogs.stream()
                .filter(l -> l.getAction() != null)
                .collect(Collectors.groupingBy(AuditLog::getAction, Collectors.counting()));

        Map<String, Long> bySeverity = allLogs.stream()
                .filter(l -> l.getSeverity() != null)
                .collect(Collectors.groupingBy(AuditLog::getSeverity, Collectors.counting()));

        return ResponseEntity.ok(DanpheHttpResponse.ok(Map.of(
                "total", allLogs.size(),
                "byModule", byModule,
                "byAction", byAction,
                "bySeverity", bySeverity)));
    }

    // Helper: log an action (called from other controllers)
    public void log(String action, String module, String entityId, String entityName, String description) {
        try {
            UserDetailsImpl user = SecurityUtil.getCurrentUser();
            Integer hospitalId = SecurityUtil.getCurrentHospitalId();

            AuditLog log = new AuditLog();
            log.setHospitalId(hospitalId);
            log.setUserName(user != null ? user.getUsername() : "System");
            log.setUserRole(user != null ? user.getRole() : "System");
            log.setUserId(user != null ? user.getId() : null);
            log.setAction(action);
            log.setModule(module);
            log.setEntityId(entityId);
            log.setEntityName(entityName);
            log.setDescription(description);
            log.setSeverity("info");

            auditLogRepository.save(log);
        } catch (Exception e) {
            System.err.println("Audit log failed: " + e.getMessage());
        }
    }
}
