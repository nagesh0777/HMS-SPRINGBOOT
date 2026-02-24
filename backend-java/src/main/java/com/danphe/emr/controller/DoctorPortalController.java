package com.danphe.emr.controller;

import com.danphe.emr.model.*;
import com.danphe.emr.repository.*;
import com.danphe.emr.security.SecurityUtil;
import com.danphe.emr.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/DoctorPortal")
@CrossOrigin(origins = "*", maxAge = 3600)
public class DoctorPortalController {

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private AdmissionRepository admissionRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    @Autowired
    private FollowUpRepository followUpRepository;

    @Autowired
    private MedicalRecordRepository medicalRecordRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    // =========================================================================
    // 1. DOCTOR DASHBOARD
    // =========================================================================
    @GetMapping("/Dashboard")
    public ResponseEntity<?> getDoctorDashboard() {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        UserDetailsImpl user = SecurityUtil.getCurrentUser();
        Integer doctorId = user != null ? user.getDoctorId() : null;

        Map<String, Object> dashboard = new HashMap<>();

        LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime endOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);

        // Today's Appointments
        List<Appointment> todaysAppts;
        if (doctorId != null) {
            todaysAppts = appointmentRepository
                    .findByHospitalIdAndAppointmentDateBetweenAndPerformerId(hospitalId, startOfDay, endOfDay,
                            doctorId);
        } else {
            todaysAppts = appointmentRepository
                    .findByHospitalIdAndAppointmentDateBetween(hospitalId, startOfDay, endOfDay);
        }
        dashboard.put("appointmentsToday", todaysAppts.size());

        // Appointment status breakdown
        Map<String, Long> statusBreakdown = todaysAppts.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getAppointmentStatus() != null ? a.getAppointmentStatus() : "unknown",
                        Collectors.counting()));
        dashboard.put("statusBreakdown", statusBreakdown);

        // Active Admissions (IPD)
        List<Admission> activeAdmissions = admissionRepository
                .findByHospitalIdAndAdmissionStatus(hospitalId, "admitted");
        if (doctorId != null) {
            activeAdmissions = activeAdmissions.stream()
                    .filter(a -> doctorId.equals(a.getAdmittingDoctorId()))
                    .collect(Collectors.toList());
        }
        dashboard.put("activeAdmissions", activeAdmissions.size());

        // Pending Lab Results
        long pendingLabs = 0;
        if (doctorId != null) {
            pendingLabs = medicalRecordRepository.countByHospitalIdAndDoctorIdAndLabStatus(hospitalId, doctorId,
                    "pending");
        }
        dashboard.put("pendingLabResults", pendingLabs);

        // Follow-ups Due Today
        List<FollowUp> todaysFollowUps = new ArrayList<>();
        if (doctorId != null) {
            todaysFollowUps = followUpRepository.findByHospitalIdAndDoctorIdAndFollowUpDate(hospitalId, doctorId,
                    LocalDate.now());
        }
        dashboard.put("followUpsDueToday", todaysFollowUps.size());
        dashboard.put("followUps", todaysFollowUps);

        // Emergency appointments (those with type containing "emergency")
        long emergencyCount = todaysAppts.stream()
                .filter(a -> a.getAppointmentType() != null
                        && a.getAppointmentType().toLowerCase().contains("emergency"))
                .count();
        dashboard.put("emergencyCount", emergencyCount);

        return ResponseEntity.ok(DanpheHttpResponse.ok(dashboard));
    }

    // =========================================================================
    // 2. PATIENT QUEUE
    // =========================================================================
    @GetMapping("/Queue")
    public ResponseEntity<?> getPatientQueue() {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        UserDetailsImpl user = SecurityUtil.getCurrentUser();
        Integer doctorId = user != null ? user.getDoctorId() : null;

        LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime endOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);

        List<Appointment> queue;
        if (doctorId != null) {
            queue = appointmentRepository
                    .findByHospitalIdAndAppointmentDateBetweenAndPerformerId(hospitalId, startOfDay, endOfDay,
                            doctorId);
        } else {
            queue = appointmentRepository
                    .findByHospitalIdAndAppointmentDateBetween(hospitalId, startOfDay, endOfDay);
        }

        // Sort: emergency first, then by appointment date
        queue.sort((a, b) -> {
            boolean aEmergency = a.getAppointmentType() != null
                    && a.getAppointmentType().toLowerCase().contains("emergency");
            boolean bEmergency = b.getAppointmentType() != null
                    && b.getAppointmentType().toLowerCase().contains("emergency");
            if (aEmergency && !bEmergency)
                return -1;
            if (!aEmergency && bEmergency)
                return 1;
            return a.getAppointmentDate().compareTo(b.getAppointmentDate());
        });

        return ResponseEntity.ok(DanpheHttpResponse.ok(queue));
    }

    @PutMapping("/Queue/{appointmentId}/Status")
    public ResponseEntity<?> updateAppointmentStatus(@PathVariable Integer appointmentId,
            @RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        Optional<Appointment> optAppt = appointmentRepository.findById(appointmentId);
        if (optAppt.isEmpty()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Appointment not found"));
        }
        Appointment appt = optAppt.get();
        appt.setAppointmentStatus(newStatus);
        appointmentRepository.save(appt);
        return ResponseEntity.ok(DanpheHttpResponse.ok("Status updated to " + newStatus));
    }

    // =========================================================================
    // 3. PATIENT PROFILE (Medical History, Records, Risk Flags)
    // =========================================================================
    @GetMapping("/Patient/{patientId}")
    public ResponseEntity<?> getPatientProfile(@PathVariable Integer patientId) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();

        Optional<Patient> optPatient = patientRepository.findByHospitalIdAndPatientId(hospitalId, patientId);
        if (optPatient.isEmpty()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Patient not found"));
        }

        Patient patient = optPatient.get();
        Map<String, Object> profile = new HashMap<>();
        profile.put("patient", patient);

        // Medical Records (Timeline)
        List<MedicalRecord> records = medicalRecordRepository
                .findByHospitalIdAndPatientIdOrderByCreatedOnDesc(hospitalId, patientId);
        profile.put("medicalHistory", records);

        // Past Prescriptions
        List<Prescription> prescriptions = prescriptionRepository
                .findByHospitalIdAndPatientIdOrderByCreatedOnDesc(hospitalId, patientId);
        profile.put("prescriptions", prescriptions);

        // Follow-ups
        List<FollowUp> followUps = followUpRepository
                .findByHospitalIdAndPatientIdOrderByFollowUpDateDesc(hospitalId, patientId);
        profile.put("followUps", followUps);

        // Allergies & Risk Flags (aggregate from medical records)
        Set<String> allergies = new LinkedHashSet<>();
        Set<String> riskFlags = new LinkedHashSet<>();
        for (MedicalRecord r : records) {
            if (r.getAllergies() != null && !r.getAllergies().isBlank()) {
                Arrays.stream(r.getAllergies().split(",")).map(String::trim).forEach(allergies::add);
            }
            if (r.getRiskFlags() != null && !r.getRiskFlags().isBlank()) {
                Arrays.stream(r.getRiskFlags().split(",")).map(String::trim).forEach(riskFlags::add);
            }
        }
        profile.put("allergies", allergies);
        profile.put("riskFlags", riskFlags);

        // Active Admission
        Optional<Admission> activeAdmission = admissionRepository
                .findByHospitalIdAndPatientIdAndAdmissionStatus(hospitalId, patientId, "admitted");
        profile.put("activeAdmission", activeAdmission.orElse(null));

        return ResponseEntity.ok(DanpheHttpResponse.ok(profile));
    }

    // Search patients for doctor
    @GetMapping("/SearchPatient")
    public ResponseEntity<?> searchPatient(@RequestParam String query) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        String search = "%" + query + "%";
        List<Patient> patients = patientRepository.searchPatients(search, hospitalId);
        return ResponseEntity.ok(DanpheHttpResponse.ok(patients));
    }

    // =========================================================================
    // 4. PRESCRIPTION MANAGEMENT
    // =========================================================================
    @GetMapping("/Prescriptions")
    public ResponseEntity<?> getPrescriptions() {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        UserDetailsImpl user = SecurityUtil.getCurrentUser();
        Integer doctorId = user != null ? user.getDoctorId() : null;

        List<Prescription> prescriptions;
        if (doctorId != null) {
            prescriptions = prescriptionRepository.findByHospitalIdAndDoctorIdOrderByCreatedOnDesc(hospitalId,
                    doctorId);
        } else {
            prescriptions = prescriptionRepository.findAll();
        }

        // Enrich with patient names
        for (Prescription p : prescriptions) {
            patientRepository.findByHospitalIdAndPatientId(hospitalId, p.getPatientId())
                    .ifPresent(pat -> p.setPatientName(pat.getFirstName() + " " + pat.getLastName()));
        }

        return ResponseEntity.ok(DanpheHttpResponse.ok(prescriptions));
    }

    @PostMapping("/Prescriptions")
    public ResponseEntity<?> createPrescription(@RequestBody Prescription prescription) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        UserDetailsImpl user = SecurityUtil.getCurrentUser();

        prescription.setHospitalId(hospitalId);
        if (user != null) {
            prescription.setDoctorId(user.getDoctorId());
            prescription.setCreatedBy(user.getEmployeeId());
        }

        Prescription saved = prescriptionRepository.save(prescription);
        return ResponseEntity.ok(DanpheHttpResponse.ok(saved));
    }

    @PutMapping("/Prescriptions/{id}")
    public ResponseEntity<?> updatePrescription(@PathVariable Integer id, @RequestBody Prescription updated) {
        Optional<Prescription> opt = prescriptionRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Prescription not found"));
        }

        Prescription existing = opt.get();
        existing.setMedicines(updated.getMedicines());
        existing.setDiagnosis(updated.getDiagnosis());
        existing.setClinicalNotes(updated.getClinicalNotes());
        existing.setAllergyWarnings(updated.getAllergyWarnings());
        existing.setStatus(updated.getStatus());
        existing.setTemplateName(updated.getTemplateName());

        UserDetailsImpl user = SecurityUtil.getCurrentUser();
        if (user != null) {
            existing.setModifiedBy(user.getEmployeeId());
        }

        prescriptionRepository.save(existing);
        return ResponseEntity.ok(DanpheHttpResponse.ok(existing));
    }

    @PutMapping("/Prescriptions/{id}/SendToPharmacy")
    public ResponseEntity<?> sendToPharmacy(@PathVariable Integer id) {
        Optional<Prescription> opt = prescriptionRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Prescription not found"));
        }

        Prescription p = opt.get();
        p.setStatus("sent_to_pharmacy");
        prescriptionRepository.save(p);
        return ResponseEntity.ok(DanpheHttpResponse.ok("Prescription sent to pharmacy"));
    }

    // =========================================================================
    // 5. FOLLOW-UP & CARE PLANNING
    // =========================================================================
    @GetMapping("/FollowUps")
    public ResponseEntity<?> getFollowUps(@RequestParam(required = false) String status) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        UserDetailsImpl user = SecurityUtil.getCurrentUser();
        Integer doctorId = user != null ? user.getDoctorId() : null;

        List<FollowUp> followUps;
        if (doctorId != null && status != null && !status.isBlank()) {
            followUps = followUpRepository.findByHospitalIdAndDoctorIdAndStatusOrderByFollowUpDateAsc(hospitalId,
                    doctorId, status);
        } else if (doctorId != null) {
            followUps = followUpRepository.findByHospitalIdAndDoctorIdOrderByFollowUpDateAsc(hospitalId, doctorId);
        } else {
            followUps = followUpRepository.findAll();
        }

        // Enrich with patient names
        for (FollowUp f : followUps) {
            patientRepository.findByHospitalIdAndPatientId(hospitalId, f.getPatientId())
                    .ifPresent(pat -> f.setPatientName(pat.getFirstName() + " " + pat.getLastName()));
        }

        return ResponseEntity.ok(DanpheHttpResponse.ok(followUps));
    }

    @PostMapping("/FollowUps")
    public ResponseEntity<?> createFollowUp(@RequestBody FollowUp followUp) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        UserDetailsImpl user = SecurityUtil.getCurrentUser();

        followUp.setHospitalId(hospitalId);
        if (user != null) {
            followUp.setDoctorId(user.getDoctorId());
            followUp.setCreatedBy(user.getEmployeeId());
        }

        FollowUp saved = followUpRepository.save(followUp);
        return ResponseEntity.ok(DanpheHttpResponse.ok(saved));
    }

    @PutMapping("/FollowUps/{id}")
    public ResponseEntity<?> updateFollowUp(@PathVariable Integer id, @RequestBody FollowUp updated) {
        Optional<FollowUp> opt = followUpRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Follow-up not found"));
        }

        FollowUp existing = opt.get();
        existing.setFollowUpDate(updated.getFollowUpDate());
        existing.setCareInstructions(updated.getCareInstructions());
        existing.setTreatmentPlan(updated.getTreatmentPlan());
        existing.setReason(updated.getReason());
        existing.setStatus(updated.getStatus());
        existing.setPriority(updated.getPriority());

        followUpRepository.save(existing);
        return ResponseEntity.ok(DanpheHttpResponse.ok(existing));
    }

    // =========================================================================
    // 6. MEDICAL RECORDS (Lab Results, Notes)
    // =========================================================================
    @GetMapping("/LabResults")
    public ResponseEntity<?> getLabResults() {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        UserDetailsImpl user = SecurityUtil.getCurrentUser();
        Integer doctorId = user != null ? user.getDoctorId() : null;

        List<MedicalRecord> labs;
        if (doctorId != null) {
            labs = medicalRecordRepository.findByHospitalIdAndDoctorIdOrderByCreatedOnDesc(hospitalId, doctorId);
        } else {
            labs = medicalRecordRepository.findAll();
        }

        // Filter to only lab type records
        labs = labs.stream()
                .filter(r -> "lab_result".equals(r.getRecordType()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(DanpheHttpResponse.ok(labs));
    }

    @PostMapping("/MedicalRecords")
    public ResponseEntity<?> createMedicalRecord(@RequestBody MedicalRecord record) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        UserDetailsImpl user = SecurityUtil.getCurrentUser();

        record.setHospitalId(hospitalId);
        if (user != null) {
            record.setDoctorId(user.getDoctorId());
            record.setCreatedBy(user.getEmployeeId());
        }

        MedicalRecord saved = medicalRecordRepository.save(record);
        return ResponseEntity.ok(DanpheHttpResponse.ok(saved));
    }

    // =========================================================================
    // 7. DOCTOR SELF-SERVICE PROFILE
    // =========================================================================
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @GetMapping("/MyProfile")
    public ResponseEntity<?> getMyProfile() {
        UserDetailsImpl user = SecurityUtil.getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).body(DanpheHttpResponse.error("Unauthorized"));
        }
        Integer doctorId = user.getDoctorId();
        if (doctorId == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Not a doctor account"));
        }

        Optional<Doctor> opt = doctorRepository.findById(doctorId);
        if (opt.isEmpty()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Doctor profile not found"));
        }

        Doctor doc = opt.get();
        Map<String, Object> profile = new HashMap<>();
        profile.put("doctorId", doc.getDoctorId());
        profile.put("fullName", doc.getFullName());
        profile.put("department", doc.getDepartment());
        profile.put("specialization", doc.getSpecialization());
        profile.put("phoneNumber", doc.getPhoneNumber());
        profile.put("email", doc.getEmail());
        profile.put("startTime", doc.getStartTime());
        profile.put("endTime", doc.getEndTime());
        profile.put("isActive", doc.getIsActive());
        profile.put("userName", user.getUsername());

        return ResponseEntity.ok(DanpheHttpResponse.ok(profile));
    }

    @PutMapping("/MyProfile")
    public ResponseEntity<?> updateMyProfile(@RequestBody Map<String, String> body) {
        UserDetailsImpl user = SecurityUtil.getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).body(DanpheHttpResponse.error("Unauthorized"));
        }
        Integer doctorId = user.getDoctorId();
        if (doctorId == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Not a doctor account"));
        }

        Optional<Doctor> opt = doctorRepository.findById(doctorId);
        if (opt.isEmpty()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Doctor profile not found"));
        }

        Doctor doc = opt.get();
        // Doctors can update: specialization, phone, email, availability
        if (body.containsKey("specialization"))
            doc.setSpecialization(body.get("specialization"));
        if (body.containsKey("phoneNumber"))
            doc.setPhoneNumber(body.get("phoneNumber"));
        if (body.containsKey("email"))
            doc.setEmail(body.get("email"));
        if (body.containsKey("startTime"))
            doc.setStartTime(body.get("startTime"));
        if (body.containsKey("endTime"))
            doc.setEndTime(body.get("endTime"));
        doctorRepository.save(doc);

        // Sync employee record
        if (doc.getEmployeeId() != null) {
            employeeRepository.findById(doc.getEmployeeId()).ifPresent(emp -> {
                if (body.containsKey("phoneNumber") && body.get("phoneNumber").matches("^[0-9]{10,15}$")) {
                    emp.setPhoneNumber(body.get("phoneNumber"));
                }
                if (body.containsKey("email"))
                    emp.setEmail(body.get("email"));
                employeeRepository.save(emp);
            });
        }

        return ResponseEntity.ok(DanpheHttpResponse.ok("Profile updated successfully"));
    }

    @PutMapping("/ChangePassword")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> body) {
        UserDetailsImpl currentUser = SecurityUtil.getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).body(DanpheHttpResponse.error("Unauthorized"));
        }

        String oldPassword = body.get("oldPassword");
        String newPassword = body.get("newPassword");

        if (newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.ok(DanpheHttpResponse.error("New password must be at least 6 characters"));
        }

        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        Optional<com.danphe.emr.model.User> optUser = userRepository.findByHospitalIdAndEmployeeId(
                hospitalId, currentUser.getEmployeeId());

        if (optUser.isEmpty()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("User account not found"));
        }

        com.danphe.emr.model.User dbUser = optUser.get();

        // Verify old password
        if (!dbUser.getPassword().equals(oldPassword)) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Current password is incorrect"));
        }

        dbUser.setPassword(newPassword);
        dbUser.setNeedsPasswordUpdate(false);
        userRepository.save(dbUser);

        return ResponseEntity.ok(DanpheHttpResponse.ok("Password changed successfully"));
    }
}
