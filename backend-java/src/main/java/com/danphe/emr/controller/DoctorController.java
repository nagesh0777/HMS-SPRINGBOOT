package com.danphe.emr.controller;

import com.danphe.emr.model.Doctor;
import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.repository.DoctorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/Doctor")
@CrossOrigin(origins = "*", maxAge = 3600)
public class DoctorController {

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private com.danphe.emr.repository.EmployeeRepository employeeRepository;

    @Autowired
    private com.danphe.emr.repository.UserRepository userRepository;

    @Autowired
    private com.danphe.emr.repository.EmployeeLogRepository logRepository;

    @GetMapping("")
    public ResponseEntity<?> getDoctors(@RequestParam(required = false) Boolean isActive) {
        List<Doctor> list = (isActive != null) ? doctorRepository.findByIsActive(isActive) : doctorRepository.findAll();
        return ResponseEntity.ok(DanpheHttpResponse.ok(list));
    }

    @PostMapping("")
    public ResponseEntity<?> addDoctor(@RequestBody Doctor doctor) {
        // 1. Save Doctor
        Doctor savedDoc = doctorRepository.save(doctor);

        // 2. Automatically create an Employee record
        com.danphe.emr.model.Employee emp = new com.danphe.emr.model.Employee();
        String[] names = savedDoc.getFullName().split(" ", 2);
        emp.setFirstName(names[0]);
        emp.setLastName(names.length > 1 ? names[1] : "");
        emp.setRole("Doctor");
        emp.setDepartment(savedDoc.getDepartment());
        emp.setPhoneNumber(savedDoc.getPhoneNumber());
        emp.setEmail(savedDoc.getEmail());
        emp.setUserName(doctor.getUserName());
        emp.setIsActive(true);
        emp.setStatus("Active");
        emp.setDoctorId(savedDoc.getDoctorId()); // Link logic
        com.danphe.emr.model.Employee savedEmp = employeeRepository.save(emp);

        // Update doctor with employee id
        savedDoc.setEmployeeId(savedEmp.getEmployeeId());
        doctorRepository.save(savedDoc);

        // 3. Create User if username provided
        if (doctor.getUserName() != null && !doctor.getUserName().trim().isEmpty()) {
            com.danphe.emr.model.User user = new com.danphe.emr.model.User();
            user.setUserName(doctor.getUserName().trim());
            user.setPassword((doctor.getPassword() != null && !doctor.getPassword().trim().isEmpty())
                    ? doctor.getPassword().trim()
                    : "pass1");
            user.setEmployeeId(savedEmp.getEmployeeId());
            user.setIsActive(true);
            user.setEmail(savedDoc.getEmail());
            userRepository.save(user);

            // Log staff creation
            logRepository.save(new com.danphe.emr.model.EmployeeLog(
                    savedEmp.getEmployeeId(),
                    savedDoc.getFullName(),
                    "CREATED",
                    "System",
                    "Doctor created via appointment management with login enabled."));
        }

        return ResponseEntity.ok(DanpheHttpResponse.ok(savedDoc));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDoctor(@PathVariable Integer id) {
        Doctor doc = doctorRepository.findById(id).orElse(null);
        if (doc != null) {
            doc.setIsActive(false);
            doctorRepository.save(doc);
            return ResponseEntity.ok(DanpheHttpResponse.ok("Doctor deleted successfully"));
        }
        return ResponseEntity.ok(DanpheHttpResponse.error("Doctor not found"));
    }

    @PostMapping("/seed")
    public ResponseEntity<?> seedDoctors() {
        if (doctorRepository.count() == 0) {
            createDoctor("Dr. Sameer Nepal", "OPD", "General Physician", "09:00", "16:00");
            createDoctor("Dr. Binita KC", "Gynaecology", "Surgeon", "10:00", "18:00");
            createDoctor("Dr. Manish Gupta", "Cardiology", "Specialist", "08:00", "14:00");
            return ResponseEntity.ok(DanpheHttpResponse.ok("Doctors seeded"));
        }
        return ResponseEntity.ok(DanpheHttpResponse.ok("Already seeded"));
    }

    private void createDoctor(String name, String dept, String spec, String start, String end) {
        Doctor d = new Doctor();
        d.setFullName(name);
        d.setDepartment(dept);
        d.setSpecialization(spec);
        d.setStartTime(start);
        d.setEndTime(end);
        d.setIsActive(true);
        Doctor savedDoc = doctorRepository.save(d);

        // Also create Employee
        com.danphe.emr.model.Employee emp = new com.danphe.emr.model.Employee();
        String cleanName = name.replace("Dr. ", "").trim();
        String[] names = cleanName.split(" ", 2);

        emp.setFirstName(names[0]);
        emp.setLastName(names.length > 1 ? names[1] : "");
        emp.setRole("Doctor");
        emp.setDepartment(dept);
        emp.setIsActive(true);
        emp.setStatus("Active");
        emp.setDoctorId(savedDoc.getDoctorId()); // Link logic
        com.danphe.emr.model.Employee savedEmp = employeeRepository.save(emp);

        // Update doctor with employee id
        savedDoc.setEmployeeId(savedEmp.getEmployeeId());
        doctorRepository.save(savedDoc);

        // Create User
        com.danphe.emr.model.User user = new com.danphe.emr.model.User();
        user.setUserName("dr." + names[0].toLowerCase());
        user.setPassword("pass1");
        user.setEmployeeId(savedEmp.getEmployeeId());
        user.setIsActive(true);
        userRepository.save(user);

        System.out.println(
                ">>> SEEDED DOCTOR: [" + name + "] as Username: [" + user.getUserName() + "] Password: [pass1]");
    }
}
