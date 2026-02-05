package com.danphe.emr.repository;

import com.danphe.emr.model.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Integer> {
    List<Employee> findByHospitalId(Integer hospitalId);

    List<Employee> findByHospitalIdAndRole(Integer hospitalId, String role);

    java.util.Optional<Employee> findByHospitalIdAndEmployeeId(Integer hospitalId, Integer employeeId);

    java.util.Optional<Employee> findByUserName(String userName);
}
