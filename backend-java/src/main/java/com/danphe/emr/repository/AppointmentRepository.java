package com.danphe.emr.repository;

import com.danphe.emr.model.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Integer> {

        List<Appointment> findByHospitalIdAndAppointmentDateBetween(Integer hospitalId, LocalDateTime from,
                        LocalDateTime to);

        List<Appointment> findByHospitalIdAndAppointmentDateBetweenAndPerformerId(Integer hospitalId,
                        LocalDateTime from, LocalDateTime to,
                        Integer performerId);

        java.util.Optional<Appointment> findByHospitalIdAndAppointmentDateAndPerformerIdAndAppointmentStatusNot(
                        Integer hospitalId, LocalDateTime date, Integer performerId, String status);
}
