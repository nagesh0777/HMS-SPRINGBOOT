package com.danphe.emr.repository;

import com.danphe.emr.model.Billing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BillingRepository extends JpaRepository<Billing, Integer> {

    List<Billing> findByHospitalId(Integer hospitalId);

    List<Billing> findByHospitalIdOrderByCreatedAtDesc(Integer hospitalId);

    List<Billing> findByHospitalIdAndBillTypeOrderByCreatedAtDesc(Integer hospitalId, String billType);

    List<Billing> findByHospitalIdAndPatientIdOrderByCreatedAtDesc(Integer hospitalId, Integer patientId);

    List<Billing> findByHospitalIdAndPatientIdAndBillTypeOrderByCreatedAtDesc(Integer hospitalId, Integer patientId,
            String billType);

    Optional<Billing> findByHospitalIdAndBillId(Integer hospitalId, Integer billId);

    long countByHospitalId(Integer hospitalId);

    long countByHospitalIdAndPaymentStatus(Integer hospitalId, String paymentStatus);
}
