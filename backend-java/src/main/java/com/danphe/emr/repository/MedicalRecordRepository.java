package com.danphe.emr.repository;

import com.danphe.emr.model.MedicalRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, Integer> {

    List<MedicalRecord> findByHospitalIdAndPatientIdOrderByCreatedOnDesc(Integer hospitalId, Integer patientId);

    List<MedicalRecord> findByHospitalIdAndDoctorIdOrderByCreatedOnDesc(Integer hospitalId, Integer doctorId);

    /**
     * Whole-hospital records of one type. Filtering by type in the query rather than pulling
     * everything and filtering in Java also avoids loading every record in the hospital to throw
     * most of them away.
     */
    List<MedicalRecord> findByHospitalIdAndRecordTypeOrderByCreatedOnDesc(Integer hospitalId, String recordType);

    List<MedicalRecord> findByHospitalIdAndDoctorIdAndLabStatus(Integer hospitalId, Integer doctorId, String labStatus);

    long countByHospitalIdAndDoctorIdAndLabStatus(Integer hospitalId, Integer doctorId, String labStatus);

    List<MedicalRecord> findByHospitalIdAndPatientIdAndRecordTypeOrderByCreatedOnDesc(Integer hospitalId,
            Integer patientId, String recordType);
}
