package com.danphe.emr.repository;

import com.danphe.emr.model.FollowUp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface FollowUpRepository extends JpaRepository<FollowUp, Integer> {

    List<FollowUp> findByHospitalIdAndDoctorIdOrderByFollowUpDateAsc(Integer hospitalId, Integer doctorId);

    List<FollowUp> findByHospitalIdAndDoctorIdAndFollowUpDate(Integer hospitalId, Integer doctorId, LocalDate date);

    List<FollowUp> findByHospitalIdAndDoctorIdAndStatusOrderByFollowUpDateAsc(Integer hospitalId, Integer doctorId,
            String status);

    List<FollowUp> findByHospitalIdAndPatientIdOrderByFollowUpDateDesc(Integer hospitalId, Integer patientId);
}
