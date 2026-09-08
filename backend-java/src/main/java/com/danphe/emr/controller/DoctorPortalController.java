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
    private com.danphe.emr.service.AuditService auditService;


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

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    // =========================================================================
    // 1. DOCTOR DASHBOARD
    // =========================================================================
    @GetMapping("/Dashboard")
    public ResponseEntity<?> getDoctorDashboard() {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        UserDetailsImpl user = SecurityUtil.getCurrentUser();
        Integer doctorId = user != null ? user.getDoctorId() : null;

        Map<String, Object> dashboard = new HashMap<>();

        // Timezone-safe date query: Fetch appointments within a +/- 1 day window
        LocalDateTime startRange = LocalDateTime.of(LocalDate.now().minusDays(1), LocalTime.MIN);
        LocalDateTime endRange = LocalDateTime.of(LocalDate.now().plusDays(1), LocalTime.MAX);

        List<Appointment> todaysAppts;
        if (doctorId != null) {
            todaysAppts = appointmentRepository
                    .findByHospitalIdAndAppointmentDateBetweenAndPerformerId(hospitalId, startRange, endRange,
                            doctorId);
        } else {
            todaysAppts = appointmentRepository
                    .findByHospitalIdAndAppointmentDateBetween(hospitalId, startRange, endRange);
        }

        // Filter: Keep all active appointments, but only Completed/Cancelled ones that fall on today's calendar date
        LocalDateTime todayStart = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime todayEnd = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);

        todaysAppts = todaysAppts.stream().filter(a -> {
            String status = a.getAppointmentStatus();
            if ("Completed".equalsIgnoreCase(status) || "Cancelled".equalsIgnoreCase(status)) {
                return a.getAppointmentDate().isAfter(todayStart) && a.getAppointmentDate().isBefore(todayEnd);
            }
            return true;
        }).collect(Collectors.toList());
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

        // Timezone-safe date query: Fetch appointments within a +/- 1 day window
        LocalDateTime startRange = LocalDateTime.of(LocalDate.now().minusDays(1), LocalTime.MIN);
        LocalDateTime endRange = LocalDateTime.of(LocalDate.now().plusDays(1), LocalTime.MAX);

        List<Appointment> queue;
        if (doctorId != null) {
            queue = appointmentRepository
                    .findByHospitalIdAndAppointmentDateBetweenAndPerformerId(hospitalId, startRange, endRange,
                            doctorId);
        } else {
            queue = appointmentRepository
                    .findByHospitalIdAndAppointmentDateBetween(hospitalId, startRange, endRange);
        }

        // Filter: Keep all active appointments, but only Completed/Cancelled ones that fall on today's calendar date
        LocalDateTime todayStart = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime todayEnd = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);

        queue = queue.stream().filter(a -> {
            String status = a.getAppointmentStatus();
            if ("Completed".equalsIgnoreCase(status) || "Cancelled".equalsIgnoreCase(status)) {
                return a.getAppointmentDate().isAfter(todayStart) && a.getAppointmentDate().isBefore(todayEnd);
            }
            return true;
        }).collect(Collectors.toList());

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

    @GetMapping("/TreatedHistory")
    public ResponseEntity<?> getTreatedHistory(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String searchQuery,
            @RequestParam(required = false) String status) {

        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        UserDetailsImpl user = SecurityUtil.getCurrentUser();
        Integer doctorId = user != null ? user.getDoctorId() : null;

        if (doctorId == null) {
            return ResponseEntity.ok(DanpheHttpResponse.ok(Collections.emptyList()));
        }

        // Fetch all appointments for this doctor at this hospital
        List<Appointment> list = appointmentRepository.findByHospitalId(hospitalId);

        // Filter by doctor
        list = list.stream()
                .filter(a -> doctorId.equals(a.getPerformerId()))
                .collect(Collectors.toList());

        // Filter by date range if provided (format expected: YYYY-MM-DD)
        if (startDate != null && !startDate.isBlank()) {
            try {
                LocalDateTime start = LocalDate.parse(startDate).atStartOfDay();
                list = list.stream()
                        .filter(a -> a.getAppointmentDate().isAfter(start) || a.getAppointmentDate().isEqual(start))
                        .collect(Collectors.toList());
            } catch (Exception e) {
                // Ignore parse errors silently
            }
        }
        if (endDate != null && !endDate.isBlank()) {
            try {
                LocalDateTime end = LocalDate.parse(endDate).atTime(LocalTime.MAX);
                list = list.stream()
                        .filter(a -> a.getAppointmentDate().isBefore(end) || a.getAppointmentDate().isEqual(end))
                        .collect(Collectors.toList());
            } catch (Exception e) {
                // Ignore parse errors silently
            }
        }

        // Filter by status if provided (e.g. Completed, CheckedIn, etc.)
        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
            list = list.stream()
                    .filter(a -> status.equalsIgnoreCase(a.getAppointmentStatus()))
                    .collect(Collectors.toList());
        }

        // Filter by search query (patient name, code, contact number)
        if (searchQuery != null && !searchQuery.isBlank()) {
            String q = searchQuery.toLowerCase();
            list = list.stream().filter(a -> {
                String fullName = ((a.getFirstName() != null ? a.getFirstName() : "") + " " + (a.getLastName() != null ? a.getLastName() : "")).toLowerCase();
                String code = a.getPatientCode() != null ? a.getPatientCode().toLowerCase() : "";
                String phone = a.getContactNumber() != null ? a.getContactNumber().toLowerCase() : "";
                return fullName.contains(q) || code.contains(q) || phone.contains(q);
            }).collect(Collectors.toList());
        }

        // Sort by appointment date descending (most recent first)
        list.sort((a, b) -> b.getAppointmentDate().compareTo(a.getAppointmentDate()));

        return ResponseEntity.ok(DanpheHttpResponse.ok(list));
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
        // A doctor pulling a full patient profile — history, prescriptions, labs — is the
        // broadest read in the system and the one an audit most needs to show.
        auditService.recordView("PatientProfile", patientId, null);

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

        // The no-doctorId branch previously called findAll(), which returned every prescription in
        // every hospital on the platform — a cross-tenant leak of patient data for any staff
        // account not linked to a doctor record. Scoped to the caller's hospital.
        List<Prescription> prescriptions;
        if (doctorId != null) {
            prescriptions = prescriptionRepository.findByHospitalIdAndDoctorIdOrderByCreatedOnDesc(hospitalId,
                    doctorId);
        } else {
            prescriptions = prescriptionRepository.findByHospitalIdOrderByCreatedOnDesc(hospitalId);
        }

        // One query for every name, rather than one query per prescription.
        java.util.Map<Integer, String> names = patientNamesFor(hospitalId,
                prescriptions.stream().map(Prescription::getPatientId).collect(Collectors.toList()));
        prescriptions.forEach(p -> p.setPatientName(names.get(p.getPatientId())));

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
        try {
            syncFollowUp(saved, user);
        } catch (Exception ex) {
            System.err.println("Failed to automatically sync follow-up: " + ex.getMessage());
        }
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
        existing.setRecommendedTests(updated.getRecommendedTests());
        existing.setAdvice(updated.getAdvice());
        existing.setStatus(updated.getStatus());
        existing.setTemplateName(updated.getTemplateName());

        UserDetailsImpl user = SecurityUtil.getCurrentUser();
        if (user != null) {
            existing.setModifiedBy(user.getEmployeeId());
        }

        existing.setFollowUpDate(updated.getFollowUpDate());
        existing.setFollowUpNotes(updated.getFollowUpNotes());

        Prescription saved = prescriptionRepository.save(existing);
        try {
            syncFollowUp(saved, user);
        } catch (Exception ex) {
            System.err.println("Failed to automatically sync follow-up: " + ex.getMessage());
        }
        return ResponseEntity.ok(DanpheHttpResponse.ok(saved));
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

    @PostMapping("/Prescriptions/{id}/SendPdf")
    public ResponseEntity<?> sendPrescriptionPdf(@PathVariable Integer id) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        Optional<Prescription> opt = prescriptionRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Prescription not found"));
        }
        
        Prescription rx = opt.get();
        var patOpt = patientRepository.findByHospitalIdAndPatientId(hospitalId, rx.getPatientId());
        if (patOpt.isEmpty()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Patient details not found"));
        }
        
        var patient = patOpt.get();
        String phone = patient.getPhoneNumber();
        if (phone == null || phone.trim().isEmpty()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Patient does not have a registered mobile number."));
        }

        // No SMS/WhatsApp provider is wired up. This used to return SUCCESS with the message
        // "successfully dispatched", which told the doctor the patient had received their
        // medication instructions when nothing had been sent — the patient goes home with no
        // dosage information and nobody knows. Until a provider is configured, say so plainly
        // so the prescription gets printed or handed over instead.
        return ResponseEntity.ok(DanpheHttpResponse.error(
                "Messaging is not configured for this hospital, so nothing was sent. "
                        + "Print the prescription or share it with the patient directly."));
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
        } else if (status != null && !status.isBlank()) {
            followUps = followUpRepository.findByHospitalIdAndStatusOrderByFollowUpDateAsc(hospitalId, status);
        } else {
            // Was findAll() — every follow-up across every hospital. Scoped to the caller's.
            followUps = followUpRepository.findByHospitalIdOrderByFollowUpDateAsc(hospitalId);
        }

        java.util.Map<Integer, String> names = patientNamesFor(hospitalId,
                followUps.stream().map(FollowUp::getPatientId).collect(Collectors.toList()));
        followUps.forEach(f -> f.setPatientName(names.get(f.getPatientId())));

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
            labs = medicalRecordRepository.findByHospitalIdAndDoctorIdOrderByCreatedOnDesc(hospitalId, doctorId)
                    .stream()
                    .filter(r -> "lab_result".equals(r.getRecordType()))
                    .collect(Collectors.toList());
        } else {
            // Was findAll() — every medical record on the platform, then filtered in memory.
            // Now scoped to the hospital and filtered by the database.
            labs = medicalRecordRepository.findByHospitalIdAndRecordTypeOrderByCreatedOnDesc(hospitalId, "lab_result");
        }

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
        profile.put("photoPath", doc.getPhotoPath());
        profile.put("consultationQrPath", doc.getConsultationQrPath());
        profile.put("qualifications", doc.getQualifications());
        profile.put("registrationNumber", doc.getRegistrationNumber());
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
        // Doctors can update: specialization, phone, email, availability, consultationQrPath
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
        if (body.containsKey("qualifications"))
            doc.setQualifications(body.get("qualifications"));
        if (body.containsKey("registrationNumber"))
            doc.setRegistrationNumber(body.get("registrationNumber"));
        if (body.containsKey("consultationQrPath")) {
            String val = body.get("consultationQrPath");
            if (val == null || val.trim().isEmpty() || "null".equals(val)) {
                doc.setConsultationQrPath(null);
            } else {
                doc.setConsultationQrPath(val);
            }
        }
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
        if (!passwordEncoder.matches(oldPassword, dbUser.getPassword())) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Current password is incorrect"));
        }

        dbUser.setPassword(passwordEncoder.encode(newPassword));
        dbUser.setNeedsPasswordUpdate(false);
        userRepository.save(dbUser);

        return ResponseEntity.ok(DanpheHttpResponse.ok("Password changed successfully"));
    }

    private void syncFollowUp(Prescription prescription, UserDetailsImpl user) {
        if (prescription == null || prescription.getPrescriptionId() == null) return;
        
        if (prescription.getFollowUpDate() != null) {
            Optional<FollowUp> opt = followUpRepository.findFirstByPrescriptionId(prescription.getPrescriptionId());
            FollowUp fu;
            if (opt.isPresent()) {
                fu = opt.get();
            } else {
                fu = new FollowUp();
                fu.setPrescriptionId(prescription.getPrescriptionId());
                fu.setHospitalId(prescription.getHospitalId());
                fu.setPatientId(prescription.getPatientId());
                fu.setDoctorId(prescription.getDoctorId());
                fu.setStatus("scheduled");
                fu.setPriority("routine");
            }
            fu.setFollowUpDate(prescription.getFollowUpDate());
            fu.setReason("Prescription Follow-Up - " + (prescription.getDiagnosis() != null ? prescription.getDiagnosis() : "General Assessment"));
            fu.setCareInstructions(prescription.getFollowUpNotes() != null ? prescription.getFollowUpNotes() : prescription.getClinicalNotes());
            if (user != null) {
                fu.setCreatedBy(user.getEmployeeId());
            }
            followUpRepository.save(fu);
        } else {
            followUpRepository.findFirstByPrescriptionId(prescription.getPrescriptionId()).ifPresent(fu -> {
                followUpRepository.delete(fu);
            });
        }
    }
    // =========================================================================
    // PRESCRIPTION TEMPLATES — stored per doctor in DB
    // =========================================================================

    @GetMapping("/Templates")
    public ResponseEntity<?> getMyTemplates() {
        UserDetailsImpl user = SecurityUtil.getCurrentUser();
        if (user == null || user.getDoctorId() == null)
            return ResponseEntity.ok(DanpheHttpResponse.error("Not authenticated as a doctor"));

        Optional<Doctor> optDoctor = doctorRepository.findById(user.getDoctorId());
        if (optDoctor.isEmpty())
            return ResponseEntity.ok(DanpheHttpResponse.error("Doctor record not found"));

        String templatesJson = optDoctor.get().getPrescriptionTemplates();
        // Return the raw JSON string; frontend will parse it
        return ResponseEntity.ok(DanpheHttpResponse.ok(templatesJson != null ? templatesJson : "[]"));
    }

    @PutMapping("/Templates")
    public ResponseEntity<?> saveMyTemplates(@RequestBody Map<String, String> body) {
        UserDetailsImpl user = SecurityUtil.getCurrentUser();
        if (user == null || user.getDoctorId() == null)
            return ResponseEntity.ok(DanpheHttpResponse.error("Not authenticated as a doctor"));

        Optional<Doctor> optDoctor = doctorRepository.findById(user.getDoctorId());
        if (optDoctor.isEmpty())
            return ResponseEntity.ok(DanpheHttpResponse.error("Doctor record not found"));

        Doctor doctor = optDoctor.get();
        doctor.setPrescriptionTemplates(body.get("templates"));
        doctorRepository.save(doctor);

        return ResponseEntity.ok(DanpheHttpResponse.ok("Templates saved successfully"));
    }


    /**
     * Resolves patient names for a list in a single query.
     *
     * Each of these lists previously called the patient repository once per row, so rendering a
     * doctor's prescriptions issued one query per prescription. For a busy clinic that is the
     * difference between one round trip and several hundred.
     */
    private java.util.Map<Integer, String> patientNamesFor(Integer hospitalId, java.util.Collection<Integer> patientIds) {
        java.util.Set<Integer> ids = patientIds.stream().filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        if (ids.isEmpty()) return java.util.Collections.emptyMap();
        return patientRepository.findByHospitalIdAndPatientIdIn(hospitalId, ids).stream()
                .collect(Collectors.toMap(
                        com.danphe.emr.model.Patient::getPatientId,
                        pat -> (pat.getFirstName() + " " + pat.getLastName()).trim(),
                        (a, b) -> a));
    }
}
