package com.danphe.emr.controller;

import com.danphe.emr.model.BillServiceItem;
import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.model.ServiceDepartment;
import com.danphe.emr.repository.BillServiceItemRepository;
import com.danphe.emr.repository.ServiceDepartmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/Master")
@CrossOrigin(origins = "*", maxAge = 3600)
public class MasterController {

    @Autowired
    ServiceDepartmentRepository serviceDepartmentRepository;

    @Autowired
    BillServiceItemRepository billServiceItemRepository;

    @GetMapping("/ServiceDepartments")
    public ResponseEntity<DanpheHttpResponse<List<ServiceDepartment>>> getServiceDepartments() {
        return ResponseEntity.ok(DanpheHttpResponse.ok(serviceDepartmentRepository.findAll()));
    }

    @GetMapping("/BillServiceItems")
    public ResponseEntity<DanpheHttpResponse<List<BillServiceItem>>> getBillServiceItems() {
        return ResponseEntity.ok(DanpheHttpResponse.ok(billServiceItemRepository.findAll()));
    }

    @PostMapping("/seed")
    public ResponseEntity<DanpheHttpResponse<String>> seedMasterData() {
        if (serviceDepartmentRepository.count() == 0) {
            ServiceDepartment opd = new ServiceDepartment();
            opd.setServiceDepartmentName("OPD");
            opd.setIntegrationName("OPD");
            serviceDepartmentRepository.save(opd);

            ServiceDepartment lab = new ServiceDepartment();
            lab.setServiceDepartmentName("Laboratory");
            lab.setIntegrationName("Lab");
            serviceDepartmentRepository.save(lab);

            BillServiceItem ticket = new BillServiceItem();
            ticket.setServiceDepartmentId(opd.getServiceDepartmentId());
            ticket.setItemName("OPD Ticket Charge");
            ticket.setPrice(500.0);
            billServiceItemRepository.save(ticket);

            BillServiceItem cbc = new BillServiceItem();
            cbc.setServiceDepartmentId(lab.getServiceDepartmentId());
            cbc.setItemName("CBC Test");
            cbc.setPrice(350.0);
            billServiceItemRepository.save(cbc);
            return ResponseEntity.ok(DanpheHttpResponse.ok("Master Data Seeded"));
        }
        return ResponseEntity.ok(DanpheHttpResponse.ok("Already Seeded"));
    }
}
