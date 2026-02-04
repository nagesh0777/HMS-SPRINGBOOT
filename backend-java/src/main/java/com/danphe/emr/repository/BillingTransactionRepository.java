package com.danphe.emr.repository;

import com.danphe.emr.model.BillingTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BillingTransactionRepository extends JpaRepository<BillingTransaction, Integer> {

    List<BillingTransaction> findByPatientId(Integer patientId);

    @Query("SELECT MAX(b.invoiceNo) FROM BillingTransaction b WHERE b.fiscalYearId = :fiscalYearId")
    Integer getMaxInvoiceNo(Integer fiscalYearId);
}
