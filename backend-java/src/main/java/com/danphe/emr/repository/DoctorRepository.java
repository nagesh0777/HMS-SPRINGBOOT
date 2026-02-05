package com.danphe.emr.repository;

import com.danphe.emr.model.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, Integer> {
    List<Doctor> findByIsActive(Boolean isActive);

    List<Doctor> findByHospitalId(Integer hospitalId);

    List<Doctor> findByHospitalIdAndIsActive(Integer hospitalId, Boolean isActive);
}
