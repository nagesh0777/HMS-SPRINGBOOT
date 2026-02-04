package com.danphe.emr.controller;

import com.danphe.emr.model.Bed;
import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.repository.BedRepository;
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
        List<Bed> list = (status != null) ? bedRepository.findByStatusAndIsActive(status, true)
                : bedRepository.findByIsActive(true);
        return ResponseEntity.ok(DanpheHttpResponse.ok(list));
    }

    @PostMapping("/Beds")
    public ResponseEntity<?> addBed(@RequestBody Bed bed) {
        if (bed.getStatus() == null)
            bed.setStatus("available");
        if (bed.getIsActive() == null)
            bed.setIsActive(true);
        Bed saved = bedRepository.save(bed);
        return ResponseEntity.ok(DanpheHttpResponse.ok(saved));
    }

    @DeleteMapping("/Beds/{id}")
    public ResponseEntity<?> deleteBed(@PathVariable Integer id) {
        Bed bed = bedRepository.findById(id).orElse(null);
        if (bed != null) {
            bed.setIsActive(false); // Soft Delete
            bedRepository.save(bed);
            return ResponseEntity.ok(DanpheHttpResponse.ok("Bed deleted successfully"));
        } else {
            return ResponseEntity.ok(DanpheHttpResponse.error("Bed not found"));
        }
    }

    @PostMapping("/seed")
    public ResponseEntity<?> seedBeds() {
        if (bedRepository.count() == 0) {
            // Ward A - General
            createBed("101", "General Ward", "1st Floor", 500.0);
            createBed("102", "General Ward", "1st Floor", 500.0);
            createBed("103", "General Ward", "1st Floor", 500.0);

            // Ward B - Private
            createBed("201", "Private Ward", "2nd Floor", 1500.0);
            createBed("202", "Private Ward", "2nd Floor", 1500.0);

            // ICU
            createBed("ICU-1", "ICU", "3rd Floor", 5000.0);

            return ResponseEntity.ok(DanpheHttpResponse.ok("Beds Seeded"));
        }
        return ResponseEntity.ok(DanpheHttpResponse.ok("Already Seeded"));
    }

    private void createBed(String number, String ward, String floor, Double price) {
        Bed b = new Bed();
        b.setBedNumber(number);
        b.setWard(ward);
        b.setFloor(floor);
        b.setPricePerDay(price);
        b.setStatus("available");
        bedRepository.save(b);
    }
}
