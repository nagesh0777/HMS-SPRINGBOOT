package com.danphe.emr.security;

import com.danphe.emr.model.User;
import com.danphe.emr.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.Nonnull;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {
    @Autowired
    UserRepository userRepository;

    @Autowired
    com.danphe.emr.repository.EmployeeRepository employeeRepository;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(@Nonnull String username) throws UsernameNotFoundException {
        System.out.println("UserDetailsService: loading [" + username + "]");
        User user = userRepository.findByUserName(username)
                .orElseThrow(() -> {
                    System.out.println("UserDetailsService: [" + username + "] not found!");
                    return new UsernameNotFoundException("User Not Found with username: " + username);
                });

        com.danphe.emr.model.Employee emp = null;
        if (user.getEmployeeId() != null) {
            emp = employeeRepository.findById(user.getEmployeeId()).orElse(null);
        }
        System.out.println("UserDetailsService: Found. Role=" + (emp != null ? emp.getRole() : "N/A"));

        return UserDetailsImpl.build(user, emp);
    }
}
