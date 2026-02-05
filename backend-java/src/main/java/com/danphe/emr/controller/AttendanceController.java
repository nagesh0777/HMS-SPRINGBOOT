package com.danphe.emr.controller;

import com.danphe.emr.model.Attendance;
import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.model.Employee;
import com.danphe.emr.repository.AttendanceRepository;
import com.danphe.emr.repository.EmployeeRepository;
import com.danphe.emr.security.SecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import com.fasterxml.jackson.annotation.JsonFormat;

@RestController
@RequestMapping("/api/Attendance")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AttendanceController {

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @PostMapping("/ScanRecord")
    public ResponseEntity<?> recordAttendance(@RequestBody AttendanceRequest request) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body("Hospital ID not found");

        Integer empId = request.getEmployeeId();
        if (empId == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Employee ID is required."));
        }

        // Must find employee within same hospital
        Optional<Employee> empOpt = employeeRepository.findByHospitalIdAndEmployeeId(hospitalId, empId);
        if (empOpt.isEmpty()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Invalid Employee ID for this hospital."));
        }

        Employee emp = empOpt.get();
        List<Attendance> lastRecords = attendanceRepository
                .findByHospitalIdAndEmployeeIdOrderByTimestampDesc(hospitalId, emp.getEmployeeId());

        String nextType = (request.getType() != null && !request.getType().isEmpty())
                ? request.getType()
                : "ClockIn";

        // Auto-toggle only if type is NOT explicitly provided
        if (request.getType() == null || request.getType().isEmpty()) {
            if (!lastRecords.isEmpty()) {
                Attendance last = lastRecords.get(0);
                if ("ClockIn".equals(last.getType())) {
                    nextType = "ClockOut";
                }
            }
        }

        Attendance attendance = new Attendance();
        attendance.setHospitalId(hospitalId);
        attendance.setEmployeeId(emp.getEmployeeId());
        attendance.setType(nextType);

        LocalDateTime time = (request.getTimestamp() != null)
                ? request.getTimestamp()
                : LocalDateTime.now();
        attendance.setTimestamp(time);
        attendance.setRemarks(request.getRemarks());

        attendanceRepository.save(attendance);
        System.out.println("Attendance: " + nextType + " recorded for " + emp.getFullName() + " at " + time);
        return ResponseEntity.ok(DanpheHttpResponse.ok(attendance));
    }

    @GetMapping("/Employee/{id}")
    public ResponseEntity<?> getEmployeeAttendance(@PathVariable Integer id) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body("Hospital ID not found");

        return ResponseEntity.ok(DanpheHttpResponse
                .ok(attendanceRepository.findByHospitalIdAndEmployeeIdOrderByTimestampDesc(hospitalId, id)));
    }

    @GetMapping("/All")
    public ResponseEntity<?> getAllAttendance() {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body("Hospital ID not found");

        return ResponseEntity.ok(DanpheHttpResponse.ok(attendanceRepository.findByHospitalId(hospitalId)));
    }

    @DeleteMapping("/ClearAll")
    public ResponseEntity<?> clearAllAttendance() {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body("Hospital ID not found");

        List<Attendance> list = attendanceRepository.findByHospitalId(hospitalId);
        attendanceRepository.deleteAll(list);
        return ResponseEntity.ok(DanpheHttpResponse.ok("Records for this hospital cleared."));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAttendance(@PathVariable Integer id, @RequestBody AttendanceRequest request) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body("Hospital ID not found");

        if (id == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("ID cannot be null"));
        }
        Optional<Attendance> existingOpt = attendanceRepository.findById(id);
        if (existingOpt.isEmpty() || !hospitalId.equals(existingOpt.get().getHospitalId())) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Record not found."));
        }
        Attendance existing = existingOpt.get();

        if (request.getType() != null)
            existing.setType(request.getType());
        if (request.getTimestamp() != null)
            existing.setTimestamp(request.getTimestamp());
        if (request.getRemarks() != null)
            existing.setRemarks(request.getRemarks());

        attendanceRepository.save(existing);
        return ResponseEntity.ok(DanpheHttpResponse.ok(existing));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAttendance(@PathVariable Integer id) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null)
            return ResponseEntity.status(401).body("Hospital ID not found");

        if (id == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("ID cannot be null"));
        }
        Optional<Attendance> existingOpt = attendanceRepository.findById(id);
        if (existingOpt.isEmpty() || !hospitalId.equals(existingOpt.get().getHospitalId())) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Record not found."));
        }
        Attendance existing = existingOpt.get();
        attendanceRepository.delete(existing);
        return ResponseEntity.ok(DanpheHttpResponse.ok("Record deleted."));
    }

    @lombok.Data
    public static class AttendanceRequest {
        private Integer employeeId;
        private String remarks;
        private String type;
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm")
        private LocalDateTime timestamp;
    }
}
