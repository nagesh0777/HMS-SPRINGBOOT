package com.danphe.emr.repository;

import com.danphe.emr.model.BillingTransactionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BillingTransactionItemRepository extends JpaRepository<BillingTransactionItem, Integer> {

    // For finding specific items, e.g. provisional items for a patient
    List<BillingTransactionItem> findByPatientIdAndBillStatus(Integer patientId, String billStatus);
}
