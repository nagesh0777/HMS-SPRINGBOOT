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

@RestController
@RequestMapping("/api/Files")
@CrossOrigin(origins = "*", maxAge = 3600)
public class FileController {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

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
