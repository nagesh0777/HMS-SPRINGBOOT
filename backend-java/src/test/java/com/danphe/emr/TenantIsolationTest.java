package com.danphe.emr;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import com.danphe.emr.model.FollowUp;
import com.danphe.emr.model.MedicalRecord;
import com.danphe.emr.model.Patient;
import com.danphe.emr.model.Prescription;
import com.danphe.emr.repository.FollowUpRepository;
import com.danphe.emr.repository.MedicalRecordRepository;
import com.danphe.emr.repository.PatientRepository;
import com.danphe.emr.repository.PrescriptionRepository;

/**
 * Tenant isolation, at the repository layer.
 *
 * These exist because of a real defect: three DoctorPortal endpoints fell back to `findAll()`
 * whenever the signed-in user had no linked doctor record — which is every admin, receptionist
 * and manager account — and returned prescriptions, follow-ups and lab results for every
 * hospital on the platform.
 *
 * It was a one-line fallback and nothing caught it. Each test below seeds two hospitals and
 * asserts that a query for one never returns the other's rows, so that class of mistake fails
 * the build rather than leaking patient data silently.
 */
@SpringBootTest
@Transactional
class TenantIsolationTest {

    private static final Integer HOSPITAL_A = 1;
    private static final Integer HOSPITAL_B = 2;

    @Autowired private PatientRepository patientRepository;
    @Autowired private PrescriptionRepository prescriptionRepository;
    @Autowired private FollowUpRepository followUpRepository;
    @Autowired private MedicalRecordRepository medicalRecordRepository;

    @BeforeEach
    void seedTwoHospitals() {
        patientRepository.save(patient(HOSPITAL_A, "Asha", "Kumar"));
        patientRepository.save(patient(HOSPITAL_B, "Bilal", "Ahmed"));

        prescriptionRepository.save(prescription(HOSPITAL_A, 10, 100));
        prescriptionRepository.save(prescription(HOSPITAL_B, 20, 200));

        followUpRepository.save(followUp(HOSPITAL_A, 10, 100));
        followUpRepository.save(followUp(HOSPITAL_B, 20, 200));

        medicalRecordRepository.save(record(HOSPITAL_A, 100, "lab_result"));
        medicalRecordRepository.save(record(HOSPITAL_B, 200, "lab_result"));
    }

    @Test
    @DisplayName("prescriptions: a hospital-wide query returns only that hospital's rows")
    void prescriptionsAreScoped() {
        List<Prescription> a = prescriptionRepository.findByHospitalIdOrderByCreatedOnDesc(HOSPITAL_A);

        assertThat(a).isNotEmpty();
        assertThat(a).allSatisfy(p ->
            assertThat(p.getHospitalId())
                .as("a prescription from another hospital leaked into hospital A's list")
                .isEqualTo(HOSPITAL_A));
    }

    @Test
    @DisplayName("follow-ups: a hospital-wide query returns only that hospital's rows")
    void followUpsAreScoped() {
        List<FollowUp> a = followUpRepository.findByHospitalIdOrderByFollowUpDateAsc(HOSPITAL_A);

        assertThat(a).isNotEmpty();
        assertThat(a).allSatisfy(f -> assertThat(f.getHospitalId()).isEqualTo(HOSPITAL_A));
    }

    @Test
    @DisplayName("lab records: filtering by type stays scoped to the hospital")
    void labRecordsAreScoped() {
        List<MedicalRecord> a =
            medicalRecordRepository.findByHospitalIdAndRecordTypeOrderByCreatedOnDesc(HOSPITAL_A, "lab_result");

        assertThat(a).isNotEmpty();
        assertThat(a).allSatisfy(r -> assertThat(r.getHospitalId()).isEqualTo(HOSPITAL_A));
    }

    @Test
    @DisplayName("a patient id from another hospital is not readable by id")
    void patientLookupCannotCrossTenants() {
        Patient theirs = patientRepository.findAll().stream()
            .filter(p -> HOSPITAL_B.equals(p.getHospitalId()))
            .findFirst()
            .orElseThrow();

        // Guessing a valid id from another tenant must not be enough to read the record.
        assertThat(patientRepository.findByHospitalIdAndPatientId(HOSPITAL_A, theirs.getPatientId()))
            .as("hospital A could read hospital B's patient by id")
            .isEmpty();
    }

    @Test
    @DisplayName("batch name lookup does not pull in other hospitals' patients")
    void batchLookupIsScoped() {
        List<Patient> all = patientRepository.findAll();
        List<Integer> everyId = all.stream().map(Patient::getPatientId).toList();

        // Asking for every id in the system, as hospital A, must return only A's patients —
        // this is the call that enriches list screens with names.
        List<Patient> visible = patientRepository.findByHospitalIdAndPatientIdIn(HOSPITAL_A, everyId);

        assertThat(visible).isNotEmpty();
        assertThat(visible).allSatisfy(p -> assertThat(p.getHospitalId()).isEqualTo(HOSPITAL_A));
        assertThat(visible).hasSizeLessThan(all.size());
    }

    // ── fixtures ────────────────────────────────────────────────────────────

    private static Patient patient(Integer hospitalId, String first, String last) {
        Patient p = new Patient();
        p.setHospitalId(hospitalId);
        p.setFirstName(first);
        p.setLastName(last);
        // Required by the entity's own validation — the fixture has to be a valid patient,
        // not just enough fields to compile.
        p.setGender("Female");
        p.setPhoneNumber("9" + (100000000 + hospitalId));
        p.setPatientNo(hospitalId * 1000 + first.hashCode() % 100);
        return p;
    }

    private static Prescription prescription(Integer hospitalId, Integer doctorId, Integer patientId) {
        Prescription p = new Prescription();
        p.setHospitalId(hospitalId);
        p.setDoctorId(doctorId);
        p.setPatientId(patientId);
        return p;
    }

    private static FollowUp followUp(Integer hospitalId, Integer doctorId, Integer patientId) {
        FollowUp f = new FollowUp();
        f.setHospitalId(hospitalId);
        f.setDoctorId(doctorId);
        f.setPatientId(patientId);
        return f;
    }

    private static MedicalRecord record(Integer hospitalId, Integer patientId, String type) {
        MedicalRecord r = new MedicalRecord();
        r.setHospitalId(hospitalId);
        r.setPatientId(patientId);
        r.setRecordType(type);
        return r;
    }
}
