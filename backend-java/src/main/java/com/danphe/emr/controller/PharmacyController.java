package com.danphe.emr.controller;

import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.model.PharmacyItem;
import com.danphe.emr.repository.PharmacyItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/Pharmacy")
@CrossOrigin(origins = "*", maxAge = 3600)
public class PharmacyController {

    @Autowired
    PharmacyItemRepository pharmacyItemRepository;

    @GetMapping("/Items")
    public ResponseEntity<DanpheHttpResponse<List<PharmacyItem>>> getPharmacyItems() {
        return ResponseEntity.ok(DanpheHttpResponse.ok(pharmacyItemRepository.findByIsActiveTrue()));
    }

    @PostMapping("/Items")
    public ResponseEntity<DanpheHttpResponse<PharmacyItem>> addPharmacyItem(@RequestBody PharmacyItem item) {
        PharmacyItem saved = pharmacyItemRepository.save(item);
        return ResponseEntity.ok(DanpheHttpResponse.ok(saved));
    }

    @PostMapping("/seed")
    public ResponseEntity<DanpheHttpResponse<String>> seedPharmacyData() {
        if (pharmacyItemRepository.count() == 0) {
            PharmacyItem paracetamol = new PharmacyItem();
            paracetamol.setItemName("Paracetamol 500mg");
            paracetamol.setItemCode("PARA500");
            paracetamol.setDosage("500mg");
            paracetamol.setIsNarcotic(false);
            paracetamol.setMinStockQuantity(100.0);
            pharmacyItemRepository.save(paracetamol);

            PharmacyItem amoxicillin = new PharmacyItem();
            amoxicillin.setItemName("Amoxicillin 500mg");
            amoxicillin.setItemCode("AMOX500");
            amoxicillin.setDosage("500mg");
            amoxicillin.setIsNarcotic(false);
            amoxicillin.setMinStockQuantity(50.0);
            pharmacyItemRepository.save(amoxicillin);
            return ResponseEntity.ok(DanpheHttpResponse.ok("Pharmacy Data Seeded"));
        }
        return ResponseEntity.ok(DanpheHttpResponse.ok("Already Seeded"));
    }
}
