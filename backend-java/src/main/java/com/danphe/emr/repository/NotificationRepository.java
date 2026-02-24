package com.danphe.emr.repository;

import com.danphe.emr.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByHospitalIdAndTargetUserIdOrderByCreatedOnDesc(Integer hospitalId, Integer userId);

    List<Notification> findByHospitalIdAndTargetRoleOrderByCreatedOnDesc(Integer hospitalId, String role);

    List<Notification> findByHospitalIdAndTargetUserIdAndIsReadOrderByCreatedOnDesc(Integer hospitalId, Integer userId,
            Boolean isRead);

    long countByHospitalIdAndTargetUserIdAndIsRead(Integer hospitalId, Integer userId, Boolean isRead);

    long countByHospitalIdAndTargetRoleAndIsRead(Integer hospitalId, String role, Boolean isRead);

    List<Notification> findTop50ByHospitalIdAndTargetUserIdOrderByCreatedOnDesc(Integer hospitalId, Integer userId);

    List<Notification> findTop50ByHospitalIdAndTargetRoleOrderByCreatedOnDesc(Integer hospitalId, String role);
}
