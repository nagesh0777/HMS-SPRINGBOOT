package com.danphe.emr.repository;

import com.danphe.emr.model.Bed;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BedRepository extends JpaRepository<Bed, Integer> {
    List<Bed> findByStatusAndIsActive(String status, Boolean isActive);

    List<Bed> findByIsActive(Boolean isActive);
}
