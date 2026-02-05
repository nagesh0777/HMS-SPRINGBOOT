package com.danphe.emr.repository;

import com.danphe.emr.model.Admission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AdmissionRepository extends JpaRepository<Admission, Integer> {

    // Find active admission for a patient
    // Find active admission for a patient (Global check or scoped? Scoped allows
    // patient to be admitted in multiple hospitals separately? Yes)
    Optional<Admission> findByHospitalIdAndPatientIdAndAdmissionStatus(Integer hospitalId, Integer patientId,
            String status);

    List<Admission> findByHospitalIdAndAdmissionStatus(Integer hospitalId, String status);

    List<Admission> findByHospitalIdAndAdmissionDateBetween(Integer hospitalId, LocalDateTime fromDate,
            LocalDateTime toDate);
}
