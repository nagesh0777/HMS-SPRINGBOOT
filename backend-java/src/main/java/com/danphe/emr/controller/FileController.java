package com.danphe.emr.controller;

import com.danphe.emr.security.SecurityUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.io.IOException;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.multipart.MultipartFile;
import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.repository.PatientRepository;
import com.danphe.emr.repository.DoctorRepository;
import com.danphe.emr.repository.EmployeeRepository;

@RestController
@RequestMapping("/api/Files")
@CrossOrigin(origins = "*", maxAge = 3600)
public class FileController {

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    private static final Set<String> ALLOWED_TYPES = Set.of("image/png", "image/jpeg", "image/jpg");
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    @PostMapping("/UploadPhoto")
    public ResponseEntity<?> uploadPhoto(
            @RequestParam("file") MultipartFile file,
            @RequestParam("type") String type,
            @RequestParam("id") Integer id) {

        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital context not found"));
        }

        // Validate type
        if (!"patient".equals(type) && !"doctor".equals(type) && !"employee".equals(type) && !"doctor_qr".equals(type)) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Invalid photo entity type"));
        }

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
            // Create directory: uploads/photo/{type}
            String dirPath = uploadDir + "/photo/" + type;
            Path dir = Paths.get(dirPath);
            Files.createDirectories(dir);

            // Generate filename
            String ext = contentType.contains("png") ? ".png" : ".jpg";
            String filename = id + "_" + System.currentTimeMillis() + ext;
            Path filePath = dir.resolve(filename);

            // Save file
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Path to serve it via API
            String relativeUrl = "/api/Files/photo/" + type + "/" + filename;

            // Update entity in DB
            if ("patient".equals(type)) {
                patientRepository.findByHospitalIdAndPatientId(hospitalId, id).ifPresent(p -> {
                    p.setPhotoPath(relativeUrl);
                    patientRepository.save(p);
                });
            } else if ("doctor".equals(type)) {
                doctorRepository.findById(id).ifPresent(d -> {
                    if (hospitalId.equals(d.getHospitalId())) {
                        d.setPhotoPath(relativeUrl);
                        doctorRepository.save(d);

                        // Also sync with associated Employee
                        if (d.getEmployeeId() != null) {
                            employeeRepository.findByHospitalIdAndEmployeeId(hospitalId, d.getEmployeeId()).ifPresent(emp -> {
                                emp.setPhotoPath(relativeUrl);
                                employeeRepository.save(emp);
                            });
                        }
                    }
                });
            } else if ("doctor_qr".equals(type)) {
                doctorRepository.findById(id).ifPresent(d -> {
                    if (hospitalId.equals(d.getHospitalId())) {
                        d.setConsultationQrPath(relativeUrl);
                        doctorRepository.save(d);
                    }
                });
            } else if ("employee".equals(type)) {
                employeeRepository.findByHospitalIdAndEmployeeId(hospitalId, id).ifPresent(emp -> {
                    emp.setPhotoPath(relativeUrl);
                    employeeRepository.save(emp);

                    // Also sync with associated Doctor if there's one
                    if (emp.getDoctorId() != null) {
                        doctorRepository.findById(emp.getDoctorId()).ifPresent(d -> {
                            d.setPhotoPath(relativeUrl);
                            doctorRepository.save(d);
                        });
                    }
                });
            }

            Map<String, String> result = new HashMap<>();
            result.put("path", relativeUrl);
            return ResponseEntity.ok(DanpheHttpResponse.ok(result));

        } catch (IOException e) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Failed to upload photo: " + e.getMessage()));
        }
    }

    /**
     * Serve uploaded profile photos securely.
     * Path format: /api/Files/photo/{type}/{filename}
     */
    @GetMapping("/photo/{type}/{filename}")
    public ResponseEntity<?> getPhoto(
            @PathVariable String type,
            @PathVariable String filename) {

        // Validate type
        if (!"patient".equals(type) && !"doctor".equals(type) && !"employee".equals(type) && !"doctor_qr".equals(type)) {
            return ResponseEntity.badRequest().body("Invalid photo type");
        }

        // Sanitize filename
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            return ResponseEntity.badRequest().body("Invalid filename");
        }

        try {
            Path filePath = Paths.get(uploadDir, "photo", type, filename);
            if (!Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }

            Resource resource = new UrlResource(filePath.toUri());
            String contentType = Files.probeContentType(filePath);
            if (contentType == null) {
                contentType = "application/octet-stream";
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                    .header(HttpHeaders.CACHE_CONTROL, "max-age=3600")
                    .body(resource);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error serving file");
        }
    }

    /**
     * Serve uploaded files (logo, signature) - restricted by hospitalId for
     * multi-tenant isolation.
     * Path format: /api/Files/{hospitalId}/{type}/{filename}
     */
    @GetMapping("/{hospitalId}/{type}/{filename}")
    public ResponseEntity<?> getFile(
            @PathVariable Integer hospitalId,
            @PathVariable String type,
            @PathVariable String filename) {

        // Multi-tenant security: only allow own hospital's files or SuperAdmin
        Integer currentHospitalId = SecurityUtil.getCurrentHospitalId();
        if (currentHospitalId != null && !currentHospitalId.equals(hospitalId) && !SecurityUtil.isSuperAdmin()) {
            return ResponseEntity.status(403).body("Access denied");
        }

        // Validate type
        if (!"logo".equals(type) && !"signature".equals(type)) {
            return ResponseEntity.badRequest().body("Invalid file type");
        }

        // Sanitize filename
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            return ResponseEntity.badRequest().body("Invalid filename");
        }

        try {
            Path filePath = Paths.get(uploadDir, hospitalId.toString(), type, filename);
            if (!Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }

            Resource resource = new UrlResource(filePath.toUri());
            String contentType = Files.probeContentType(filePath);
            if (contentType == null) {
                contentType = "application/octet-stream";
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                    .header(HttpHeaders.CACHE_CONTROL, "max-age=3600")
                    .body(resource);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error serving file");
        }
    }
}
