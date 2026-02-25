package com.danphe.emr.controller;

import com.danphe.emr.model.*;
import com.danphe.emr.repository.*;
import com.danphe.emr.security.SecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;

@RestController
@RequestMapping("/api/HospitalSettings")
@CrossOrigin(origins = "*", maxAge = 3600)
public class HospitalSettingsController {

    @Autowired
    private HospitalSettingsRepository settingsRepository;

    @Autowired
    private HospitalRepository hospitalRepository;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    private static final Set<String> ALLOWED_TYPES = Set.of("image/png", "image/jpeg", "image/jpg");
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    // GET settings for current hospital
    @GetMapping
    public ResponseEntity<?> getSettings() {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital context not found"));
        }

        Optional<HospitalSettings> opt = settingsRepository.findByHospitalId(hospitalId);
        if (opt.isEmpty()) {
            // Auto-create from hospital data
            Hospital h = hospitalRepository.findById(hospitalId).orElse(null);
            HospitalSettings settings = new HospitalSettings();
            settings.setHospitalId(hospitalId);
            if (h != null) {
                settings.setHospitalName(h.getName());
                settings.setAddress(h.getAddress());
                settings.setPhoneNumber(h.getContactNumber());
                settings.setEmail(h.getEmail());
                settings.setHospitalCode(generateHospitalCode(h.getName()));
            }
            settings = settingsRepository.save(settings);
            return ResponseEntity.ok(DanpheHttpResponse.ok(settings));
        }

        return ResponseEntity.ok(DanpheHttpResponse.ok(opt.get()));
    }

    // GET settings for a specific hospital (for PDF generation / SuperAdmin)
    @GetMapping("/{hospitalId}")
    public ResponseEntity<?> getSettingsForHospital(@PathVariable Integer hospitalId) {
        Integer currentHospitalId = SecurityUtil.getCurrentHospitalId();
        // Allow access only for own hospital or SuperAdmin
        if (currentHospitalId != null && !currentHospitalId.equals(hospitalId) && !SecurityUtil.isSuperAdmin()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Access denied"));
        }

        Optional<HospitalSettings> opt = settingsRepository.findByHospitalId(hospitalId);
        if (opt.isEmpty()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Settings not found for this hospital"));
        }
        return ResponseEntity.ok(DanpheHttpResponse.ok(opt.get()));
    }

    // UPDATE settings
    @PutMapping
    public ResponseEntity<?> updateSettings(@RequestBody HospitalSettings updated) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital context not found"));
        }

        Optional<HospitalSettings> opt = settingsRepository.findByHospitalId(hospitalId);
        HospitalSettings settings;
        if (opt.isPresent()) {
            settings = opt.get();
        } else {
            settings = new HospitalSettings();
            settings.setHospitalId(hospitalId);
        }

        settings.setHospitalName(updated.getHospitalName());
        settings.setAddress(updated.getAddress());
        settings.setPhoneNumber(updated.getPhoneNumber());
        settings.setEmail(updated.getEmail());
        settings.setGstNumber(updated.getGstNumber());
        settings.setRegistrationNumber(updated.getRegistrationNumber());
        settings.setFooterText(updated.getFooterText());
        if (updated.getHospitalCode() != null && !updated.getHospitalCode().isBlank()) {
            settings.setHospitalCode(updated.getHospitalCode());
        }

        settings = settingsRepository.save(settings);
        return ResponseEntity.ok(DanpheHttpResponse.ok(settings));
    }

    // UPLOAD Logo
    @PostMapping("/UploadLogo")
    public ResponseEntity<?> uploadLogo(@RequestParam("file") MultipartFile file) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital context not found"));
        }
        return handleFileUpload(file, hospitalId, "logo");
    }

    // UPLOAD Signature
    @PostMapping("/UploadSignature")
    public ResponseEntity<?> uploadSignature(@RequestParam("file") MultipartFile file) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital context not found"));
        }
        return handleFileUpload(file, hospitalId, "signature");
    }

    private ResponseEntity<?> handleFileUpload(MultipartFile file, Integer hospitalId, String type) {
        // Validate file type
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType.toLowerCase())) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Only PNG and JPG files are allowed"));
        }

        // Validate file size
        if (file.getSize() > MAX_FILE_SIZE) {
            return ResponseEntity.ok(DanpheHttpResponse.error("File size must be less than 5MB"));
        }

        try {
            // Create directory: uploads/{hospitalId}/{type}
            String dirPath = uploadDir + "/" + hospitalId + "/" + type;
            Path dir = Paths.get(dirPath);
            Files.createDirectories(dir);

            // Generate filename
            String ext = contentType.contains("png") ? ".png" : ".jpg";
            String filename = type + "_" + System.currentTimeMillis() + ext;
            Path filePath = dir.resolve(filename);

            // Save file
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Update settings
            String relativePath = "/" + dirPath + "/" + filename;
            Optional<HospitalSettings> opt = settingsRepository.findByHospitalId(hospitalId);
            HospitalSettings settings;
            if (opt.isPresent()) {
                settings = opt.get();
            } else {
                settings = new HospitalSettings();
                settings.setHospitalId(hospitalId);
            }

            if ("logo".equals(type)) {
                settings.setLogoPath(relativePath);
            } else {
                settings.setSignatureImagePath(relativePath);
            }

            settingsRepository.save(settings);

            Map<String, String> result = new HashMap<>();
            result.put("path", relativePath);
            result.put("type", type);
            return ResponseEntity.ok(DanpheHttpResponse.ok(result));

        } catch (IOException e) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Failed to upload file: " + e.getMessage()));
        }
    }

    private String generateHospitalCode(String name) {
        if (name == null || name.isBlank())
            return "HSP";
        String[] words = name.trim().split("\\s+");
        StringBuilder code = new StringBuilder();
        for (String word : words) {
            if (!word.isEmpty())
                code.append(Character.toUpperCase(word.charAt(0)));
        }
        String result = code.toString();
        return result.length() > 5 ? result.substring(0, 5) : result;
    }
}
