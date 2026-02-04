package com.danphe.emr.repository;

import com.danphe.emr.model.ServiceDepartment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ServiceDepartmentRepository extends JpaRepository<ServiceDepartment, Integer> {
}
