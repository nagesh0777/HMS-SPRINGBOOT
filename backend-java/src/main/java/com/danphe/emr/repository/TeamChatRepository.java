package com.danphe.emr.repository;

import com.danphe.emr.model.TeamChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TeamChatRepository extends JpaRepository<TeamChatMessage, Long> {

    List<TeamChatMessage> findByHospitalIdAndChannelAndCreatedAtGreaterThanEqualOrderByCreatedAtAsc(
            Integer hospitalId, String channel, LocalDateTime cutoff);

    List<TeamChatMessage> findByHospitalIdAndCreatedAtGreaterThanEqualOrderByCreatedAtAsc(
            Integer hospitalId, LocalDateTime cutoff);

    @Transactional
    @Modifying
    @Query("DELETE FROM TeamChatMessage m WHERE m.createdAt < :cutoff")
    int deleteExpiredMessages(@Param("cutoff") LocalDateTime cutoff);

    @Query("SELECT COUNT(m) FROM TeamChatMessage m WHERE m.hospitalId = :hospitalId AND m.channel = :channel AND m.createdAt >= :cutoff")
    long countRecentByChannel(@Param("hospitalId") Integer hospitalId, @Param("channel") String channel, @Param("cutoff") LocalDateTime cutoff);
}
