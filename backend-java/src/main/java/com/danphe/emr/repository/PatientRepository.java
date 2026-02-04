package com.danphe.emr.repository;

import com.danphe.emr.model.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Integer> {

    @Query("SELECT p FROM Patient p WHERE p.firstName LIKE :search OR p.lastName LIKE :search OR p.patientCode LIKE :search OR p.phoneNumber LIKE :search")
    List<Patient> searchPatients(String search);

    @Query("SELECT MAX(p.patientId) FROM Patient p")
    Integer getMaxPatientId();
}
