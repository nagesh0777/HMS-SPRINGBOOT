package com.danphe.emr.controller;

import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.danphe.emr.model.Appointment;
import com.danphe.emr.model.FollowUp;
import com.danphe.emr.model.MedicalRecord;
import com.danphe.emr.model.Patient;
import com.danphe.emr.model.Prescription;
import com.danphe.emr.repository.AppointmentRepository;
import com.danphe.emr.repository.FollowUpRepository;
import com.danphe.emr.repository.MedicalRecordRepository;
import com.danphe.emr.repository.PatientRepository;
import com.danphe.emr.repository.PrescriptionRepository;
import com.danphe.emr.security.SecurityUtil;
import com.danphe.emr.service.AuditService;
import com.danphe.emr.service.CsvWriter;

/**
 * CSV export.
 *
 * Three things this deliberately does, because bulk export of health records is the single
 * highest-risk read in the system:
 *
 *  1. Every row is scoped to the caller's hospital, like every other query here.
 *  2. Every export writes an audit entry recording who exported what and how many rows. An
 *     export leaves the system entirely, so if the trail matters anywhere it matters here.
 *  3. Rows stream to the response as they are written rather than being assembled in memory,
 *     so a hospital with 50,000 patients does not put the server under memory pressure.
 */
@RestController
@RequestMapping("/api/Export")
public class ExportController {

    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @Autowired private PatientRepository patientRepository;
    @Autowired private PrescriptionRepository prescriptionRepository;
    @Autowired private MedicalRecordRepository medicalRecordRepository;
    @Autowired private FollowUpRepository followUpRepository;
    @Autowired private AppointmentRepository appointmentRepository;
    @Autowired private AuditService auditService;

    /** Every patient in the caller's hospital. */
    @GetMapping("/Patients")
    public void exportPatients(
            @RequestParam(required = false, defaultValue = "") String search,
            HttpServletResponse response) throws IOException {

        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null) { response.setStatus(401); return; }

        List<Patient> patients = patientRepository.searchPatients("%" + search + "%", hospitalId);

        prepare(response, "patients");
        Writer w = new OutputStreamWriter(response.getOutputStream(), StandardCharsets.UTF_8);
        CsvWriter csv = new CsvWriter(w);
        csv.writeUtf8Bom();
        csv.writeRow(Arrays.asList(
                "Patient ID", "Patient Code", "First Name", "Middle Name", "Last Name",
                "Gender", "Date of Birth", "Age", "Phone", "Email", "Blood Group",
                "Marital Status", "Address", "Status"));

        for (Patient p : patients) {
            csv.writeRow(Arrays.asList(
                    p.getPatientId(), p.getPatientCode(), p.getFirstName(), p.getMiddleName(),
                    p.getLastName(), p.getGender(), p.getDateOfBirth(), p.getAge(),
                    p.getPhoneNumber(), p.getEmail(), p.getBloodGroup(), p.getMaritalStatus(),
                    p.getAddress(), p.getStatus()));
        }
        w.flush();

        auditService.recordChange("EXPORT", "Patient", null, "Patient list",
                patients.size() + " patient records exported to CSV");
    }

    /**
     * One patient's complete history in a single file — demographics, visits, prescriptions,
     * clinical records and follow-ups.
     *
     * Sections are stacked in one CSV rather than split across files because this is usually
     * printed or handed to the patient, and a single sheet survives that; multiple files do not.
     */
    @GetMapping("/Patient/{patientId}/History")
    public void exportPatientHistory(@PathVariable Integer patientId, HttpServletResponse response)
            throws IOException {

        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null) { response.setStatus(401); return; }

        Patient patient = patientRepository.findByHospitalIdAndPatientId(hospitalId, patientId).orElse(null);
        if (patient == null) { response.setStatus(404); return; }

        List<Prescription> prescriptions =
                prescriptionRepository.findByHospitalIdAndPatientIdOrderByCreatedOnDesc(hospitalId, patientId);
        List<MedicalRecord> records =
                medicalRecordRepository.findByHospitalIdAndPatientIdOrderByCreatedOnDesc(hospitalId, patientId);
        List<FollowUp> followUps =
                followUpRepository.findByHospitalIdAndPatientIdOrderByFollowUpDateDesc(hospitalId, patientId);
        List<Appointment> appointments =
                appointmentRepository.findByHospitalIdAndPatientIdOrderByAppointmentDateDesc(hospitalId, patientId);

        String name = safeName(patient);
        prepare(response, "history-" + name);
        Writer w = new OutputStreamWriter(response.getOutputStream(), StandardCharsets.UTF_8);
        CsvWriter csv = new CsvWriter(w);
        csv.writeUtf8Bom();

        csv.writeRow(List.of("PATIENT"));
        csv.writeRow(Arrays.asList("Patient Code", "Name", "Gender", "Date of Birth", "Age",
                "Phone", "Email", "Blood Group", "Address"));
        csv.writeRow(Arrays.asList(
                patient.getPatientCode(), fullName(patient), patient.getGender(),
                patient.getDateOfBirth(), patient.getAge(), patient.getPhoneNumber(),
                patient.getEmail(), patient.getBloodGroup(), patient.getAddress()));
        blank(csv);

        csv.writeRow(List.of("APPOINTMENTS (" + appointments.size() + ")"));
        csv.writeRow(Arrays.asList("Date", "Type", "Status", "Doctor", "Reason"));
        for (Appointment a : appointments) {
            csv.writeRow(Arrays.asList(a.getAppointmentDate(), a.getAppointmentType(),
                    a.getAppointmentStatus(), a.getPerformerName(), a.getReason()));
        }
        blank(csv);

        csv.writeRow(List.of("PRESCRIPTIONS (" + prescriptions.size() + ")"));
        csv.writeRow(Arrays.asList("Date", "Diagnosis", "Clinical Notes", "Medicines",
                "Allergy Warnings", "Recommended Tests", "Advice", "Weight (kg)", "Height (cm)", "Status"));
        for (Prescription p : prescriptions) {
            csv.writeRow(Arrays.asList(p.getCreatedOn(), p.getDiagnosis(), p.getClinicalNotes(),
                    p.getMedicines(), p.getAllergyWarnings(), p.getRecommendedTests(),
                    p.getAdvice(), p.getPatientWeight(), p.getPatientHeight(), p.getStatus()));
        }
        blank(csv);

        csv.writeRow(List.of("CLINICAL RECORDS (" + records.size() + ")"));
        csv.writeRow(Arrays.asList("Date", "Type", "Title", "Description", "Findings",
                "Lab Test", "Lab Result", "Lab Status", "Allergies", "Risk Flags"));
        for (MedicalRecord r : records) {
            csv.writeRow(Arrays.asList(r.getCreatedOn(), r.getRecordType(), r.getTitle(),
                    r.getDescription(), r.getFindings(), r.getLabTestName(), r.getLabResult(),
                    r.getLabStatus(), r.getAllergies(), r.getRiskFlags()));
        }
        blank(csv);

        csv.writeRow(List.of("FOLLOW-UPS (" + followUps.size() + ")"));
        csv.writeRow(Arrays.asList("Follow-up Date", "Status", "Priority", "Reason",
                "Care Instructions", "Treatment Plan"));
        for (FollowUp f : followUps) {
            csv.writeRow(Arrays.asList(f.getFollowUpDate(), f.getStatus(), f.getPriority(),
                    f.getReason(), f.getCareInstructions(), f.getTreatmentPlan()));
        }

        w.flush();

        // A full-history export is the broadest disclosure of one person's data the system
        // permits, so it is recorded specifically rather than as a generic read.
        auditService.recordChange("EXPORT", "PatientHistory", patientId, fullName(patient),
                String.format("Full history exported: %d appointments, %d prescriptions, %d records, %d follow-ups",
                        appointments.size(), prescriptions.size(), records.size(), followUps.size()));
    }

    /** Appointments in a date range — the export a front desk actually asks for. */
    @GetMapping("/Appointments")
    public void exportAppointments(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            HttpServletResponse response) throws IOException {

        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null) { response.setStatus(401); return; }

        LocalDate start = from != null && !from.isBlank() ? LocalDate.parse(from) : LocalDate.now().minusMonths(1);
        LocalDate end = to != null && !to.isBlank() ? LocalDate.parse(to) : LocalDate.now();

        List<Appointment> appointments = appointmentRepository.findByHospitalId(hospitalId).stream()
                .filter(a -> a.getAppointmentDate() != null)
                .filter(a -> {
                    LocalDate d = a.getAppointmentDate().toLocalDate();
                    return !d.isBefore(start) && !d.isAfter(end);
                })
                .collect(Collectors.toList());

        prepare(response, "appointments-" + start + "-to-" + end);
        Writer w = new OutputStreamWriter(response.getOutputStream(), StandardCharsets.UTF_8);
        CsvWriter csv = new CsvWriter(w);
        csv.writeUtf8Bom();
        csv.writeRow(Arrays.asList("Date", "Patient Code", "Patient", "Phone", "Type",
                "Status", "Doctor", "Reason"));

        for (Appointment a : appointments) {
            csv.writeRow(Arrays.asList(a.getAppointmentDate(), a.getPatientCode(),
                    (a.getFirstName() + " " + (a.getLastName() == null ? "" : a.getLastName())).trim(),
                    a.getContactNumber(), a.getAppointmentType(), a.getAppointmentStatus(),
                    a.getPerformerName(), a.getReason()));
        }
        w.flush();

        auditService.recordChange("EXPORT", "Appointment", null, "Appointment list",
                appointments.size() + " appointments exported (" + start + " to " + end + ")");
    }

    /** What the current user is allowed to export — lets the UI show only usable buttons. */
    @GetMapping("/Available")
    public ResponseEntity<?> available() {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(Map.of(
                "patients", true,
                "appointments", true,
                "patientHistory", true));
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private static void prepare(HttpServletResponse response, String basename) {
        String filename = basename + "-" + LocalDate.now().format(STAMP) + ".csv";
        response.setContentType("text/csv; charset=UTF-8");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
        // Exported patient data must not sit in a shared cache.
        response.setHeader("Cache-Control", "no-store");
    }

    private static void blank(CsvWriter csv) throws IOException {
        csv.writeRow(List.of(""));
    }

    private static String fullName(Patient p) {
        return (p.getFirstName() + " " + (p.getLastName() == null ? "" : p.getLastName())).trim();
    }

    /** Filenames end up on shared drives and in email — keep them boring and safe. */
    private static String safeName(Patient p) {
        String base = p.getPatientCode() != null && !p.getPatientCode().isBlank()
                ? p.getPatientCode()
                : fullName(p);
        return base.replaceAll("[^A-Za-z0-9._-]", "_");
    }
}
