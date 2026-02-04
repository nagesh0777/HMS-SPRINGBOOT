package com.danphe.emr.repository;

import com.danphe.emr.model.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Integer> {
    List<Attendance> findByEmployeeIdOrderByTimestampDesc(Integer employeeId);
}
