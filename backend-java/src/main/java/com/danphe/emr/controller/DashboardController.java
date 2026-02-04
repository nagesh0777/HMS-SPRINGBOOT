package com.danphe.emr.controller;

import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.repository.AdmissionRepository;
import com.danphe.emr.repository.AppointmentRepository;
import com.danphe.emr.repository.PatientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/Dashboard")
@CrossOrigin(origins = "*", maxAge = 3600)
public class DashboardController {

    @Autowired
    PatientRepository patientRepository;

    @Autowired
    AppointmentRepository appointmentRepository;

    @Autowired
    AdmissionRepository admissionRepository;

    @GetMapping("/Summary")
    public ResponseEntity<?> getDashboardSummary(@RequestParam(required = false) Integer performerId) {
        Map<String, Object> stats = new HashMap<>();

        // Total Patients (Keep global or filter? Usually doctors see total hospital
        // patients but their own appts)
        stats.put("totalPatients", patientRepository.count());

        // Appointments Today
        LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime endOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);

        long apptCount;
        if (performerId != null) {
            apptCount = appointmentRepository
                    .findByAppointmentDateBetweenAndPerformerId(startOfDay, endOfDay, performerId).size();
        } else {
            apptCount = appointmentRepository.findByAppointmentDateBetween(startOfDay, endOfDay).size();
        }
        stats.put("appointmentsToday", apptCount);

        // Active Admissions (Filter by doctor if provided)
        long activeAdmissions;
        if (performerId != null) {
            // Find admissions where doctorId matches
            activeAdmissions = admissionRepository.findByAdmissionStatus("admitted").stream()
                    .filter(a -> performerId.equals(a.getAdmittingDoctorId()))
                    .count();
        } else {
            activeAdmissions = admissionRepository.findByAdmissionStatus("admitted").size();
        }
        stats.put("activeAdmissions", activeAdmissions);

        return ResponseEntity.ok(DanpheHttpResponse.ok(stats));
    }
}
