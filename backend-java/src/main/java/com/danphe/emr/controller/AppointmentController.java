package com.danphe.emr.controller;

import com.danphe.emr.model.Appointment;
import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.repository.AppointmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/Appointment")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AppointmentController {

    @Autowired
    AppointmentRepository appointmentRepository;

    @Autowired
    com.danphe.emr.repository.PatientRepository patientRepository;

    @GetMapping("/Appointments")
    public ResponseEntity<?> getAppointments(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime FromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime ToDate,
            @RequestParam(required = false) Integer performerId) {

        List<Appointment> list;
        if (performerId != null) {
            list = appointmentRepository.findByAppointmentDateBetweenAndPerformerId(FromDate, ToDate, performerId);
        } else {
            list = appointmentRepository.findByAppointmentDateBetween(FromDate, ToDate);
        }

        // Ensure patientCode etc are there for existing records
        for (Appointment apt : list) {
            if (apt.getPatientId() != null && (apt.getPatientCode() == null)) {
                patientRepository.findById(apt.getPatientId()).ifPresent(p -> {
                    apt.setPatientCode(p.getPatientCode());
                    apt.setFirstName(p.getFirstName());
                    apt.setLastName(p.getLastName());
                });
            }
        }

        return ResponseEntity.ok(DanpheHttpResponse.ok(list));
    }

    @PostMapping("/AddAppointment")
    public ResponseEntity<?> addAppointment(@RequestBody Appointment appointment) {
        // Prevent double booking for same doctor at same time
        if (appointment.getPerformerId() != null) {
            java.util.Optional<Appointment> conflict = appointmentRepository
                    .findByAppointmentDateAndPerformerIdAndAppointmentStatusNot(
                            appointment.getAppointmentDate(),
                            appointment.getPerformerId(),
                            "cancelled");

            if (conflict.isPresent()) {
                return ResponseEntity.ok(DanpheHttpResponse.error("Doctor is already booked for this time slot."));
            }
        }

        // Populate Patient Snapshot
        if (appointment.getPatientId() != null) {
            patientRepository.findById(appointment.getPatientId()).ifPresent(p -> {
                appointment.setPatientCode(p.getPatientCode());
                appointment.setFirstName(p.getFirstName());
                appointment.setLastName(p.getLastName());
                appointment.setGender(p.getGender());
                appointment.setAge(p.getAge());
                appointment.setContactNumber(p.getPhoneNumber());
            });
        }

        appointment.setAppointmentStatus("booked");
        Appointment saved = appointmentRepository.save(appointment);
        return ResponseEntity.ok(DanpheHttpResponse.ok(saved));
    }
}
