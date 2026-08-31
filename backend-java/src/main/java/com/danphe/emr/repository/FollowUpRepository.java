package com.danphe.emr.repository;

import com.danphe.emr.model.FollowUp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface FollowUpRepository extends JpaRepository<FollowUp, Integer> {

    List<FollowUp> findByHospitalIdAndDoctorIdOrderByFollowUpDateAsc(Integer hospitalId, Integer doctorId);

    /** Whole-hospital view, for staff who are not themselves a doctor. Never unscoped. */
    List<FollowUp> findByHospitalIdOrderByFollowUpDateAsc(Integer hospitalId);

    List<FollowUp> findByHospitalIdAndStatusOrderByFollowUpDateAsc(Integer hospitalId, String status);

    List<FollowUp> findByHospitalIdAndDoctorIdAndFollowUpDate(Integer hospitalId, Integer doctorId, LocalDate date);

    List<FollowUp> findByHospitalIdAndDoctorIdAndStatusOrderByFollowUpDateAsc(Integer hospitalId, Integer doctorId,
            String status);

    List<FollowUp> findByHospitalIdAndPatientIdOrderByFollowUpDateDesc(Integer hospitalId, Integer patientId);

    java.util.Optional<FollowUp> findFirstByPrescriptionId(Integer prescriptionId);

    void deleteByHospitalId(Integer hospitalId);
}
