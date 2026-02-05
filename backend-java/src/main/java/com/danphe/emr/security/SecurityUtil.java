package com.danphe.emr.security;

import com.danphe.emr.security.UserDetailsImpl;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class SecurityUtil {

    public static UserDetailsImpl getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserDetailsImpl) {
            return (UserDetailsImpl) authentication.getPrincipal();
        }
        return null;
    }

    public static Integer getCurrentHospitalId() {
        UserDetailsImpl user = getCurrentUser();
        return (user != null) ? user.getHospitalId() : null; // Added getHospitalId to UserDetailsImpl previously? No, I
                                                             // need to check UserDetailsImpl
    }

    public static boolean isSuperAdmin() {
        UserDetailsImpl user = getCurrentUser();
        // SuperAdmin is either special username "trikaar_admin", "admin" or has role
        // SuperAdmin
        return user != null
                && ("SuperAdmin".equalsIgnoreCase(user.getRole())
                        || "trikaar_admin".equalsIgnoreCase(user.getUsername())
                        || "admin".equalsIgnoreCase(user.getUsername()));
    }
}
