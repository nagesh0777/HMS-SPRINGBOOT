package com.danphe.emr.repository;

import com.danphe.emr.model.BillServiceItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BillServiceItemRepository extends JpaRepository<BillServiceItem, Integer> {

    List<BillServiceItem> findByServiceDepartmentId(Integer serviceDepartmentId);
}
