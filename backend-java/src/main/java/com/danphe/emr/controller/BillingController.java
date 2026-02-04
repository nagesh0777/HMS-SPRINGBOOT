package com.danphe.emr.controller;

import com.danphe.emr.model.BillingTransaction;
import com.danphe.emr.model.BillingTransactionItem;
import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.repository.BillingTransactionItemRepository;
import com.danphe.emr.repository.BillingTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/Billing")
@CrossOrigin(origins = "*", maxAge = 3600)
public class BillingController {

    @Autowired
    BillingTransactionRepository billingTransactionRepository;

    @Autowired
    BillingTransactionItemRepository billingTransactionItemRepository;

    @PostMapping("/PostBillingTransaction")
    @Transactional
    public ResponseEntity<DanpheHttpResponse<BillingTransaction>> postBillingTransaction(
            @RequestBody BillingTransaction transaction) {

        Integer currentFiscalYearId = 2023;
        Integer maxNo = billingTransactionRepository.getMaxInvoiceNo(currentFiscalYearId);
        int nextInvoiceNo = (maxNo == null) ? 1 : maxNo + 1;

        transaction.setFiscalYearId(currentFiscalYearId);
        transaction.setInvoiceNo(nextInvoiceNo);
        transaction.setInvoiceCode("BL");
        transaction.setCreatedOn(LocalDateTime.now());

        if (transaction.getBillingTransactionItems() != null) {
            for (BillingTransactionItem item : transaction.getBillingTransactionItems()) {
                item.setBillingTransaction(transaction);
                item.setCreatedOn(LocalDateTime.now());
                item.setBillStatus(transaction.getBillStatus());
            }
        }

        BillingTransaction saved = billingTransactionRepository.save(transaction);
        return ResponseEntity.ok(DanpheHttpResponse.ok(saved));
    }

    @GetMapping("/PatientInvoices")
    public ResponseEntity<DanpheHttpResponse<List<BillingTransaction>>> getPatientInvoices(
            @RequestParam Integer patientId) {
        List<BillingTransaction> list = billingTransactionRepository.findByPatientId(patientId);
        return ResponseEntity.ok(DanpheHttpResponse.ok(list));
    }

    @GetMapping("/ProvisionalItems")
    public ResponseEntity<DanpheHttpResponse<List<BillingTransactionItem>>> getProvisionalItems(
            @RequestParam Integer patientId) {
        List<BillingTransactionItem> list = billingTransactionItemRepository.findByPatientIdAndBillStatus(patientId,
                "provisional");
        return ResponseEntity.ok(DanpheHttpResponse.ok(list));
    }

    @Autowired
    com.danphe.emr.repository.PatientRepository patientRepository;

    @GetMapping("/AllInvoices")
    public ResponseEntity<DanpheHttpResponse<List<BillingTransaction>>> getAllInvoices() {
        List<BillingTransaction> list = billingTransactionRepository.findAll();
        // Since we don't have transient fields in BillingTransaction yet,
        // normally we'd add 'patientName' to the model.
        // For now, let's keep it simple or add fields to model if needed.
        return ResponseEntity.ok(DanpheHttpResponse.ok(list));
    }

    @GetMapping("/BillingSummary")
    public ResponseEntity<?> getBillingSummary() {
        List<BillingTransaction> all = billingTransactionRepository.findAll();
        double totalRevenue = all.stream()
                .filter(t -> "paid".equals(t.getBillStatus()))
                .mapToDouble(t -> t.getTotalAmount() != null ? t.getTotalAmount() : 0.0)
                .sum();

        long paidCount = all.stream().filter(t -> "paid".equals(t.getBillStatus())).count();
        long unpaidCount = all.size() - paidCount;

        java.util.Map<String, Object> summ = new java.util.HashMap<>();
        summ.put("totalRevenueToday", totalRevenue);
        summ.put("paidInvoices", paidCount);
        summ.put("pendingPayments", unpaidCount);
        summ.put("recentTransactions", all.subList(0, Math.min(all.size(), 10)));

        return ResponseEntity.ok(DanpheHttpResponse.ok(summ));
    }
}
