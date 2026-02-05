package com.danphe.emr.repository;

import com.danphe.emr.model.Bed;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BedRepository extends JpaRepository<Bed, Integer> {
    List<Bed> findByHospitalId(Integer hospitalId);

    List<Bed> findByHospitalIdAndStatusAndIsActive(Integer hospitalId, String status, Boolean isActive);

    List<Bed> findByHospitalIdAndIsActive(Integer hospitalId, Boolean isActive);
}
