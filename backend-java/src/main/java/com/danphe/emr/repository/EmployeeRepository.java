package com.danphe.emr.repository;

import com.danphe.emr.model.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Integer> {
    List<Employee> findByIsActiveTrue();

    List<Employee> findByRole(String role);
}
