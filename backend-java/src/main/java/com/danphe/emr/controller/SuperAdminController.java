package com.danphe.emr.controller;

import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.model.Hospital;
import com.danphe.emr.repository.HospitalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/SuperAdmin")
@CrossOrigin(origins = "*", maxAge = 3600)
public class SuperAdminController {

    @Autowired
    HospitalRepository hospitalRepository;

    @Autowired
    com.danphe.emr.repository.EmployeeRepository employeeRepository;

    @Autowired
    com.danphe.emr.repository.UserRepository userRepository;

    @GetMapping("/Hospitals")
    public ResponseEntity<?> getAllHospitals() {
        return ResponseEntity.ok(DanpheHttpResponse.ok(hospitalRepository.findAll()));
    }

    // DTO for onboarding
    public static class CreateHospitalRequest {
        public String name;
        public String address;
        public String contactNumber;
        public String email;
        public String adminUsername;
        public String adminPassword;
    }

    @PostMapping("/Hospitals")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> createHospital(@RequestBody CreateHospitalRequest request) {
        // 1. Validate Unique
        if (hospitalRepository.findByName(request.name).isPresent()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital name already exists"));
        }
        if (userRepository.findByUserName(request.adminUsername).isPresent()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Admin username already taken"));
        }

        // 2. Create Hospital
        Hospital h = new Hospital();
        h.setName(request.name);
        h.setAddress(request.address);
        h.setContactNumber(request.contactNumber);
        h.setEmail(request.email);
        h.setIsActive(true);
        Hospital savedHospital = hospitalRepository.save(h);

        // 3. Create Admin Employee
        com.danphe.emr.model.Employee adminEmp = new com.danphe.emr.model.Employee();
        adminEmp.setFirstName("Admin");
        adminEmp.setLastName(request.name);
        adminEmp.setRole("Admin");
        adminEmp.setDepartment("Administration");
        adminEmp.setPhoneNumber(request.contactNumber);
        adminEmp.setEmail(request.email);
        adminEmp.setStatus("Active");
        adminEmp.setIsActive(true);
        adminEmp.setHospitalId(savedHospital.getHospitalId());
        adminEmp.setUserName(request.adminUsername); // Redundant but useful
        com.danphe.emr.model.Employee savedEmp = employeeRepository.save(adminEmp);

        // 4. Create Admin User
        com.danphe.emr.model.User adminUser = new com.danphe.emr.model.User();
        adminUser.setUserName(request.adminUsername);
        adminUser.setPassword(request.adminPassword); // In prod, hash this!
        adminUser.setEmployeeId(savedEmp.getEmployeeId());
        adminUser.setHospitalId(savedHospital.getHospitalId());
        adminUser.setIsActive(true);
        userRepository.save(adminUser);

        return ResponseEntity.ok(DanpheHttpResponse.ok(savedHospital));
    }

    @PutMapping("/Hospitals/{id}")
    public ResponseEntity<?> updateHospital(@PathVariable Integer id, @RequestBody Hospital details) {
        return hospitalRepository.findById(id).map(h -> {
            h.setName(details.getName());
            h.setAddress(details.getAddress());
            h.setContactNumber(details.getContactNumber());
            h.setEmail(details.getEmail());
            h.setIsActive(details.getIsActive());
            return ResponseEntity.ok(DanpheHttpResponse.ok(hospitalRepository.save(h)));
        }).orElse(ResponseEntity.ok(DanpheHttpResponse.error("Hospital not found")));
    }

    @GetMapping("/Summary")
    public ResponseEntity<?> getSummary() {
        java.util.Map<String, Object> summary = new java.util.HashMap<>();
        summary.put("totalHospitals", hospitalRepository.count());
        summary.put("activeHospitals",
                hospitalRepository.findAll().stream().filter(h -> Boolean.TRUE.equals(h.getIsActive())).count());
        summary.put("inactiveHospitals",
                hospitalRepository.findAll().stream().filter(h -> !Boolean.TRUE.equals(h.getIsActive())).count());
        return ResponseEntity.ok(DanpheHttpResponse.ok(summary));
    }

    // DTO for updating credentials
    public static class UpdateCredentialsRequest {
        public String newUsername;
        public String newPassword;
    }

    @PutMapping("/Hospitals/{id}/UpdateCredentials")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> updateHospitalCredentials(@PathVariable Integer id,
            @RequestBody UpdateCredentialsRequest request) {
        // 1. Find Admin Employee for this hospital
        com.danphe.emr.model.Employee adminEmp = employeeRepository.findByHospitalIdAndRole(id, "Admin")
                .stream().findFirst().orElse(null);

        if (adminEmp == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Admin account not found for this hospital"));
        }

        // 2. Find associated User
        com.danphe.emr.model.User user = userRepository.findByEmployeeId(adminEmp.getEmployeeId()).orElse(null);
        if (user == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Login account not found for this hospital admin"));
        }

        // 3. Update Credentials
        if (request.newUsername != null && !request.newUsername.trim().isEmpty()) {
            // Check if username taken by another user
            userRepository.findByUserName(request.newUsername).ifPresent(other -> {
                if (!other.getUserId().equals(user.getUserId())) {
                    throw new RuntimeException("Username already taken by another user");
                }
            });
            user.setUserName(request.newUsername.trim());
            adminEmp.setUserName(request.newUsername.trim());
        }

        if (request.newPassword != null && !request.newPassword.trim().isEmpty()) {
            user.setPassword(request.newPassword);
        }

        userRepository.save(user);
        employeeRepository.save(adminEmp);

        return ResponseEntity.ok(DanpheHttpResponse.ok("Credentials updated successfully"));
    }

    // Additional endpoints for managing subscriptions, etc.
}
