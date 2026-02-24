package com.danphe.emr.repository;

import com.danphe.emr.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findByHospitalIdOrderByTimestampDesc(Integer hospitalId);

    List<AuditLog> findByHospitalIdAndModuleOrderByTimestampDesc(Integer hospitalId, String module);

    List<AuditLog> findByHospitalIdAndActionOrderByTimestampDesc(Integer hospitalId, String action);

    List<AuditLog> findByHospitalIdAndTimestampBetweenOrderByTimestampDesc(Integer hospitalId, LocalDateTime start,
            LocalDateTime end);

    List<AuditLog> findByHospitalIdAndSeverityOrderByTimestampDesc(Integer hospitalId, String severity);

    List<AuditLog> findTop200ByHospitalIdOrderByTimestampDesc(Integer hospitalId);
}
