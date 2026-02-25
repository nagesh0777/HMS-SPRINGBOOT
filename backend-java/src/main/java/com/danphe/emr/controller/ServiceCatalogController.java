package com.danphe.emr.controller;

import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.model.ServiceCatalog;
import com.danphe.emr.repository.ServiceCatalogRepository;
import com.danphe.emr.security.SecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/ServiceCatalog")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ServiceCatalogController {

    @Autowired
    private ServiceCatalogRepository catalogRepository;

    // GET all services for hospital (active only by default)
    @GetMapping
    public ResponseEntity<?> getServices(@RequestParam(required = false, defaultValue = "true") Boolean activeOnly) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital context not found"));

        List<ServiceCatalog> services;
        if (activeOnly) {
            services = catalogRepository.findByHospitalIdAndIsActiveTrueOrderByCategoryAscServiceNameAsc(hospitalId);
        } else {
            services = catalogRepository.findByHospitalIdOrderByCategoryAscServiceNameAsc(hospitalId);
        }
        return ResponseEntity.ok(DanpheHttpResponse.ok(services));
    }

    // GET services by category
    @GetMapping("/Category/{category}")
    public ResponseEntity<?> getByCategory(@PathVariable String category) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital context not found"));

        List<ServiceCatalog> services = catalogRepository.findByHospitalIdAndCategoryAndIsActiveTrue(hospitalId,
                category);
        return ResponseEntity.ok(DanpheHttpResponse.ok(services));
    }

    // CREATE service
    @PostMapping
    public ResponseEntity<?> createService(@RequestBody ServiceCatalog service) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital context not found"));

        if (service.getServiceName() == null || service.getServiceName().isBlank()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Service name is required"));
        }
        if (service.getRate() == null || service.getRate() < 0) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Valid rate is required"));
        }
        if (service.getCategory() == null || service.getCategory().isBlank()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Category is required"));
        }

        service.setHospitalId(hospitalId);
        ServiceCatalog saved = catalogRepository.save(service);
        return ResponseEntity.ok(DanpheHttpResponse.ok(saved));
    }

    // UPDATE service
    @PutMapping("/{serviceId}")
    public ResponseEntity<?> updateService(@PathVariable Integer serviceId, @RequestBody ServiceCatalog updated) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital context not found"));

        Optional<ServiceCatalog> opt = catalogRepository.findByHospitalIdAndServiceId(hospitalId, serviceId);
        if (opt.isEmpty())
            return ResponseEntity.ok(DanpheHttpResponse.error("Service not found"));

        ServiceCatalog existing = opt.get();
        if (updated.getServiceName() != null)
            existing.setServiceName(updated.getServiceName());
        if (updated.getCategory() != null)
            existing.setCategory(updated.getCategory());
        if (updated.getSubCategory() != null)
            existing.setSubCategory(updated.getSubCategory());
        if (updated.getRate() != null)
            existing.setRate(updated.getRate());
        if (updated.getRateType() != null)
            existing.setRateType(updated.getRateType());
        if (updated.getDescription() != null)
            existing.setDescription(updated.getDescription());
        if (updated.getDepartment() != null)
            existing.setDepartment(updated.getDepartment());
        if (updated.getIsActive() != null)
            existing.setIsActive(updated.getIsActive());

        catalogRepository.save(existing);
        return ResponseEntity.ok(DanpheHttpResponse.ok(existing));
    }

    // DELETE (soft delete - deactivate)
    @DeleteMapping("/{serviceId}")
    public ResponseEntity<?> deleteService(@PathVariable Integer serviceId) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital context not found"));

        Optional<ServiceCatalog> opt = catalogRepository.findByHospitalIdAndServiceId(hospitalId, serviceId);
        if (opt.isEmpty())
            return ResponseEntity.ok(DanpheHttpResponse.error("Service not found"));

        ServiceCatalog service = opt.get();
        service.setIsActive(false);
        catalogRepository.save(service);
        return ResponseEntity.ok(DanpheHttpResponse.ok("Service deactivated"));
    }

    // BULK SEED - default services for a new hospital
    @PostMapping("/SeedDefaults")
    public ResponseEntity<?> seedDefaults() {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital context not found"));

        // Check if already seeded
        List<ServiceCatalog> existing = catalogRepository.findByHospitalIdOrderByCategoryAscServiceNameAsc(hospitalId);
        if (!existing.isEmpty())
            return ResponseEntity.ok(DanpheHttpResponse.ok("Services already configured"));

        // Default services
        String[][] defaults = {
                { "OPD", "General Consultation", "500", "per_visit", "General OPD consultation fee" },
                { "OPD", "Specialist Consultation", "1000", "per_visit", "Specialist doctor consultation" },
                { "OPD", "Follow-up Consultation", "300", "per_visit", "Follow-up visit charge" },
                { "OPD", "Emergency Consultation", "1500", "per_visit", "Emergency department consultation" },
                { "IPD", "General Ward - Bed Charges", "1500", "per_day", "General ward bed per day" },
                { "IPD", "Semi-Private Room", "3000", "per_day", "Semi-private room per day" },
                { "IPD", "Private Room", "5000", "per_day", "Private room per day" },
                { "IPD", "ICU Charges", "8000", "per_day", "Intensive Care Unit per day" },
                { "IPD", "Nursing Charges", "500", "per_day", "Nursing care per day" },
                { "Lab", "Complete Blood Count (CBC)", "350", "fixed", "Blood test - CBC" },
                { "Lab", "Blood Sugar (Fasting)", "150", "fixed", "Fasting blood sugar test" },
                { "Lab", "Lipid Profile", "600", "fixed", "Complete lipid panel" },
                { "Lab", "Liver Function Test (LFT)", "800", "fixed", "Liver function test" },
                { "Lab", "Kidney Function Test (KFT)", "700", "fixed", "Kidney function panel" },
                { "Lab", "Thyroid Profile", "500", "fixed", "TSH, T3, T4 test" },
                { "Lab", "Urine Analysis", "200", "fixed", "Routine urine examination" },
                { "Imaging", "X-Ray", "400", "fixed", "Plain X-Ray single view" },
                { "Imaging", "Ultrasound", "1200", "fixed", "Ultrasound scan" },
                { "Imaging", "CT Scan", "5000", "fixed", "CT scan" },
                { "Imaging", "MRI", "8000", "fixed", "MRI scan" },
                { "Imaging", "ECG", "300", "fixed", "Electrocardiogram" },
                { "Procedure", "Wound Dressing", "200", "per_unit", "Minor wound dressing" },
                { "Procedure", "Injection Charges", "100", "per_unit", "Injection administration" },
                { "Procedure", "IV Fluid Administration", "300", "per_unit", "IV fluid setup and monitoring" },
                { "Procedure", "Catheterization", "500", "fixed", "Urinary catheterization" },
                { "Procedure", "Minor Surgery", "5000", "fixed", "Minor surgical procedure" },
                { "Procedure", "Major Surgery", "25000", "fixed", "Major surgical procedure" },
                { "Pharmacy", "Medicine Charges", "0", "per_unit", "As per prescription" },
                { "Other", "Ambulance", "2000", "fixed", "Ambulance service" },
                { "Other", "Medical Certificate", "300", "fixed", "Medical certificate issuance" },
                { "Other", "Discharge Summary", "200", "fixed", "Discharge summary preparation" },
                { "Other", "Registration Fee", "100", "fixed", "New patient registration" },
        };

        for (String[] d : defaults) {
            ServiceCatalog s = new ServiceCatalog();
            s.setHospitalId(hospitalId);
            s.setCategory(d[0]);
            s.setServiceName(d[1]);
            s.setRate(Double.parseDouble(d[2]));
            s.setRateType(d[3]);
            s.setDescription(d[4]);
            catalogRepository.save(s);
        }

        List<ServiceCatalog> all = catalogRepository.findByHospitalIdOrderByCategoryAscServiceNameAsc(hospitalId);
        return ResponseEntity.ok(DanpheHttpResponse.ok(all));
    }
}
