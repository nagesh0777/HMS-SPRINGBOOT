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
import java.util.Optional;

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

        // Enrich with login username
        for (Doctor doc : list) {
            if (doc.getEmployeeId() != null) {
                userRepository.findByEmployeeId(doc.getEmployeeId()).ifPresent(u -> {
                    doc.setUserName(u.getUserName());
                });
            }
        }

        return ResponseEntity.ok(DanpheHttpResponse.ok(list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getDoctorById(@PathVariable Integer id) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body("Hospital ID not found");

        Optional<Doctor> opt = doctorRepository.findById(id);
        if (opt.isEmpty() || !hospitalId.equals(opt.get().getHospitalId())) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Doctor not found"));
        }

        Doctor doc = opt.get();
        if (doc.getEmployeeId() != null) {
            userRepository.findByEmployeeId(doc.getEmployeeId()).ifPresent(u -> {
                doc.setUserName(u.getUserName());
            });
        }

        return ResponseEntity.ok(DanpheHttpResponse.ok(doc));
    }

    @PostMapping("/Repair")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> repairDoctors() {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body("Hospital ID not found");

        List<Doctor> doctors = doctorRepository.findByHospitalId(hospitalId);
        int repaired = 0;

        for (Doctor doc : doctors) {
            if (doc.getEmployeeId() != null)
                continue; // Already linked

            // Create Employee
            com.danphe.emr.model.Employee emp = new com.danphe.emr.model.Employee();
            String[] names = (doc.getFullName() != null ? doc.getFullName() : "Doctor").split(" ", 2);
            emp.setFirstName(names[0]);
            emp.setLastName(names.length > 1 && !names[1].isBlank() ? names[1] : "Doctor");
            emp.setRole("Doctor");
            emp.setDepartment(doc.getDepartment() != null ? doc.getDepartment() : "OPD");
            String phone = doc.getPhoneNumber();
            emp.setPhoneNumber(phone != null && phone.matches("^[0-9]{10,15}$") ? phone : "0000000000");
            emp.setEmail(doc.getEmail());
            emp.setIsActive(doc.getIsActive() != null ? doc.getIsActive() : true);
            emp.setStatus("Active");
            emp.setDoctorId(doc.getDoctorId());
            emp.setHospitalId(hospitalId);

            // Generate username from name
            String baseUsername = "dr." + names[0].toLowerCase().replaceAll("[^a-z]", "");
            String username = baseUsername;
            int suffix = 1;
            while (userRepository.findByUserName(username).isPresent()) {
                username = baseUsername + suffix++;
            }
            emp.setUserName(username);
            com.danphe.emr.model.Employee savedEmp = employeeRepository.save(emp);

            // Link doctor to employee
            doc.setEmployeeId(savedEmp.getEmployeeId());
            doctorRepository.save(doc);

            // Create User for login
            com.danphe.emr.model.User user = new com.danphe.emr.model.User();
            user.setHospitalId(hospitalId);
            user.setUserName(username);
            user.setPassword("pass123");
            user.setEmployeeId(savedEmp.getEmployeeId());
            user.setIsActive(true);
            user.setEmail(doc.getEmail());
            userRepository.save(user);

            logRepository.save(new EmployeeLog(
                    hospitalId, savedEmp.getEmployeeId(), doc.getFullName(),
                    "CREATED", "System",
                    "Doctor account repaired. Login: " + username + " / pass123"));

            repaired++;
        }

        return ResponseEntity.ok(DanpheHttpResponse.ok("Repaired " + repaired + " doctor accounts"));
    }

    @PostMapping("")
    public ResponseEntity<?> addDoctor(@RequestBody Doctor doctor) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body("Hospital ID not found");

        // Auto-generate username from first name if not provided
        String[] nameParts = (doctor.getFullName() != null ? doctor.getFullName() : "Doctor").split(" ", 2);
        String firstName = nameParts[0].toLowerCase().replaceAll("[^a-z]", "");
        if (firstName.isEmpty())
            firstName = "doctor";

        String username;
        if (doctor.getUserName() != null && !doctor.getUserName().trim().isEmpty()) {
            username = doctor.getUserName().trim();
        } else {
            String base = "dr." + firstName;
            username = base;
            int suffix = 1;
            while (userRepository.findByUserName(username).isPresent()) {
                username = base + suffix++;
            }
        }

        // Check username uniqueness
        if (userRepository.findByUserName(username).isPresent()) {
            return ResponseEntity.ok(DanpheHttpResponse.error(
                    "Username '" + username + "' is already taken. Try a different name."));
        }

        // 1. Save Doctor
        doctor.setHospitalId(hospitalId);
        Doctor savedDoc = doctorRepository.save(doctor);

        // 2. Automatically create an Employee record
        com.danphe.emr.model.Employee emp = new com.danphe.emr.model.Employee();
        emp.setFirstName(nameParts[0]);
        emp.setLastName(nameParts.length > 1 && !nameParts[1].isBlank() ? nameParts[1] : "Doctor");
        emp.setRole("Doctor");
        emp.setDepartment(savedDoc.getDepartment() != null ? savedDoc.getDepartment() : "OPD");
        String phone = savedDoc.getPhoneNumber();
        emp.setPhoneNumber(phone != null && phone.matches("^[0-9]{10,15}$") ? phone : "0000000000");
        emp.setEmail(savedDoc.getEmail());
        emp.setUserName(username);
        emp.setIsActive(true);
        emp.setStatus("Active");
        emp.setDoctorId(savedDoc.getDoctorId());
        emp.setHospitalId(hospitalId);
        com.danphe.emr.model.Employee savedEmp = employeeRepository.save(emp);

        // Update doctor with employee id
        savedDoc.setEmployeeId(savedEmp.getEmployeeId());
        doctorRepository.save(savedDoc);

        // 3. Always create User for login
        com.danphe.emr.model.User user = new com.danphe.emr.model.User();
        user.setHospitalId(hospitalId);
        user.setUserName(username);
        user.setPassword((doctor.getPassword() != null && !doctor.getPassword().trim().isEmpty())
                ? doctor.getPassword().trim()
                : "pass123");
        user.setEmployeeId(savedEmp.getEmployeeId());
        user.setIsActive(true);
        user.setEmail(savedDoc.getEmail());
        user.setNeedsPasswordUpdate(true); // Flag to prompt password change on first login
        userRepository.save(user);

        logRepository.save(new EmployeeLog(
                hospitalId,
                savedEmp.getEmployeeId(),
                savedDoc.getFullName(),
                "CREATED",
                "System",
                "Doctor created with login: " + username));

        // Return doctor data + generated login credentials
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("doctor", savedDoc);
        result.put("loginUsername", username);
        result.put("loginPassword", user.getPassword());
        return ResponseEntity.ok(DanpheHttpResponse.ok(result));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateDoctor(@PathVariable Integer id, @RequestBody Doctor updated) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body("Hospital ID not found");

        return doctorRepository.findById(id).map(doc -> {
            if (!hospitalId.equals(doc.getHospitalId())) {
                return ResponseEntity.ok(DanpheHttpResponse.error("Doctor not found in this hospital"));
            }

            doc.setFullName(updated.getFullName());
            doc.setDepartment(updated.getDepartment());
            doc.setSpecialization(updated.getSpecialization());
            doc.setPhoneNumber(updated.getPhoneNumber());
            doc.setEmail(updated.getEmail());
            doc.setStartTime(updated.getStartTime());
            doc.setEndTime(updated.getEndTime());

            if (updated.getIsActive() != null) {
                doc.setIsActive(updated.getIsActive());
            }

            doctorRepository.save(doc);

            // Update linked Employee
            if (doc.getEmployeeId() != null) {
                employeeRepository.findById(doc.getEmployeeId()).ifPresent(emp -> {
                    String[] names = doc.getFullName().split(" ", 2);
                    emp.setFirstName(names[0]);
                    emp.setLastName(names.length > 1 ? names[1] : "");
                    emp.setDepartment(doc.getDepartment());
                    emp.setPhoneNumber(doc.getPhoneNumber());
                    emp.setEmail(doc.getEmail());
                    emp.setIsActive(doc.getIsActive());
                    emp.setStatus(doc.getIsActive() ? "Active" : "Inactive");
                    employeeRepository.save(emp);
                });
            }

            // Update User credentials if provided
            if (updated.getUserName() != null && !updated.getUserName().trim().isEmpty()
                    && doc.getEmployeeId() != null) {
                userRepository.findByHospitalIdAndEmployeeId(hospitalId, doc.getEmployeeId()).ifPresent(user -> {
                    user.setUserName(updated.getUserName().trim());
                    if (updated.getPassword() != null && !updated.getPassword().trim().isEmpty()) {
                        user.setPassword(updated.getPassword().trim());
                    }
                    user.setIsActive(doc.getIsActive());
                    userRepository.save(user);
                });
            }

            logRepository.save(new EmployeeLog(
                    hospitalId,
                    doc.getEmployeeId(),
                    doc.getFullName(),
                    "UPDATED",
                    "System",
                    "Doctor profile updated."));

            return ResponseEntity.ok(DanpheHttpResponse.ok(doc));
        }).orElse(ResponseEntity.ok(DanpheHttpResponse.error("Doctor not found")));
    }

    @PutMapping("/{id}/ToggleStatus")
    public ResponseEntity<?> toggleDoctorStatus(@PathVariable Integer id) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body("Hospital ID not found");

        return doctorRepository.findById(id).map(doc -> {
            if (!hospitalId.equals(doc.getHospitalId())) {
                return ResponseEntity.ok(DanpheHttpResponse.error("Doctor not found in this hospital"));
            }
            Boolean newStatus = !Boolean.TRUE.equals(doc.getIsActive());
            doc.setIsActive(newStatus);
            doctorRepository.save(doc);

            // Sync Employee & User status
            if (doc.getEmployeeId() != null) {
                employeeRepository.findById(doc.getEmployeeId()).ifPresent(emp -> {
                    emp.setIsActive(newStatus);
                    emp.setStatus(newStatus ? "Active" : "Inactive");
                    employeeRepository.save(emp);
                });
                userRepository.findByHospitalIdAndEmployeeId(hospitalId, doc.getEmployeeId()).ifPresent(user -> {
                    user.setIsActive(newStatus);
                    userRepository.save(user);
                });
            }

            logRepository.save(new EmployeeLog(
                    hospitalId,
                    doc.getEmployeeId(),
                    doc.getFullName(),
                    "STATUS_CHANGED",
                    "System",
                    "Doctor " + (newStatus ? "activated" : "deactivated")));

            return ResponseEntity.ok(DanpheHttpResponse.ok("Doctor " + (newStatus ? "activated" : "deactivated")));
        }).orElse(ResponseEntity.ok(DanpheHttpResponse.error("Doctor not found")));
    }

    @PutMapping("/{id}/ResetPassword")
    public ResponseEntity<?> resetDoctorPassword(@PathVariable Integer id,
            @RequestBody java.util.Map<String, String> body) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body("Hospital ID not found");

        String newPassword = body.getOrDefault("password", "pass123");
        if (newPassword.length() < 6) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Password must be at least 6 characters"));
        }

        return doctorRepository.findById(id).map(doc -> {
            if (!hospitalId.equals(doc.getHospitalId())) {
                return ResponseEntity.ok(DanpheHttpResponse.error("Doctor not found in this hospital"));
            }
            if (doc.getEmployeeId() == null) {
                return ResponseEntity.ok(DanpheHttpResponse.error("Doctor has no linked account. Use Repair first."));
            }
            userRepository.findByHospitalIdAndEmployeeId(hospitalId, doc.getEmployeeId()).ifPresent(user -> {
                user.setPassword(newPassword);
                user.setNeedsPasswordUpdate(true);
                userRepository.save(user);
            });

            logRepository.save(new EmployeeLog(
                    hospitalId, doc.getEmployeeId(), doc.getFullName(),
                    "PASSWORD_RESET", "Admin",
                    "Password reset by admin"));

            return ResponseEntity.ok(DanpheHttpResponse.ok("Password reset to: " + newPassword));
        }).orElse(ResponseEntity.ok(DanpheHttpResponse.error("Doctor not found")));
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

            if (doc.getEmployeeId() != null) {
                employeeRepository.findById(doc.getEmployeeId()).ifPresent(emp -> {
                    emp.setIsActive(false);
                    emp.setStatus("Inactive");
                    employeeRepository.save(emp);
                });
                userRepository.findByHospitalIdAndEmployeeId(hospitalId, doc.getEmployeeId()).ifPresent(user -> {
                    user.setIsActive(false);
                    userRepository.save(user);
                });
            }

            return ResponseEntity.ok(DanpheHttpResponse.ok("Doctor deactivated successfully"));
        }).orElse(ResponseEntity.ok(DanpheHttpResponse.error("Doctor not found")));
    }
}
