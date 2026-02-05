package com.danphe.emr.security;

import com.danphe.emr.model.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Objects;

public class UserDetailsImpl implements UserDetails {
    private static final long serialVersionUID = 1L;

    private Integer id;
    private Integer employeeId;
    private Integer doctorId;
    private Integer hospitalId; // NEW

    private String username;

    @JsonIgnore
    private String password;

    private String role;

    private Collection<? extends GrantedAuthority> authorities;

    public UserDetailsImpl(Integer id, Integer employeeId, Integer doctorId, Integer hospitalId, String username,
            String password,
            String role,
            Collection<? extends GrantedAuthority> authorities) {
        this.id = id;
        this.employeeId = employeeId;
        this.doctorId = doctorId;
        this.hospitalId = hospitalId;
        this.username = username;
        this.password = password;
        this.role = role;
        this.authorities = authorities;
    }

    public static UserDetailsImpl build(User user, com.danphe.emr.model.Employee emp) {
        String role = emp != null ? emp.getRole() : "Staff";
        Integer empId = emp != null ? emp.getEmployeeId() : user.getEmployeeId();
        Integer docId = emp != null ? emp.getDoctorId() : null;
        Integer hospId = emp != null ? emp.getHospitalId() : user.getHospitalId();

        return new UserDetailsImpl(
                user.getUserId(),
                empId,
                docId,
                hospId,
                user.getUserName(),
                user.getPassword(),
                role,
                java.util.Collections
                        .singletonList(new org.springframework.security.core.authority.SimpleGrantedAuthority(role)));
    }

    public Integer getDoctorId() {
        return doctorId;
    }

    public Integer getHospitalId() {
        return hospitalId;
    }

    public Integer getEmployeeId() {
        return employeeId;
    }

    public String getRole() {
        return role;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    public Integer getId() {
        return id;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (o == null || getClass() != o.getClass())
            return false;
        UserDetailsImpl user = (UserDetailsImpl) o;
        return Objects.equals(id, user.id);
    }
}
