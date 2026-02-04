package com.danphe.emr.repository;

import com.danphe.emr.model.PharmacyItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PharmacyItemRepository extends JpaRepository<PharmacyItem, Integer> {

    // Find active medicines by name or generic name could go here
    List<PharmacyItem> findByIsActiveTrue();
}
