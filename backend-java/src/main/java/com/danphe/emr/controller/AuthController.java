package com.danphe.emr.controller;

import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.model.User;
import com.danphe.emr.repository.UserRepository;
import com.danphe.emr.security.JwtUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/Account")
public class AuthController {

    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    com.danphe.emr.repository.EmployeeRepository employeeRepository;

    @Autowired
    JwtUtils jwtUtils;

    @Autowired
    PasswordEncoder passwordEncoder;

    @Autowired
    com.danphe.emr.security.LoginAttemptService loginAttempts;

    // Login DTO - camelCase to match Modern Frontend Axios calls
    public static class LoginRequest {
        @NotBlank(message = "Username is required")
        public String userName;

        @NotBlank(message = "Password is required")
        @Size(min = 8, message = "Password must be at least 8 characters")
        public String password;
    }

    @PostMapping("/GetLoginJwtToken")
    public ResponseEntity<?> authenticateUser(
            @Valid @RequestBody LoginRequest loginRequest,
            jakarta.servlet.http.HttpServletRequest request) {
        String username = (loginRequest.userName != null) ? loginRequest.userName.trim() : "";
        String password = (loginRequest.password != null) ? loginRequest.password : "";
        String ip = clientIp(request);

        // Refuse before touching the database, so a locked-out attacker gets no timing signal
        // about whether the username exists.
        if (loginAttempts.isBlocked(username, ip)) {
            long retryAfter = loginAttempts.retryAfterSeconds(username, ip);
            return ResponseEntity.status(429)
                    .header("Retry-After", String.valueOf(retryAfter))
                    .body(DanpheHttpResponse.error(
                            "Too many failed sign-in attempts. Please try again in a few minutes."));
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = jwtUtils.generateJwtToken(authentication);

            loginAttempts.recordSuccess(username, ip);
            return ResponseEntity.ok(DanpheHttpResponse.ok(jwt));
        } catch (Exception e) {
            loginAttempts.recordFailure(username, ip);
            // Deliberately identical whether the username is unknown or the password is wrong —
            // a distinguishable response turns this form into an account-enumeration oracle.
            return ResponseEntity.ok(DanpheHttpResponse.error("Invalid Username or Password"));
        }
    }

    /** Behind a reverse proxy the socket address is the proxy; the real client is in the header. */
    private static String clientIp(jakarta.servlet.http.HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    // The /seed endpoint that used to live here was removed.
    //
    // /api/Account/** is permitAll, so it was an unauthenticated POST that reset the global
    // "trikaar_admin" password to a hardcoded value — one request from anyone on the internet to
    // full platform access across every hospital. Bootstrapping the first admin belongs in a
    // migration or an ops command, never in a public HTTP endpoint.

}
