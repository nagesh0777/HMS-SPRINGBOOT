package com.danphe.emr.repository;

import com.danphe.emr.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByUserName(String userName);

    Optional<User> findByEmployeeId(Integer employeeId);
}
