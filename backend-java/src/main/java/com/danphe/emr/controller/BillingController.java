package com.danphe.emr.controller;

import com.danphe.emr.model.*;
import com.danphe.emr.repository.*;
import com.danphe.emr.security.SecurityUtil;
import com.danphe.emr.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/Billing")
@CrossOrigin(origins = "*", maxAge = 3600)
public class BillingController {

    @Autowired
    private BillingRepository billingRepository;

    @Autowired
    private FinalBillRepository finalBillRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private HospitalSettingsRepository settingsRepository;

    @Autowired
    private AdmissionRepository admissionRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    // =========================================================================
    // 0. PATIENT TREATMENT HISTORY (for smart billing)
    // =========================================================================
    @GetMapping("/PatientHistory/{patientId}")
    public ResponseEntity<?> getPatientHistory(@PathVariable Integer patientId) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital context not found"));
        }

        Optional<Patient> patOpt = patientRepository.findByHospitalIdAndPatientId(hospitalId, patientId);
        if (patOpt.isEmpty()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Patient not found"));
        }

        Patient patient = patOpt.get();
        Map<String, Object> history = new HashMap<>();
        history.put("patient", patient);

        // OPD Appointments
        List<Appointment> appointments = appointmentRepository
                .findByHospitalIdAndPatientIdOrderByAppointmentDateDesc(hospitalId, patientId);
        history.put("appointments", appointments);
        history.put("opdVisitCount", appointments.size());

        // IPD Admissions
        List<Admission> admissions = admissionRepository
                .findByHospitalIdAndPatientIdOrderByAdmissionDateDesc(hospitalId, patientId);

        // Calculate IPD days for each admission
        List<Map<String, Object>> admissionDetails = new ArrayList<>();
        int totalIpdDays = 0;
        for (Admission adm : admissions) {
            Map<String, Object> ad = new HashMap<>();
            ad.put("admission", adm);
            long days = 1;
            if (adm.getDischargeDate() != null) {
                days = java.time.Duration.between(adm.getAdmissionDate(), adm.getDischargeDate()).toDays();
                if (days < 1)
                    days = 1;
            } else if ("admitted".equals(adm.getAdmissionStatus())) {
                days = java.time.Duration.between(adm.getAdmissionDate(), java.time.LocalDateTime.now()).toDays();
                if (days < 1)
                    days = 1;
            }
            ad.put("days", days);
            totalIpdDays += days;
            admissionDetails.add(ad);
        }
        history.put("admissions", admissionDetails);
        history.put("ipdAdmissionCount", admissions.size());
        history.put("totalIpdDays", totalIpdDays);

        // Prescriptions
        List<Prescription> prescriptions = prescriptionRepository
                .findByHospitalIdAndPatientIdOrderByCreatedOnDesc(hospitalId, patientId);
        history.put("prescriptions", prescriptions);

        // Existing bills for this patient
        List<Billing> existingBills = billingRepository
                .findByHospitalIdAndPatientIdOrderByCreatedAtDesc(hospitalId, patientId);
        history.put("existingBills", existingBills);

        return ResponseEntity.ok(DanpheHttpResponse.ok(history));
    }

    // =========================================================================
    // 1. LIST BILLS (OPD / IPD / All)
    // =========================================================================
    @GetMapping
    public ResponseEntity<?> getBills(
            @RequestParam(required = false) String billType,
            @RequestParam(required = false) Integer patientId) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital context not found"));
        }

        List<Billing> bills;
        if (patientId != null && billType != null) {
            bills = billingRepository.findByHospitalIdAndPatientIdAndBillTypeOrderByCreatedAtDesc(hospitalId, patientId,
                    billType);
        } else if (patientId != null) {
            bills = billingRepository.findByHospitalIdAndPatientIdOrderByCreatedAtDesc(hospitalId, patientId);
        } else if (billType != null) {
            bills = billingRepository.findByHospitalIdAndBillTypeOrderByCreatedAtDesc(hospitalId, billType);
        } else {
            bills = billingRepository.findByHospitalIdOrderByCreatedAtDesc(hospitalId);
        }

        // Enrich with patient names
        for (Billing b : bills) {
            patientRepository.findByHospitalIdAndPatientId(hospitalId, b.getPatientId())
                    .ifPresent(pat -> {
                        b.setPatientName(pat.getFirstName() + " " + pat.getLastName());
                        b.setPatientCode(pat.getPatientCode());
                    });
        }

        return ResponseEntity.ok(DanpheHttpResponse.ok(bills));
    }

    // =========================================================================
    // 2. GET SINGLE BILL
    // =========================================================================
    @GetMapping("/{billId}")
    public ResponseEntity<?> getBill(@PathVariable Integer billId) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital context not found"));
        }

        Optional<Billing> opt = billingRepository.findByHospitalIdAndBillId(hospitalId, billId);
        if (opt.isEmpty()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Bill not found"));
        }

        Billing bill = opt.get();
        patientRepository.findByHospitalIdAndPatientId(hospitalId, bill.getPatientId())
                .ifPresent(pat -> {
                    bill.setPatientName(pat.getFirstName() + " " + pat.getLastName());
                    bill.setPatientCode(pat.getPatientCode());
                });

        return ResponseEntity.ok(DanpheHttpResponse.ok(bill));
    }

    // =========================================================================
    // 3. CREATE BILL (OPD or IPD)
    // =========================================================================
    @PostMapping
    @Transactional
    public ResponseEntity<?> createBill(@RequestBody Billing billing) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        UserDetailsImpl user = SecurityUtil.getCurrentUser();

        if (hospitalId == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital context not found"));
        }

        // Validate bill type
        if (billing.getBillType() == null ||
                (!billing.getBillType().equalsIgnoreCase("OPD") && !billing.getBillType().equalsIgnoreCase("IPD")
                        && !billing.getBillType().equalsIgnoreCase("Comprehensive"))) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Bill type must be OPD, IPD, or Comprehensive"));
        }

        // Validate patient exists
        if (billing.getPatientId() == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Patient ID is required"));
        }

        Optional<Patient> patOpt = patientRepository.findByHospitalIdAndPatientId(hospitalId, billing.getPatientId());
        if (patOpt.isEmpty()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Patient not found in this hospital"));
        }

        // Validate amounts
        if (billing.getSubtotal() == null || billing.getSubtotal() < 0) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Subtotal cannot be negative"));
        }
        if (billing.getDiscountPercent() != null && billing.getDiscountPercent() < 0) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Discount percent cannot be negative"));
        }
        if (billing.getDiscountAmount() != null && billing.getDiscountAmount() < 0) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Discount amount cannot be negative"));
        }
        if (billing.getDiscountAmount() != null && billing.getSubtotal() != null
                && billing.getDiscountAmount() > billing.getSubtotal()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Discount cannot exceed subtotal"));
        }
        if (billing.getTaxPercent() != null && billing.getTaxPercent() < 0) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Tax percent cannot be negative"));
        }

        // Calculate billing amounts
        calculateBillAmounts(billing);

        // Set hospital context
        billing.setHospitalId(hospitalId);
        if (user != null) {
            billing.setCreatedBy(user.getEmployeeId());
        }

        // Generate bill number
        billing.setBillNumber(generateBillNumber(hospitalId));

        Billing saved = billingRepository.save(billing);
        return ResponseEntity.ok(DanpheHttpResponse.ok(saved));
    }

    // =========================================================================
    // 4. UPDATE BILL
    // =========================================================================
    @PutMapping("/{billId}")
    public ResponseEntity<?> updateBill(@PathVariable Integer billId, @RequestBody Billing updated) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital context not found"));
        }

        Optional<Billing> opt = billingRepository.findByHospitalIdAndBillId(hospitalId, billId);
        if (opt.isEmpty()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Bill not found"));
        }

        Billing existing = opt.get();

        // Validate amounts
        if (updated.getSubtotal() != null && updated.getSubtotal() < 0) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Subtotal cannot be negative"));
        }
        if (updated.getDiscountAmount() != null && updated.getDiscountAmount() < 0) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Discount amount cannot be negative"));
        }
        if (updated.getDiscountAmount() != null && updated.getSubtotal() != null
                && updated.getDiscountAmount() > updated.getSubtotal()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Discount cannot exceed subtotal"));
        }
        if (updated.getTaxPercent() != null && updated.getTaxPercent() < 0) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Tax percent cannot be negative"));
        }

        existing.setBillItems(updated.getBillItems());
        existing.setSubtotal(updated.getSubtotal());
        existing.setDiscountPercent(updated.getDiscountPercent());
        existing.setDiscountAmount(updated.getDiscountAmount());
        existing.setTaxPercent(updated.getTaxPercent());
        existing.setPaymentStatus(updated.getPaymentStatus());
        existing.setPaymentMode(updated.getPaymentMode());
        existing.setPaidAmount(updated.getPaidAmount());

        calculateBillAmounts(existing);

        billingRepository.save(existing);
        return ResponseEntity.ok(DanpheHttpResponse.ok(existing));
    }

    // =========================================================================
    // 5. UPDATE PAYMENT STATUS
    // =========================================================================
    @PutMapping("/{billId}/Payment")
    public ResponseEntity<?> updatePayment(@PathVariable Integer billId, @RequestBody Map<String, Object> body) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital context not found"));
        }

        Optional<Billing> opt = billingRepository.findByHospitalIdAndBillId(hospitalId, billId);
        if (opt.isEmpty()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Bill not found"));
        }

        Billing bill = opt.get();
        if (body.containsKey("paymentStatus")) {
            bill.setPaymentStatus((String) body.get("paymentStatus"));
        }
        if (body.containsKey("paymentMode")) {
            bill.setPaymentMode((String) body.get("paymentMode"));
        }
        if (body.containsKey("paidAmount")) {
            bill.setPaidAmount(Double.parseDouble(body.get("paidAmount").toString()));
        }

        billingRepository.save(bill);
        return ResponseEntity.ok(DanpheHttpResponse.ok(bill));
    }

    // =========================================================================
    // 6. GENERATE FINAL COMBINED BILL
    // =========================================================================
    @PostMapping("/FinalBill")
    @Transactional
    public ResponseEntity<?> generateFinalBill(@RequestBody Map<String, Object> request) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        UserDetailsImpl user = SecurityUtil.getCurrentUser();

        if (hospitalId == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital context not found"));
        }

        Integer patientId = (Integer) request.get("patientId");
        if (patientId == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Patient ID is required"));
        }

        // Fetch all bills for this patient
        List<Billing> allBills = billingRepository.findByHospitalIdAndPatientIdOrderByCreatedAtDesc(hospitalId,
                patientId);
        if (allBills.isEmpty()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("No bills found for this patient"));
        }

        // Merge all bill items
        StringBuilder mergedItems = new StringBuilder("[");
        boolean first = true;
        double combinedSubtotal = 0;
        List<String> billIds = new ArrayList<>();

        for (Billing bill : allBills) {
            billIds.add(String.valueOf(bill.getBillId()));
            if (bill.getSubtotal() != null) {
                combinedSubtotal += bill.getSubtotal();
            }
            if (bill.getBillItems() != null && !bill.getBillItems().isBlank()) {
                String items = bill.getBillItems().trim();
                if (items.startsWith("["))
                    items = items.substring(1);
                if (items.endsWith("]"))
                    items = items.substring(0, items.length() - 1);
                if (!items.isBlank()) {
                    if (!first)
                        mergedItems.append(",");
                    mergedItems.append(items);
                    first = false;
                }
            }
        }
        mergedItems.append("]");

        // Apply discount and tax from request
        Double discountPercent = request.get("discountPercent") != null
                ? Double.parseDouble(request.get("discountPercent").toString())
                : 0.0;
        Double discountAmount = request.get("discountAmount") != null
                ? Double.parseDouble(request.get("discountAmount").toString())
                : null;
        Double taxPercent = request.get("taxPercent") != null
                ? Double.parseDouble(request.get("taxPercent").toString())
                : 0.0;

        // Validate
        if (discountPercent < 0 || (discountAmount != null && discountAmount < 0) || taxPercent < 0) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Negative values not allowed for discount or tax"));
        }

        // Calculate discount
        double finalDiscountAmount;
        double finalDiscountPercent;
        if (discountAmount != null && discountAmount > 0) {
            finalDiscountAmount = discountAmount;
            finalDiscountPercent = combinedSubtotal > 0 ? (discountAmount / combinedSubtotal) * 100 : 0;
        } else {
            finalDiscountPercent = discountPercent;
            finalDiscountAmount = (combinedSubtotal * discountPercent) / 100;
        }

        if (finalDiscountAmount > combinedSubtotal) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Discount cannot exceed subtotal"));
        }

        // Calculate tax
        double taxAmount = ((combinedSubtotal - finalDiscountAmount) * taxPercent) / 100;
        double grandTotal = combinedSubtotal - finalDiscountAmount + taxAmount;

        // Create final bill
        FinalBill finalBill = new FinalBill();
        finalBill.setHospitalId(hospitalId);
        finalBill.setPatientId(patientId);
        finalBill.setSourceBillIds(String.join(",", billIds));
        finalBill.setBillItems(mergedItems.toString());
        finalBill.setSubtotal(combinedSubtotal);
        finalBill.setDiscountPercent(finalDiscountPercent);
        finalBill.setDiscountAmount(finalDiscountAmount);
        finalBill.setTaxPercent(taxPercent);
        finalBill.setTaxAmount(taxAmount);
        finalBill.setGrandTotal(grandTotal);
        finalBill.setBillNumber(generateBillNumber(hospitalId));

        String paymentStatus = request.get("paymentStatus") != null ? (String) request.get("paymentStatus") : "Unpaid";
        String paymentMode = request.get("paymentMode") != null ? (String) request.get("paymentMode") : null;
        finalBill.setPaymentStatus(paymentStatus);
        finalBill.setPaymentMode(paymentMode);

        if (user != null) {
            finalBill.setCreatedBy(user.getEmployeeId());
        }

        FinalBill saved = finalBillRepository.save(finalBill);

        // Enrich
        patientRepository.findByHospitalIdAndPatientId(hospitalId, patientId)
                .ifPresent(pat -> saved.setPatientName(pat.getFirstName() + " " + pat.getLastName()));

        return ResponseEntity.ok(DanpheHttpResponse.ok(saved));
    }

    // =========================================================================
    // 7. GET FINAL BILLS
    // =========================================================================
    @GetMapping("/FinalBills")
    public ResponseEntity<?> getFinalBills(@RequestParam(required = false) Integer patientId) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital context not found"));
        }

        List<FinalBill> bills;
        if (patientId != null) {
            bills = finalBillRepository.findByHospitalIdAndPatientIdOrderByCreatedAtDesc(hospitalId, patientId);
        } else {
            bills = finalBillRepository.findByHospitalIdOrderByCreatedAtDesc(hospitalId);
        }

        for (FinalBill b : bills) {
            patientRepository.findByHospitalIdAndPatientId(hospitalId, b.getPatientId())
                    .ifPresent(pat -> b.setPatientName(pat.getFirstName() + " " + pat.getLastName()));
        }

        return ResponseEntity.ok(DanpheHttpResponse.ok(bills));
    }

    // =========================================================================
    // 8. GET SINGLE FINAL BILL
    // =========================================================================
    @GetMapping("/FinalBills/{id}")
    public ResponseEntity<?> getFinalBill(@PathVariable Integer id) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital context not found"));
        }

        Optional<FinalBill> opt = finalBillRepository.findByHospitalIdAndFinalBillId(hospitalId, id);
        if (opt.isEmpty()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Final bill not found"));
        }

        FinalBill bill = opt.get();
        patientRepository.findByHospitalIdAndPatientId(hospitalId, bill.getPatientId())
                .ifPresent(pat -> bill.setPatientName(pat.getFirstName() + " " + pat.getLastName()));

        return ResponseEntity.ok(DanpheHttpResponse.ok(bill));
    }

    // =========================================================================
    // 9. BILLING SUMMARY / DASHBOARD
    // =========================================================================
    @GetMapping("/Summary")
    public ResponseEntity<?> getBillingSummary() {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital context not found"));
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalBills", billingRepository.countByHospitalId(hospitalId));
        summary.put("paidBills", billingRepository.countByHospitalIdAndPaymentStatus(hospitalId, "Paid"));
        summary.put("unpaidBills", billingRepository.countByHospitalIdAndPaymentStatus(hospitalId, "Unpaid"));
        summary.put("partialBills", billingRepository.countByHospitalIdAndPaymentStatus(hospitalId, "Partial"));

        // Total revenue
        List<Billing> allBills = billingRepository.findByHospitalIdOrderByCreatedAtDesc(hospitalId);
        double totalRevenue = allBills.stream()
                .filter(b -> "Paid".equals(b.getPaymentStatus()))
                .mapToDouble(b -> b.getGrandTotal() != null ? b.getGrandTotal() : 0)
                .sum();
        double totalPending = allBills.stream()
                .filter(b -> !"Paid".equals(b.getPaymentStatus()))
                .mapToDouble(b -> b.getGrandTotal() != null ? b.getGrandTotal() : 0)
                .sum();

        summary.put("totalRevenue", totalRevenue);
        summary.put("totalPending", totalPending);

        return ResponseEntity.ok(DanpheHttpResponse.ok(summary));
    }

    // =========================================================================
    // HELPERS
    // =========================================================================
    private void calculateBillAmounts(Billing billing) {
        double subtotal = billing.getSubtotal() != null ? billing.getSubtotal() : 0;
        double discountPercent = billing.getDiscountPercent() != null ? billing.getDiscountPercent() : 0;
        double discountAmount = billing.getDiscountAmount() != null ? billing.getDiscountAmount() : 0;
        double taxPercent = billing.getTaxPercent() != null ? billing.getTaxPercent() : 0;

        // If discount amount was provided, calculate percent; otherwise calculate
        // amount from percent
        if (discountAmount > 0 && discountPercent == 0) {
            discountPercent = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
        } else {
            discountAmount = (subtotal * discountPercent) / 100;
        }

        double taxAmount = ((subtotal - discountAmount) * taxPercent) / 100;
        double grandTotal = subtotal - discountAmount + taxAmount;

        billing.setDiscountPercent(Math.round(discountPercent * 100.0) / 100.0);
        billing.setDiscountAmount(Math.round(discountAmount * 100.0) / 100.0);
        billing.setTaxAmount(Math.round(taxAmount * 100.0) / 100.0);
        billing.setGrandTotal(Math.round(grandTotal * 100.0) / 100.0);
    }

    @Transactional
    private synchronized String generateBillNumber(Integer hospitalId) {
        Optional<HospitalSettings> opt = settingsRepository.findByHospitalId(hospitalId);
        String code = "HSP";
        int nextNum = 1;

        if (opt.isPresent()) {
            HospitalSettings settings = opt.get();
            if (settings.getHospitalCode() != null) {
                code = settings.getHospitalCode();
            }
            if (settings.getLastBillNumber() != null) {
                nextNum = settings.getLastBillNumber() + 1;
            }
            settings.setLastBillNumber(nextNum);
            settingsRepository.save(settings);
        }

        return String.format("BILL-%s-%05d", code, nextNum);
    }
}
