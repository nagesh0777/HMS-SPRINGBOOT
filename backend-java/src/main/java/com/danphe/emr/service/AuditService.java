package com.danphe.emr.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import com.danphe.emr.model.AuditLog;
import com.danphe.emr.repository.AuditLogRepository;
import com.danphe.emr.security.SecurityUtil;
import com.danphe.emr.security.UserDetailsImpl;

/**
 * Writes the clinical access trail.
 *
 * The AuditLog table and a read API already existed, but only one endpoint ever wrote to it — so
 * in practice there was no record of who opened which patient's chart. For a system holding
 * health records that is the trail you need after an incident, and under India's DPDP Act it is
 * the evidence that access was appropriate.
 *
 * Writes run in their own transaction so a logging failure can never roll back the clinical
 * operation it is describing, and never fails the request.
 */
@Service
public class AuditService {

    @Autowired
    private AuditLogRepository auditLogRepository;

    /** A record was read. The one that matters most for health data, and was never captured. */
    public void recordView(String module, Object entityId, String entityName) {
        write("VIEW", module, entityId, entityName, null);
    }

    public void recordChange(String action, String module, Object entityId, String entityName, String detail) {
        write(action, module, entityId, entityName, detail);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void write(String action, String module, Object entityId, String entityName, String detail) {
        try {
            UserDetailsImpl actor = SecurityUtil.getCurrentUser();
            AuditLog log = new AuditLog();
            log.setHospitalId(actor != null ? actor.getHospitalId() : null);
            log.setUserId(actor != null ? actor.getId() : null);
            log.setUserName(actor != null ? actor.getUsername() : "system");
            log.setUserRole(actor != null ? actor.getRole() : null);
            log.setAction(action);
            log.setModule(module);
            log.setEntityId(entityId != null ? String.valueOf(entityId) : null);
            log.setEntityName(entityName);
            log.setDescription(detail);
            auditLogRepository.save(log);
        } catch (RuntimeException ignored) {
            // Auditing must never break the operation it is recording.
        }
    }
}
