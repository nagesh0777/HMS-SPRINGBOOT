package com.danphe.emr.controller;

import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.model.Patient;
import com.danphe.emr.repository.PatientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/Patient")
@CrossOrigin(origins = "*", maxAge = 3600)
public class PatientController {

    @Autowired
    PatientRepository patientRepository;

    @GetMapping("")
    public ResponseEntity<?> getPatients(
            @RequestParam(required = false, defaultValue = "") String search) {
        List<Patient> list = patientRepository.searchPatients("%" + search + "%");
        return ResponseEntity.ok(DanpheHttpResponse.ok(list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getPatientById(@PathVariable Integer id) {
        return patientRepository.findById(id)
                .map(p -> ResponseEntity.ok(DanpheHttpResponse.ok(p)))
                .orElse(ResponseEntity.ok(DanpheHttpResponse.error("Patient not found")));
    }

    @PostMapping("")
    public ResponseEntity<?> registerPatient(@RequestBody Patient patient) {
        try {
            System.out.println("Registering patient: " + patient.getFirstName() + " " + patient.getLastName());

            Integer maxId = patientRepository.getMaxPatientId();
            int nextId = (maxId == null) ? 1 : maxId + 1;

            // Set derived fields
            patient.setPatientCode("PAT" + String.format("%05d", nextId));
            if (patient.getPatientNo() == null || patient.getPatientNo() == 0) {
                patient.setPatientNo(nextId);
            }

            // Calculate DOB if missing but Age is present
            if (patient.getDateOfBirth() == null && patient.getAge() != null) {
                try {
                    String ageStr = patient.getAge().toUpperCase().replace("Y", "").trim();
                    int age = Integer.parseInt(ageStr);
                    patient.setDateOfBirth(java.time.LocalDate.now().minusYears(age));
                } catch (Exception e) {
                    // Ignore parsing error, leave DOB null
                    System.out.println("Could not parse age: " + patient.getAge());
                }
            }

            Patient saved = patientRepository.save(patient);
            return ResponseEntity.ok(DanpheHttpResponse.ok(saved));
        } catch (Exception e) {
            System.out.println("Error registering patient: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.ok(DanpheHttpResponse.error("Registration failed: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePatient(@PathVariable @jakarta.annotation.Nonnull Integer id,
            @RequestBody Patient patientDetails) {
        return patientRepository.findById(id).map(existingPatient -> {
            existingPatient.setFirstName(patientDetails.getFirstName());
            existingPatient.setLastName(patientDetails.getLastName());
            existingPatient.setGender(patientDetails.getGender());
            existingPatient.setAge(patientDetails.getAge());
            existingPatient.setPhoneNumber(patientDetails.getPhoneNumber());
            existingPatient.setAddress(patientDetails.getAddress());
            existingPatient.setEmail(patientDetails.getEmail());

            // Re-calculate DOB if Age changed
            if (patientDetails.getAge() != null && !patientDetails.getAge().equals(existingPatient.getAge())) {
                try {
                    String ageStr = patientDetails.getAge().toUpperCase().replaceAll("[^0-9]", "").trim();
                    if (!ageStr.isEmpty()) {
                        int age = Integer.parseInt(ageStr);
                        existingPatient.setDateOfBirth(java.time.LocalDate.now().minusYears(age));
                    }
                } catch (Exception e) {
                }
            }

            Patient updated = patientRepository.save(existingPatient);
            return ResponseEntity.ok(DanpheHttpResponse.ok(updated));
        }).orElse(ResponseEntity.ok(DanpheHttpResponse.error("Patient not found")));
    }
}
