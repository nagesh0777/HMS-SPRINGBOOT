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
import java.util.List;
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
        Integer hospitalId = com.danphe.emr.security.SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body("Hospital ID not found");

        Map<String, Object> stats = new HashMap<>();

        // Total Patients (Scoped)
        stats.put("totalPatients", patientRepository.countByHospitalId(hospitalId));

        // Appointments Today
        LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime endOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);

        long apptCount;
        if (performerId != null) {
            apptCount = appointmentRepository
                    .findByHospitalIdAndAppointmentDateBetweenAndPerformerId(hospitalId, startOfDay, endOfDay,
                            performerId)
                    .size();
        } else {
            apptCount = appointmentRepository
                    .findByHospitalIdAndAppointmentDateBetween(hospitalId, startOfDay, endOfDay).size();
        }
        stats.put("appointmentsToday", apptCount);

        // Active Admissions (Filter by doctor if provided)
        long activeAdmissions;
        if (performerId != null) {
            // Find active admissions scoped by hospital
            activeAdmissions = admissionRepository.findByHospitalIdAndAdmissionStatus(hospitalId, "admitted").stream()
                    .filter(a -> performerId.equals(a.getAdmittingDoctorId()))
                    .count();
        } else {
            activeAdmissions = admissionRepository.findByHospitalIdAndAdmissionStatus(hospitalId, "admitted").size();
        }
        stats.put("activeAdmissions", activeAdmissions);

        return ResponseEntity.ok(DanpheHttpResponse.ok(stats));
    }

    @GetMapping("/Analytics")
    public ResponseEntity<?> getAnalytics(@RequestParam(defaultValue = "week") String range) {
        Integer hospitalId = com.danphe.emr.security.SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body("Hospital ID not found");

        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start;

        if ("month".equalsIgnoreCase(range)) {
            start = end.minusMonths(1);
        } else {
            start = end.minusWeeks(1);
        }

        Map<String, Object> response = new HashMap<>();

        // 1. Summary Counts
        long newPatients = patientRepository.countByHospitalIdAndCreatedOnBetween(hospitalId, start, end);
        List<com.danphe.emr.model.Appointment> appts = appointmentRepository
                .findByHospitalIdAndAppointmentDateBetween(hospitalId, start, end);
        long newAppts = appts.size();

        Map<String, Long> summary = new HashMap<>();
        summary.put("newPatients", newPatients);
        summary.put("newAppointments", newAppts);
        response.put("summary", summary);

        // 2. Patient List for Table/Download
        List<com.danphe.emr.model.Patient> patients = patientRepository.findByHospitalIdAndCreatedOnBetween(hospitalId,
                start, end);
        response.put("patients", patients);

        // 3. Chart Data (Group by Date)
        Map<LocalDate, Map<String, Integer>> dailyStats = new HashMap<>();

        // Initialize map for each day in range
        long days = java.time.temporal.ChronoUnit.DAYS.between(start, end);
        for (int i = 0; i <= days; i++) {
            LocalDate d = start.plusDays(i).toLocalDate();
            Map<String, Integer> dayCounts = new HashMap<>();
            dayCounts.put("patients", 0);
            dayCounts.put("appointments", 0);
            dailyStats.put(d, dayCounts);
        }

        // Fill Patient Counts
        for (com.danphe.emr.model.Patient p : patients) {
            if (p.getCreatedOn() != null) {
                LocalDate d = p.getCreatedOn().toLocalDate();
                if (dailyStats.containsKey(d)) {
                    dailyStats.get(d).put("patients", dailyStats.get(d).get("patients") + 1);
                }
            }
        }

        // Fill Appointment Counts
        for (com.danphe.emr.model.Appointment a : appts) {
            if (a.getAppointmentDate() != null) {
                LocalDate d = a.getAppointmentDate().toLocalDate();
                if (dailyStats.containsKey(d)) {
                    dailyStats.get(d).put("appointments", dailyStats.get(d).get("appointments") + 1);
                }
            }
        }

        // Convert to sorted list
        java.util.List<Map<String, Object>> chartData = dailyStats.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("date", e.getKey().toString());
                    item.put("patients", e.getValue().get("patients"));
                    item.put("appointments", e.getValue().get("appointments"));
                    return item;
                })
                .collect(java.util.stream.Collectors.toList());

        response.put("chartData", chartData);

        return ResponseEntity.ok(DanpheHttpResponse.ok(response));
    }
}
