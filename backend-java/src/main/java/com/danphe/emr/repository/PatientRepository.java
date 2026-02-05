package com.danphe.emr.repository;

import com.danphe.emr.model.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Integer> {

        @Query("SELECT p FROM Patient p WHERE p.hospitalId = :hospitalId AND (p.firstName LIKE :search OR p.lastName LIKE :search OR p.patientCode LIKE :search OR p.phoneNumber LIKE :search)")
        List<Patient> searchPatients(String search, Integer hospitalId);

        java.util.Optional<Patient> findByHospitalIdAndPatientId(Integer hospitalId, Integer patientId);

        @Query("SELECT MAX(p.patientId) FROM Patient p")
        Integer getMaxPatientId(); // Global max might be needed for internal ID gen, but patientCode should be
                                   // scoped? Keeping global for now or safe.

        List<Patient> findByHospitalIdAndCreatedOnBetween(Integer hospitalId, java.time.LocalDateTime start,
                        java.time.LocalDateTime end);

        long countByHospitalIdAndCreatedOnBetween(Integer hospitalId, java.time.LocalDateTime start,
                        java.time.LocalDateTime end);

        long countByHospitalId(Integer hospitalId);
}
