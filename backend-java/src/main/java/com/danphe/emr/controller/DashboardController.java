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

    @Autowired
    com.danphe.emr.repository.BillingRepository billingRepository;

    @Autowired
    com.danphe.emr.repository.BedRepository bedRepository;

    @Autowired
    com.danphe.emr.repository.EmployeeRepository employeeRepository;

    @GetMapping("/FullAnalytics")
    public ResponseEntity<?> getFullAnalytics() {
        Integer hospitalId = com.danphe.emr.security.SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body("Hospital ID not found");

        Map<String, Object> data = new HashMap<>();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime thirtyDaysAgo = now.minusDays(30);
        LocalDateTime sevenDaysAgo = now.minusDays(7);

        // 1. Revenue Data
        var allBills = billingRepository.findByHospitalId(hospitalId);
        double totalRevenue = allBills.stream().mapToDouble(b -> b.getGrandTotal() != null ? b.getGrandTotal() : 0)
                .sum();
        double paidRevenue = allBills.stream().filter(b -> "paid".equalsIgnoreCase(b.getPaymentStatus()))
                .mapToDouble(b -> b.getGrandTotal() != null ? b.getGrandTotal() : 0).sum();
        double pendingRevenue = totalRevenue - paidRevenue;
        long totalBills = allBills.size();
        long paidBills = allBills.stream().filter(b -> "paid".equalsIgnoreCase(b.getPaymentStatus())).count();
        long pendingBills = totalBills - paidBills;

        Map<String, Object> revenue = new HashMap<>();
        revenue.put("total", totalRevenue);
        revenue.put("paid", paidRevenue);
        revenue.put("pending", pendingRevenue);
        revenue.put("totalBills", totalBills);
        revenue.put("paidBills", paidBills);
        revenue.put("pendingBills", pendingBills);
        data.put("revenue", revenue);

        // 2. Monthly Revenue Chart (last 6 months)
        java.util.List<Map<String, Object>> monthlyRevenue = new java.util.ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            LocalDateTime mStart = now.minusMonths(i).withDayOfMonth(1).with(LocalTime.MIN);
            LocalDateTime mEnd = i == 0 ? now : mStart.plusMonths(1).minusSeconds(1);
            double monthTotal = allBills.stream()
                    .filter(b -> b.getCreatedAt() != null && !b.getCreatedAt().isBefore(mStart)
                            && !b.getCreatedAt().isAfter(mEnd))
                    .mapToDouble(b -> b.getGrandTotal() != null ? b.getGrandTotal() : 0).sum();
            double monthPaid = allBills.stream()
                    .filter(b -> b.getCreatedAt() != null && !b.getCreatedAt().isBefore(mStart)
                            && !b.getCreatedAt().isAfter(mEnd) && "paid".equalsIgnoreCase(b.getPaymentStatus()))
                    .mapToDouble(b -> b.getGrandTotal() != null ? b.getGrandTotal() : 0).sum();
            Map<String, Object> m = new HashMap<>();
            m.put("month", mStart.getMonth().toString().substring(0, 3));
            m.put("revenue", monthTotal);
            m.put("collected", monthPaid);
            monthlyRevenue.add(m);
        }
        data.put("monthlyRevenue", monthlyRevenue);

        // 3. Department-wise Revenue
        Map<String, Double> deptRevenue = new HashMap<>();
        for (var b : allBills) {
            if (b.getBillItems() != null) {
                try {
                    var items = new com.fasterxml.jackson.databind.ObjectMapper().readValue(b.getBillItems(),
                            java.util.List.class);
                    for (Object item : items) {
                        if (item instanceof Map) {
                            Map<?, ?> it = (Map<?, ?>) item;
                            String cat = it.get("category") != null ? it.get("category").toString() : "General";
                            double amt = 0;
                            try {
                                amt = Double.parseDouble(it.get("total") != null ? it.get("total").toString() : "0");
                            } catch (Exception ignore) {
                            }
                            deptRevenue.merge(cat, amt, Double::sum);
                        }
                    }
                } catch (Exception ignore) {
                }
            }
        }
        java.util.List<Map<String, Object>> deptList = new java.util.ArrayList<>();
        deptRevenue.forEach((k, v) -> {
            Map<String, Object> d = new HashMap<>();
            d.put("department", k);
            d.put("amount", v);
            deptList.add(d);
        });
        deptList.sort((a, b) -> Double.compare((Double) b.get("amount"), (Double) a.get("amount")));
        data.put("departmentRevenue", deptList);

        // 4. Bed Occupancy
        var allBeds = bedRepository.findByHospitalId(hospitalId);
        long totalBeds = allBeds.size();
        long occupiedBeds = allBeds.stream().filter(b -> "occupied".equalsIgnoreCase(b.getStatus())).count();
        long availableBeds = totalBeds - occupiedBeds;
        Map<String, Object> beds = new HashMap<>();
        beds.put("total", totalBeds);
        beds.put("occupied", occupiedBeds);
        beds.put("available", availableBeds);
        beds.put("occupancyRate", totalBeds > 0 ? Math.round((occupiedBeds * 100.0) / totalBeds) : 0);
        data.put("beds", beds);

        // 5. Patient Stats
        long totalPatients = patientRepository.countByHospitalId(hospitalId);
        long newPatientsWeek = patientRepository.countByHospitalIdAndCreatedOnBetween(hospitalId, sevenDaysAgo, now);
        long newPatientsMonth = patientRepository.countByHospitalIdAndCreatedOnBetween(hospitalId, thirtyDaysAgo, now);
        Map<String, Object> patientStats = new HashMap<>();
        patientStats.put("total", totalPatients);
        patientStats.put("newThisWeek", newPatientsWeek);
        patientStats.put("newThisMonth", newPatientsMonth);
        data.put("patientStats", patientStats);

        // 6. Appointment Stats
        var todayAppts = appointmentRepository.findByHospitalIdAndAppointmentDateBetween(hospitalId,
                LocalDateTime.of(LocalDate.now(), LocalTime.MIN), LocalDateTime.of(LocalDate.now(), LocalTime.MAX));
        var weekAppts = appointmentRepository.findByHospitalIdAndAppointmentDateBetween(hospitalId, sevenDaysAgo, now);
        Map<String, Object> apptStats = new HashMap<>();
        apptStats.put("today", todayAppts.size());
        apptStats.put("thisWeek", weekAppts.size());
        long completed = weekAppts.stream().filter(a -> "completed".equalsIgnoreCase(a.getAppointmentStatus())).count();
        long cancelled = weekAppts.stream().filter(a -> "cancelled".equalsIgnoreCase(a.getAppointmentStatus())).count();
        apptStats.put("completed", completed);
        apptStats.put("cancelled", cancelled);
        data.put("appointmentStats", apptStats);

        // 7. Active Admissions
        var admissions = admissionRepository.findByHospitalIdAndAdmissionStatus(hospitalId, "admitted");
        data.put("activeAdmissions", admissions.size());

        // 8. Daily patient trend (last 7 days)
        java.util.List<Map<String, Object>> dailyTrend = new java.util.ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate d = LocalDate.now().minusDays(i);
            LocalDateTime ds = LocalDateTime.of(d, LocalTime.MIN);
            LocalDateTime de = LocalDateTime.of(d, LocalTime.MAX);
            long pc = patientRepository.countByHospitalIdAndCreatedOnBetween(hospitalId, ds, de);
            long ac = appointmentRepository.findByHospitalIdAndAppointmentDateBetween(hospitalId, ds, de).size();
            Map<String, Object> dd = new HashMap<>();
            dd.put("day", d.getDayOfWeek().toString().substring(0, 3));
            dd.put("date", d.toString());
            dd.put("patients", pc);
            dd.put("appointments", ac);
            dailyTrend.add(dd);
        }
        data.put("dailyTrend", dailyTrend);

        return ResponseEntity.ok(DanpheHttpResponse.ok(data));
    }
}
