package com.danphe.emr.controller;

import com.danphe.emr.model.Admission;
import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.repository.AdmissionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/Admission")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AdmissionController {

    @Autowired
    AdmissionRepository admissionRepository;

    @Autowired
    com.danphe.emr.repository.PatientRepository patientRepository;

    @GetMapping("/AdmittedPatients")
    public ResponseEntity<DanpheHttpResponse<List<Admission>>> getAdmittedPatients(
            @RequestParam(required = false, defaultValue = "admitted") String admissionStatus,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime FromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime ToDate) {

        List<Admission> list;
        if (FromDate != null && ToDate != null) {
            list = admissionRepository.findByAdmissionDateBetween(FromDate, ToDate);
        } else {
            list = admissionRepository.findByAdmissionStatus(admissionStatus);
        }

        // Populate patient info
        for (Admission adm : list) {
            if (adm.getPatientId() != null) {
                patientRepository.findById(adm.getPatientId()).ifPresent(p -> {
                    adm.setPatientName(p.getFirstName() + " " + p.getLastName());
                    adm.setPatientCode(p.getPatientCode());
                });
            }
        }

        return ResponseEntity.ok(DanpheHttpResponse.ok(list));
    }

    @Autowired
    com.danphe.emr.repository.BedRepository bedRepository;

    @PostMapping("/Admission")
    public ResponseEntity<DanpheHttpResponse<?>> createAdmission(@RequestBody Admission admission) {
        if (admissionRepository.findByPatientIdAndAdmissionStatus(admission.getPatientId(), "admitted").isPresent()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Patient is already admitted."));
        }

        admission.setAdmissionDate(LocalDateTime.now());
        admission.setAdmissionStatus("admitted");

        // Update Bed Status if bed is selected
        if (admission.getBedId() != null) {
            bedRepository.findById(admission.getBedId()).ifPresent(bed -> {
                bed.setStatus("occupied");
                bedRepository.save(bed);
            });
        }

        Admission saved = admissionRepository.save(admission);
        return ResponseEntity.ok(DanpheHttpResponse.ok(saved));
    }

    @GetMapping("/PatientAdmissionStatus")
    public ResponseEntity<DanpheHttpResponse<String>> checkPatientAdmissionStatus(@RequestParam Integer patientId) {
        boolean isAdmitted = admissionRepository.findByPatientIdAndAdmissionStatus(patientId, "admitted").isPresent();
        return ResponseEntity.ok(DanpheHttpResponse.ok(isAdmitted ? "admitted" : "not-admitted"));
    }

    @PostMapping("/Discharge")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<DanpheHttpResponse<?>> dischargePatient(@RequestParam Integer admissionId) {
        Admission admission = admissionRepository.findById(admissionId).orElse(null);
        if (admission == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Admission record not found"));
        }

        if (!"admitted".equalsIgnoreCase(admission.getAdmissionStatus())) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Patient is not currently admitted"));
        }

        LocalDateTime now = LocalDateTime.now();
        admission.setDischargeDate(now);
        admission.setAdmissionStatus("discharged");

        // Release Bed
        if (admission.getBedId() != null) {
            bedRepository.findById(admission.getBedId()).ifPresent(bed -> {
                bed.setStatus("available");
                bedRepository.save(bed);
                admission.setDischargeRemarks("Discharged from Bed: " + bed.getBedNumber());
            });
        }

        admissionRepository.save(admission);
        return ResponseEntity.ok(DanpheHttpResponse.ok("Patient discharged successfully"));
    }
}
