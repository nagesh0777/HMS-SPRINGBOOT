package com.danphe.emr.controller;

import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.model.Employee;
import com.danphe.emr.repository.EmployeeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.annotation.Nonnull;

import java.util.List;

@RestController
@RequestMapping("/api/Employee")
@CrossOrigin(origins = "*", maxAge = 3600)
public class EmployeeController {

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private com.danphe.emr.repository.UserRepository userRepository;

    @Autowired
    private com.danphe.emr.repository.EmployeeLogRepository logRepository;

    @Autowired
    private com.danphe.emr.repository.DoctorRepository doctorRepository;

    private String getCurrentUser() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        return (auth != null) ? auth.getName() : "System";
    }

    @GetMapping("/Employees")
    public ResponseEntity<DanpheHttpResponse<List<Employee>>> getAllEmployees() {
        return ResponseEntity.ok(DanpheHttpResponse.ok(employeeRepository.findAll()));
    }

    @GetMapping("/Logs")
    public ResponseEntity<DanpheHttpResponse<List<com.danphe.emr.model.EmployeeLog>>> getStaffLogs() {
        return ResponseEntity.ok(DanpheHttpResponse.ok(logRepository.findAllByOrderByTimestampDesc()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DanpheHttpResponse<Employee>> getEmployeeById(@PathVariable @Nonnull Integer id) {
        return employeeRepository.findById(id)
                .map(e -> ResponseEntity.ok(DanpheHttpResponse.ok(e)))
                .orElse(ResponseEntity.ok(DanpheHttpResponse.error("Employee not found")));
    }

    @PostMapping
    public ResponseEntity<DanpheHttpResponse<Employee>> addEmployee(@RequestBody Employee employee) {
        try {
            // 1. Save Employee
            Employee saved = employeeRepository.save(employee);

            // 2. Create corresponding User record for login
            if (saved.getUserName() != null && !saved.getUserName().trim().isEmpty()) {
                com.danphe.emr.model.User user = new com.danphe.emr.model.User();
                user.setUserName(saved.getUserName().trim());

                String pwd = (employee.getPassword() != null && !employee.getPassword().trim().isEmpty())
                        ? employee.getPassword().trim()
                        : "pass1";
                user.setPassword(pwd);

                user.setEmployeeId(saved.getEmployeeId());
                user.setIsActive(true);
                user.setEmail(saved.getEmail());
                userRepository.save(user);
            }

            // 3. Log Action
            logRepository.save(new com.danphe.emr.model.EmployeeLog(
                    saved.getEmployeeId(),
                    saved.getFirstName() + " " + saved.getLastName(),
                    "CREATED",
                    getCurrentUser(),
                    "New staff member registered with role: " + saved.getRole()));

            // 4. If Role is Doctor, create Doctor entity
            if ("Doctor".equalsIgnoreCase(saved.getRole())) {
                com.danphe.emr.model.Doctor d = new com.danphe.emr.model.Doctor();
                d.setFullName(saved.getFirstName() + " " + saved.getLastName());
                d.setDepartment(saved.getDepartment());
                d.setPhoneNumber(saved.getPhoneNumber());
                d.setEmail(saved.getEmail());
                d.setIsActive(saved.getIsActive());
                d.setEmployeeId(saved.getEmployeeId());
                // Defaults
                d.setStartTime("09:00");
                d.setEndTime("17:00");

                com.danphe.emr.model.Doctor savedDoc = doctorRepository.save(d);

                saved.setDoctorId(savedDoc.getDoctorId());
                employeeRepository.save(saved);
            }

            return ResponseEntity.ok(DanpheHttpResponse.ok(saved));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(DanpheHttpResponse.error("Could not save staff record: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<DanpheHttpResponse<Employee>> updateEmployee(@PathVariable @Nonnull Integer id,
            @RequestBody Employee details) {
        try {
            return employeeRepository.findById(id).map(existing -> {
                boolean statusSwitched = !existing.getIsActive().equals(details.getIsActive());

                existing.setFirstName(details.getFirstName());
                existing.setLastName(details.getLastName());
                existing.setRole(details.getRole());
                existing.setDepartment(details.getDepartment());
                existing.setPhoneNumber(details.getPhoneNumber());
                existing.setEmail(details.getEmail());
                existing.setUserName(details.getUserName());
                existing.setAccessLevel(details.getAccessLevel());
                existing.setAssignedModules(details.getAssignedModules());
                existing.setShiftTiming(details.getShiftTiming());
                existing.setDutyDays(details.getDutyDays());
                existing.setAssignedWard(details.getAssignedWard());
                existing.setStatus(details.getStatus());
                existing.setAdminNotes(details.getAdminNotes());
                existing.setIsActive(details.getIsActive());

                Employee saved = employeeRepository.save(existing);

                // Update user credentials if needed
                userRepository.findByEmployeeId(id).ifPresent(user -> {
                    user.setUserName(saved.getUserName());
                    if (details.getPassword() != null && !details.getPassword().isEmpty()) {
                        user.setPassword(details.getPassword());
                    }
                    user.setIsActive(saved.getIsActive());
                    userRepository.save(user);
                });

                // Log Action
                logRepository.save(new com.danphe.emr.model.EmployeeLog(
                        saved.getEmployeeId(),
                        saved.getFirstName() + " " + saved.getLastName(),
                        statusSwitched ? "STATUS_CHANGED" : "UPDATED",
                        getCurrentUser(),
                        statusSwitched ? "Status changed to " + (saved.getIsActive() ? "Active" : "Inactive")
                                : "Profile updated."));

                return ResponseEntity.ok(DanpheHttpResponse.ok(saved));
            }).orElse(ResponseEntity.ok(DanpheHttpResponse.error("Employee not found")));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(DanpheHttpResponse.error("Update failed: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<DanpheHttpResponse<String>> deleteEmployee(@PathVariable @Nonnull Integer id) {
        return employeeRepository.findById(id).map(emp -> {
            // 1. Log before deleting
            logRepository.save(new com.danphe.emr.model.EmployeeLog(
                    emp.getEmployeeId(),
                    emp.getFirstName() + " " + emp.getLastName(),
                    "DELETED",
                    getCurrentUser(),
                    "Staff record and associated login account removed."));

            // 2. Delete User account first
            userRepository.findByEmployeeId(id).ifPresent(u -> userRepository.delete(u));

            // 3. Delete Employee record
            employeeRepository.delete(emp);

            return ResponseEntity.ok(DanpheHttpResponse.ok("Staff member deleted successfully"));
        }).orElse(ResponseEntity.ok(DanpheHttpResponse.error("Employee not found")));
    }
}
