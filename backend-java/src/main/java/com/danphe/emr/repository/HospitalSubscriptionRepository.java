package com.danphe.emr.repository;

import com.danphe.emr.model.HospitalSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HospitalSubscriptionRepository extends JpaRepository<HospitalSubscription, Integer> {
    Optional<HospitalSubscription> findByRazorpayOrderId(String razorpayOrderId);

    Optional<HospitalSubscription> findTopByHospitalIdOrderByCreatedOnDesc(Integer hospitalId);

    List<HospitalSubscription> findByHospitalIdOrderByCreatedOnDesc(Integer hospitalId);
}
