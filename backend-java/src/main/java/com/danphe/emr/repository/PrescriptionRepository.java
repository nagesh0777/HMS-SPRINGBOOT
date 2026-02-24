package com.danphe.emr.repository;

import com.danphe.emr.model.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, Integer> {

    List<Prescription> findByHospitalIdAndDoctorIdOrderByCreatedOnDesc(Integer hospitalId, Integer doctorId);

    List<Prescription> findByHospitalIdAndPatientIdOrderByCreatedOnDesc(Integer hospitalId, Integer patientId);

    List<Prescription> findByHospitalIdAndDoctorIdAndStatusOrderByCreatedOnDesc(Integer hospitalId, Integer doctorId,
            String status);
}
