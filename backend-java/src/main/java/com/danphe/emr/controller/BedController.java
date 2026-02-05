package com.danphe.emr.controller;

import com.danphe.emr.model.Bed;
import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.repository.BedRepository;
import com.danphe.emr.security.SecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/Adt")
@CrossOrigin(origins = "*", maxAge = 3600)
public class BedController {

    @Autowired
    BedRepository bedRepository;

    @GetMapping("/Beds")
    public ResponseEntity<?> getBeds(@RequestParam(required = false) String status) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body(com.danphe.emr.model.DanpheHttpResponse.error("Unauthorized: Please ensure you have a valid hospital session."));

        List<Bed> list = (status != null) ? bedRepository.findByHospitalIdAndStatusAndIsActive(hospitalId, status, true)
                : bedRepository.findByHospitalIdAndIsActive(hospitalId, true);
        return ResponseEntity.ok(DanpheHttpResponse.ok(list));
    }

    @PostMapping("/Beds")
    public ResponseEntity<?> addBed(@RequestBody Bed bed) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body(com.danphe.emr.model.DanpheHttpResponse.error("Unauthorized: Please ensure you have a valid hospital session."));

        bed.setHospitalId(hospitalId);
        if (bed.getStatus() == null)
            bed.setStatus("available");
        if (bed.getIsActive() == null)
            bed.setIsActive(true);
        Bed saved = bedRepository.save(bed);
        return ResponseEntity.ok(DanpheHttpResponse.ok(saved));
    }

    @DeleteMapping("/Beds/{id}")
    public ResponseEntity<?> deleteBed(@PathVariable Integer id) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body(com.danphe.emr.model.DanpheHttpResponse.error("Unauthorized: Please ensure you have a valid hospital session."));

        return bedRepository.findById(id).map(bed -> {
            if (!hospitalId.equals(bed.getHospitalId())) {
                return ResponseEntity.ok(DanpheHttpResponse.error("Bed not found in this hospital"));
            }
            bed.setIsActive(false); // Soft Delete
            bedRepository.save(bed);
            return ResponseEntity.ok(DanpheHttpResponse.ok("Bed deactivated successfully"));
        }).orElse(ResponseEntity.ok(DanpheHttpResponse.error("Bed not found")));
    }
}
