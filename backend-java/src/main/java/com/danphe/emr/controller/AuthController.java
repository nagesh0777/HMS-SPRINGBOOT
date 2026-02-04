package com.danphe.emr.controller;

import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.model.User;
import com.danphe.emr.repository.UserRepository;
import com.danphe.emr.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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

    // Login DTO - camelCase to match Modern Frontend Axios calls
    public static class LoginRequest {
        public String userName;
        public String password;
    }

    @PostMapping("/GetLoginJwtToken")
    public ResponseEntity<?> authenticateUser(@RequestBody LoginRequest loginRequest) {
        try {
            String username = (loginRequest.userName != null) ? loginRequest.userName.trim() : "";
            String password = (loginRequest.password != null) ? loginRequest.password : "";

            System.out.println("--- LOGIN ATTEMPT ---");
            System.out.println("Username: [" + username + "]");
            System.out.println("Password length: " + password.length());

            userRepository.findByUserName(username).ifPresentOrElse(
                    u -> {
                        System.out.println("User exists in DB.");
                        System.out.println("DB Password: [" + u.getPassword() + "]");
                        System.out.println("Match: " + u.getPassword().equals(password));
                    },
                    () -> System.out.println("User NOT FOUND in DB."));

            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = jwtUtils.generateJwtToken(authentication);

            System.out.println("Login Success!");
            return ResponseEntity.ok(DanpheHttpResponse.ok(jwt));
        } catch (Exception e) {
            System.out.println("Login Failure: " + e.getMessage());
            return ResponseEntity.ok(DanpheHttpResponse.error("Invalid Username or Password"));
        }
    }

    @PostMapping("/seed")
    public ResponseEntity<?> seedUser() {
        if (userRepository.findByUserName("admin").isPresent()) {
            return ResponseEntity.badRequest().body("Admin already exists");
        }

        // 1. Create Employee for Admin
        com.danphe.emr.model.Employee adminEmp = new com.danphe.emr.model.Employee();
        adminEmp.setFirstName("System");
        adminEmp.setLastName("Administrator");
        adminEmp.setRole("Admin");
        adminEmp.setDepartment("IT");
        adminEmp.setStatus("Active");
        adminEmp.setIsActive(true);
        adminEmp = employeeRepository.save(adminEmp);

        // 2. Create User
        User user = new User();
        user.setUserName("admin");
        user.setPassword("pass123");
        user.setEmployeeId(adminEmp.getEmployeeId());
        user.setIsActive(true);
        user.setEmail("admin@danphe.com");
        userRepository.save(user);

        return ResponseEntity.ok("Admin user and employee seeded");
    }
}
