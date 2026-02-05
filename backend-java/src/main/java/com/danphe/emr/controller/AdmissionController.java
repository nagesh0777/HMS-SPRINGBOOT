package com.danphe.emr.controller;

import com.danphe.emr.model.Admission;
import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.repository.AdmissionRepository;
import com.danphe.emr.security.SecurityUtil;
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

    @Autowired
    com.danphe.emr.repository.BedRepository bedRepository;

    @GetMapping("/AdmittedPatients")
    public ResponseEntity<DanpheHttpResponse<List<Admission>>> getAdmittedPatients(
            @RequestParam(required = false, defaultValue = "admitted") String admissionStatus,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime FromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime ToDate) {

        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body(com.danphe.emr.model.DanpheHttpResponse.error("Unauthorized: Please ensure you have a valid hospital session."));

        List<Admission> list;
        if (FromDate != null && ToDate != null) {
            list = admissionRepository.findByHospitalIdAndAdmissionDateBetween(hospitalId, FromDate, ToDate);
        } else {
            list = admissionRepository.findByHospitalIdAndAdmissionStatus(hospitalId, admissionStatus);
        }

        // Populate patient info
        for (Admission adm : list) {
            if (adm.getPatientId() != null) {
                patientRepository.findByHospitalIdAndPatientId(hospitalId, adm.getPatientId()).ifPresent(p -> {
                    adm.setPatientName(p.getFirstName() + " " + p.getLastName());
                    adm.setPatientCode(p.getPatientCode());
                });
            }
        }

        return ResponseEntity.ok(DanpheHttpResponse.ok(list));
    }

    @PostMapping("/Admission")
    public ResponseEntity<DanpheHttpResponse<?>> createAdmission(@RequestBody Admission admission) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body(com.danphe.emr.model.DanpheHttpResponse.error("Unauthorized: Please ensure you have a valid hospital session."));

        if (admissionRepository
                .findByHospitalIdAndPatientIdAndAdmissionStatus(hospitalId, admission.getPatientId(), "admitted")
                .isPresent()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Patient is already admitted."));
        }

        admission.setHospitalId(hospitalId);
        admission.setAdmissionDate(LocalDateTime.now());
        admission.setAdmissionStatus("admitted");

        // Update Bed Status if bed is selected
        Integer bId = admission.getBedId();
        if (bId != null) {
            bedRepository.findById(bId).ifPresent(bed -> {
                if (hospitalId.equals(bed.getHospitalId())) {
                    bed.setStatus("occupied");
                    bedRepository.save(bed);
                }
            });
        }

        Admission saved = admissionRepository.save(admission);
        return ResponseEntity.ok(DanpheHttpResponse.ok(saved));
    }

    @GetMapping("/PatientAdmissionStatus")
    public ResponseEntity<DanpheHttpResponse<String>> checkPatientAdmissionStatus(@RequestParam Integer patientId) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body(com.danphe.emr.model.DanpheHttpResponse.error("Unauthorized: Please ensure you have a valid hospital session."));

        boolean isAdmitted = admissionRepository
                .findByHospitalIdAndPatientIdAndAdmissionStatus(hospitalId, patientId, "admitted").isPresent();
        return ResponseEntity.ok(DanpheHttpResponse.ok(isAdmitted ? "admitted" : "not-admitted"));
    }

    @PostMapping("/Discharge")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<DanpheHttpResponse<?>> dischargePatient(@RequestParam Integer admissionId) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body(com.danphe.emr.model.DanpheHttpResponse.error("Unauthorized: Please ensure you have a valid hospital session."));

        Admission admission = admissionRepository.findById(admissionId).orElse(null);
        if (admission == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Admission record not found"));
        }

        if (!hospitalId.equals(admission.getHospitalId())) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Admission record not found in this hospital"));
        }

        if (!"admitted".equalsIgnoreCase(admission.getAdmissionStatus())) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Patient is not currently admitted"));
        }

        LocalDateTime now = LocalDateTime.now();
        admission.setDischargeDate(now);
        admission.setAdmissionStatus("discharged");

        // Release Bed
        Integer dischargeBedId = admission.getBedId();
        if (dischargeBedId != null) {
            bedRepository.findById(dischargeBedId).ifPresent(bed -> {
                if (hospitalId.equals(bed.getHospitalId())) {
                    bed.setStatus("available");
                    bedRepository.save(bed);
                    admission.setDischargeRemarks("Discharged from Bed: " + bed.getBedNumber());
                }
            });
        }

        admissionRepository.save(admission);
        return ResponseEntity.ok(DanpheHttpResponse.ok("Patient discharged successfully"));
    }
}
