package com.danphe.emr.controller;

import com.danphe.emr.model.Doctor;
import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.model.EmployeeLog;
import com.danphe.emr.repository.DoctorRepository;
import com.danphe.emr.security.SecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/Doctor")
@CrossOrigin(origins = "*", maxAge = 3600)
public class DoctorController {

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private com.danphe.emr.repository.EmployeeRepository employeeRepository;

    @Autowired
    private com.danphe.emr.repository.UserRepository userRepository;

    @Autowired
    private com.danphe.emr.repository.EmployeeLogRepository logRepository;

    @GetMapping("")
    public ResponseEntity<?> getDoctors(@RequestParam(required = false) Boolean isActive) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body("Hospital ID not found");

        List<Doctor> list = (isActive != null) ? doctorRepository.findByHospitalIdAndIsActive(hospitalId, isActive)
                : doctorRepository.findByHospitalId(hospitalId);
        return ResponseEntity.ok(DanpheHttpResponse.ok(list));
    }

    @PostMapping("")
    public ResponseEntity<?> addDoctor(@RequestBody Doctor doctor) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body("Hospital ID not found");

        // 1. Save Doctor
        doctor.setHospitalId(hospitalId);
        Doctor savedDoc = doctorRepository.save(doctor);

        // 2. Automatically create an Employee record
        com.danphe.emr.model.Employee emp = new com.danphe.emr.model.Employee();
        String[] names = savedDoc.getFullName().split(" ", 2);
        emp.setFirstName(names[0]);
        emp.setLastName(names.length > 1 ? names[1] : "");
        emp.setRole("Doctor");
        emp.setDepartment(savedDoc.getDepartment());
        emp.setPhoneNumber(savedDoc.getPhoneNumber());
        emp.setEmail(savedDoc.getEmail());
        emp.setUserName(doctor.getUserName());
        emp.setIsActive(true);
        emp.setStatus("Active");
        emp.setDoctorId(savedDoc.getDoctorId()); // Link logic
        emp.setHospitalId(hospitalId); // Scoped
        com.danphe.emr.model.Employee savedEmp = employeeRepository.save(emp);

        // Update doctor with employee id
        savedDoc.setEmployeeId(savedEmp.getEmployeeId());
        doctorRepository.save(savedDoc);

        // 3. Create User if username provided
        if (doctor.getUserName() != null && !doctor.getUserName().trim().isEmpty()) {
            com.danphe.emr.model.User user = new com.danphe.emr.model.User();
            user.setHospitalId(hospitalId); // Scoped
            user.setUserName(doctor.getUserName().trim());
            user.setPassword((doctor.getPassword() != null && !doctor.getPassword().trim().isEmpty())
                    ? doctor.getPassword().trim()
                    : "pass1");
            user.setEmployeeId(savedEmp.getEmployeeId());
            user.setIsActive(true);
            user.setEmail(savedDoc.getEmail());
            userRepository.save(user);

            // Log staff creation
            logRepository.save(new EmployeeLog(
                    hospitalId,
                    savedEmp.getEmployeeId(),
                    savedDoc.getFullName(),
                    "CREATED",
                    "System",
                    "Doctor created via appointment management with login enabled."));
        }

        return ResponseEntity.ok(DanpheHttpResponse.ok(savedDoc));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDoctor(@PathVariable Integer id) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body("Hospital ID not found");

        return doctorRepository.findById(id).map(doc -> {
            if (!hospitalId.equals(doc.getHospitalId())) {
                return ResponseEntity.ok(DanpheHttpResponse.error("Doctor not found in this hospital"));
            }
            doc.setIsActive(false);
            doctorRepository.save(doc);
            return ResponseEntity.ok(DanpheHttpResponse.ok("Doctor deactivated successfully"));
        }).orElse(ResponseEntity.ok(DanpheHttpResponse.error("Doctor not found")));
    }
}
