package com.danphe.emr.repository;

import com.danphe.emr.model.EmployeeLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EmployeeLogRepository extends JpaRepository<EmployeeLog, Integer> {
    List<EmployeeLog> findAllByOrderByTimestampDesc();
}
