package com.danphe.emr.repository;

import com.danphe.emr.model.FinalBill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FinalBillRepository extends JpaRepository<FinalBill, Integer> {

    List<FinalBill> findByHospitalIdOrderByCreatedAtDesc(Integer hospitalId);

    List<FinalBill> findByHospitalIdAndPatientIdOrderByCreatedAtDesc(Integer hospitalId, Integer patientId);

    Optional<FinalBill> findByHospitalIdAndFinalBillId(Integer hospitalId, Integer finalBillId);
}
