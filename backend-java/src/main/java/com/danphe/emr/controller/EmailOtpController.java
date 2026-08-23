package com.danphe.emr.controller;

import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.service.EmailOtpService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/Otp")
@CrossOrigin(origins = "*", maxAge = 3600)
public class EmailOtpController {

    @Autowired
    private EmailOtpService emailOtpService;

    public static class SendOtpRequest {
        public String email;
    }

    public static class VerifyOtpRequest {
        public String email;
        public String otp;
    }

    @PostMapping("/SendEmail")
    public ResponseEntity<?> sendEmailOtp(@RequestBody SendOtpRequest request) {
        try {
            EmailOtpService.SendResult result = emailOtpService.sendOtp(request.email);
            if (result.mockMode()) {
                return ResponseEntity.ok(DanpheHttpResponse.ok(Map.of(
                        "message", result.message(),
                        "mockMode", true,
                        "otpCode", result.code())));
            }
            return ResponseEntity.ok(DanpheHttpResponse.ok(Map.of(
                    "message", result.message(),
                    "mockMode", false)));
        } catch (Exception e) {
            return ResponseEntity.ok(DanpheHttpResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/VerifyEmail")
    public ResponseEntity<?> verifyEmailOtp(@RequestBody VerifyOtpRequest request) {
        try {
            EmailOtpService.VerifyResult result = emailOtpService.verifyOtp(request.email, request.otp);
            return ResponseEntity.ok(DanpheHttpResponse.ok(Map.of(
                    "verificationToken", result.verificationToken())));
        } catch (Exception e) {
            return ResponseEntity.ok(DanpheHttpResponse.error(e.getMessage()));
        }
    }
}
