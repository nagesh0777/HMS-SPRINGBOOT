package com.danphe.emr.repository;

import com.danphe.emr.model.ServiceCatalog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceCatalogRepository extends JpaRepository<ServiceCatalog, Integer> {

    List<ServiceCatalog> findByHospitalIdAndIsActiveTrueOrderByCategoryAscServiceNameAsc(Integer hospitalId);

    List<ServiceCatalog> findByHospitalIdOrderByCategoryAscServiceNameAsc(Integer hospitalId);

    List<ServiceCatalog> findByHospitalIdAndCategoryAndIsActiveTrue(Integer hospitalId, String category);

    Optional<ServiceCatalog> findByHospitalIdAndServiceId(Integer hospitalId, Integer serviceId);
}
