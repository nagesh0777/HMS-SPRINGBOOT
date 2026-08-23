package com.danphe.emr.controller;

import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.model.User;
import com.danphe.emr.repository.UserRepository;
import com.danphe.emr.security.JwtUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/Account")
public class AuthController {

    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    com.danphe.emr.repository.EmployeeRepository employeeRepository;

    @Autowired
    JwtUtils jwtUtils;

    @Autowired
    PasswordEncoder passwordEncoder;

    // Login DTO - camelCase to match Modern Frontend Axios calls
    public static class LoginRequest {
        @NotBlank(message = "Username is required")
        public String userName;

        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        public String password;
    }

    @PostMapping("/GetLoginJwtToken")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            String username = (loginRequest.userName != null) ? loginRequest.userName.trim() : "";
            String password = (loginRequest.password != null) ? loginRequest.password : "";

            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = jwtUtils.generateJwtToken(authentication);

            return ResponseEntity.ok(DanpheHttpResponse.ok(jwt));
        } catch (Exception e) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Invalid Username or Password"));
        }
    }

    @PostMapping("/seed")
    public ResponseEntity<?> seedUser() {
        com.danphe.emr.model.User existing = userRepository.findByUserName("trikaar_admin").orElse(null);
        if (existing != null) {
            existing.setPassword(passwordEncoder.encode("pass123"));
            userRepository.save(existing);
            return ResponseEntity.ok("Trikaar Admin password reset to pass123");
        }

        // 1. Create Employee for Admin
        com.danphe.emr.model.Employee adminEmp = new com.danphe.emr.model.Employee();
        adminEmp.setFirstName("Trikaar");
        adminEmp.setLastName("Administrator");
        adminEmp.setRole("Admin");
        adminEmp.setDepartment("IT");
        adminEmp.setStatus("Active");
        adminEmp.setIsActive(true);
        adminEmp = employeeRepository.save(adminEmp);

        // 2. Create User
        User user = new User();
        user.setUserName("trikaar_admin");
        user.setPassword(passwordEncoder.encode("trikaar_admin123")); // Updated to be more secure and compliant
        user.setEmployeeId(adminEmp.getEmployeeId());
        user.setIsActive(true);
        user.setHospitalId(null); // Seeded admin is global
        user.setEmail("admin@trikaar.com");
        userRepository.save(user);

        return ResponseEntity.ok("Trikaar Admin user and employee seeded successfully");
    }
}
