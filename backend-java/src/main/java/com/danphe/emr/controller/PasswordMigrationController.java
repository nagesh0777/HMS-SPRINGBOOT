package com.danphe.emr.controller;

import com.danphe.emr.model.User;
import com.danphe.emr.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/Migration")
public class PasswordMigrationController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @GetMapping("/HashPasswords")
    public ResponseEntity<?> hashExistingPasswords() {
        List<User> users = userRepository.findAll();
        int updatedCount = 0;

        for (User user : users) {
            String currentPassword = user.getPassword();
            // BCrypt hashes start with $2a$, $2b$, or $2y$ and are 60 chars long
            if (currentPassword != null && !currentPassword.startsWith("$2a$")) {
                user.setPassword(passwordEncoder.encode(currentPassword));
                userRepository.save(user);
                updatedCount++;
            }
        }

        return ResponseEntity.ok("Successfully hashed " + updatedCount + " plaintext passwords in the database.");
    }
}
