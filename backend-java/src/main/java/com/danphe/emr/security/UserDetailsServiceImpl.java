package com.danphe.emr.security;

import com.danphe.emr.model.User;
import com.danphe.emr.repository.UserRepository;
import com.danphe.emr.repository.HospitalRepository;
import com.danphe.emr.repository.EmployeeRepository;
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
    HospitalRepository hospitalRepository;

    @Autowired
    EmployeeRepository employeeRepository;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(@Nonnull String username) throws UsernameNotFoundException {
        System.out.println("UserDetailsService: loading [" + username + "]");
        User user = userRepository.findByUserName(username)
                .orElseThrow(() -> {
                    System.out.println("UserDetailsService: [" + username + "] not found!");
                    return new UsernameNotFoundException("User Not Found with username: " + username);
                });

        // Check Hospital Status and Isolation
        Integer targetHospitalId = user.getHospitalId();

        // Safety Fallback for missing hospitalId in User table
        Integer currentEmpId = user.getEmployeeId();
        if (targetHospitalId == null && currentEmpId != null) {
            com.danphe.emr.model.Employee empLookup = employeeRepository.findById(currentEmpId).orElse(null);
            if (empLookup != null) {
                targetHospitalId = empLookup.getHospitalId();
            }
        }

        if (targetHospitalId == null) {
            // Only global admins (trikaar_admin or admin) can have no hospital assignment
            if (!"trikaar_admin".equalsIgnoreCase(user.getUserName())
                    && !"admin".equalsIgnoreCase(user.getUserName())) {
                System.out.println("Login Denied: User [" + username + "] is not assigned to any hospital.");
                throw new UsernameNotFoundException("Secure Login Error: No hospital assignment found.");
            }
        } else {
            final Integer hId = targetHospitalId;
            com.danphe.emr.model.Hospital hospital = hospitalRepository.findById(hId)
                    .orElseThrow(() -> new UsernameNotFoundException("Assigned hospital not found."));

            if (!Boolean.TRUE.equals(hospital.getIsActive())) {
                System.out.println("Login Blocked: Hospital [" + hospital.getName() + "] is deactivated.");
                throw new UsernameNotFoundException("Hospital deactivated. Please contact support.");
            }
        }

        com.danphe.emr.model.Employee emp = null;
        Integer empId = user.getEmployeeId();
        if (empId != null) {
            emp = employeeRepository.findById(empId).orElse(null);
        }
        System.out.println("UserDetailsService: Found. Role=" + (emp != null ? emp.getRole() : "N/A"));

        return UserDetailsImpl.build(user, emp);
    }
}
