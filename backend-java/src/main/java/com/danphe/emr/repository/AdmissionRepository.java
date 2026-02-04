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
    Optional<Admission> findByPatientIdAndAdmissionStatus(Integer patientId, String status);

    List<Admission> findByAdmissionStatus(String status);

    List<Admission> findByAdmissionDateBetween(LocalDateTime fromDate, LocalDateTime toDate);
}
