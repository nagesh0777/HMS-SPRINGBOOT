package com.danphe.emr.repository;

import com.danphe.emr.model.MedicalRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, Integer> {

    List<MedicalRecord> findByHospitalIdAndPatientIdOrderByCreatedOnDesc(Integer hospitalId, Integer patientId);

    List<MedicalRecord> findByHospitalIdAndDoctorIdOrderByCreatedOnDesc(Integer hospitalId, Integer doctorId);

    List<MedicalRecord> findByHospitalIdAndDoctorIdAndLabStatus(Integer hospitalId, Integer doctorId, String labStatus);

    long countByHospitalIdAndDoctorIdAndLabStatus(Integer hospitalId, Integer doctorId, String labStatus);

    List<MedicalRecord> findByHospitalIdAndPatientIdAndRecordTypeOrderByCreatedOnDesc(Integer hospitalId,
            Integer patientId, String recordType);
}
