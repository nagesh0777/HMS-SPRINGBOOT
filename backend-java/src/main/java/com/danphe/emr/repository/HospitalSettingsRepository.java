package com.danphe.emr.repository;

import com.danphe.emr.model.HospitalSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HospitalSettingsRepository extends JpaRepository<HospitalSettings, Integer> {
    Optional<HospitalSettings> findByHospitalId(Integer hospitalId);
}
