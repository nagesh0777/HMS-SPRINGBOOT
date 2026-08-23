package com.danphe.emr.controller;

import com.danphe.emr.model.DanpheHttpResponse;
import com.danphe.emr.model.Hospital;
import com.danphe.emr.model.HospitalSubscription;
import com.danphe.emr.model.User;
import com.danphe.emr.repository.EmployeeRepository;
import com.danphe.emr.repository.HospitalRepository;
import com.danphe.emr.repository.HospitalSubscriptionRepository;
import com.danphe.emr.repository.UserRepository;
import com.danphe.emr.security.SecurityUtil;
import com.danphe.emr.service.EmailOtpService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/Subscriptions")
@CrossOrigin(origins = "*", maxAge = 3600)
public class SubscriptionController {

    private static final String FREE_MONTH_PROMO = "WELCOME";

    @Autowired
    HospitalRepository hospitalRepository;

    @Autowired
    EmployeeRepository employeeRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    HospitalSubscriptionRepository subscriptionRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    @Autowired
    EmailOtpService emailOtpService;

    @Autowired
    private ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${app.razorpay.key-id:rzp_test_add_your_key}")
    private String razorpayKeyId;

    @Value("${app.razorpay.key-secret:}")
    private String razorpayKeySecret;

    @Value("${app.razorpay.mock-mode:true}")
    private boolean razorpayMockMode;

    @Value("${spring.mail.password:}")
    private String smtpPassword;

    @Value("${app.mail.from:croctechconnect@gmail.com}")
    private String senderEmail;

    @Value("${app.demo.recipient:croctechconnect@gmail.com}")
    private String demoRecipient;

    private record Plan(String code, String name, int monthlyPaise, int yearlyPaise, List<String> modules,
            String description, String bestFor, boolean aiIncluded, List<String> limits, List<String> sellingPoints) {
    }

    private static final List<Plan> PLANS = List.of(
            new Plan("STANDARD", "Standard", 199900, 1999900,
                    List.of("Dashboard", "Patients", "Appointments", "Doctor Queue", "Prescriptions", "Billing",
                            "Service Catalog", "ADT", "Beds", "Analytics", "Reports", "Notifications"),
                    "A next-gen all-in-one HMS for clinics that need comprehensive clinical, billing, ward, and bed workflows without AI and employee management.",
                    "Best for clinics and small hospitals launching serious digital operations.",
                    false,
                    List.of("Up to 3 doctors", "Up to 8 system users", "Up to 2,000 patient records",
                            "Up to 1,500 invoices per month", "1 branch / hospital", "Standard onboarding support"),
                    List.of("Fast OPD registration and search", "Doctor queue, prescriptions, and follow-ups",
                            "Billing, dues, services, and receipts", "ADT admissions, ward beds, and analytics")),
            new Plan("PREMIUM", "Premium", 499900, 4999900,
                    List.of("Dashboard", "Patients", "Appointments", "Doctor Queue", "Prescriptions", "Billing",
                            "Service Catalog", "Staff", "ADT", "Beds", "Analytics", "AI Copilot", "Reports",
                            "Notifications"),
                    "The complete next-gen AI-powered HMS with beds, admissions, analytics, employees, and owner copilot.",
                    "Best for growing clinics, nursing homes, and hospitals that want one system for long-term scale.",
                    true,
                    List.of("Up to 10 doctors", "Up to 30 staff users", "Up to 10,000 patient records",
                            "Up to 6,000 invoices per month", "Up to 2 branches / hospitals",
                            "AI copilot fair usage included", "Priority onboarding support"),
                    List.of("Everything in Standard", "ADT, ward, bed, and discharge workflows",
                            "Owner analytics, employee control, and operational visibility",
                            "AI copilot with role-based privacy controls")));

    public static class RegisterRequest {
        public String hospitalName;
        public String address;
        public String contactNumber;
        public String email;
        public String adminName;
        public String adminUsername;
        public String adminPassword;
        public String planCode;
        public String billingCycle;
        public String promoCode;
        public String emailOtpToken;
    }

    public static class VerifyPaymentRequest {
        public String razorpayOrderId;
        public String razorpayPaymentId;
        public String razorpaySignature;
    }

    public static class DemoRequest {
        public String hospitalName;
        public String contactName;
        public String phone;
        public String email;
        public String city;
        public String hospitalType;
        public String preferredPlan;
        public String preferredTime;
        public String message;
    }

    @GetMapping("/Plans")
    public ResponseEntity<?> getPlans() {
        return ResponseEntity.ok(DanpheHttpResponse.ok(PLANS.stream().map(this::toPlanMap).toList()));
    }

    @PostMapping("/RequestDemo")
    public ResponseEntity<?> requestDemo(@RequestBody DemoRequest request) {
        String validation = validateDemoRequest(request);
        if (validation != null) {
            return ResponseEntity.ok(DanpheHttpResponse.error(validation));
        }

        boolean mockMode = smtpPassword == null || smtpPassword.isBlank();
        String body = buildDemoEmailBody(request);
        if (mockMode) {
            System.out.println("Demo request mock mail to " + demoRecipient + ":\n" + body);
            return ResponseEntity.ok(DanpheHttpResponse.ok(Map.of(
                    "message", "Demo request saved in test mode. Configure SMTP to receive email alerts.",
                    "mockMode", true)));
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            System.out.println("Demo request mail sender unavailable. Lead:\n" + body);
            return ResponseEntity.ok(DanpheHttpResponse.ok(Map.of(
                    "message", "Demo request received. Mail sender is not configured.",
                    "mockMode", true)));
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(senderEmail);
        message.setTo(demoRecipient);
        message.setReplyTo(request.email.trim());
        message.setSubject("New Trikaar HMS demo request - " + request.hospitalName.trim());
        message.setText(body);
        mailSender.send(message);
        return ResponseEntity.ok(DanpheHttpResponse.ok(Map.of(
                "message", "Demo request sent. We will contact you shortly.",
                "mockMode", false)));
    }

    @PostMapping("/Register")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> registerHospital(@RequestBody RegisterRequest request) {
        String validation = validateRegistration(request);
        if (validation != null) {
            return ResponseEntity.ok(DanpheHttpResponse.error(validation));
        }

        Plan plan = getPlan(request.planCode);
        String cycle = normalizeCycle(request.billingCycle);
        boolean freeMonth = FREE_MONTH_PROMO.equalsIgnoreCase(nullToBlank(request.promoCode).trim());
        int amount = freeMonth ? 0 : amountFor(plan, cycle);

        Hospital hospital = new Hospital();
        hospital.setName(request.hospitalName.trim());
        hospital.setAddress(request.address);
        hospital.setContactNumber(request.contactNumber);
        hospital.setEmail(request.email);
        hospital.setIsActive(freeMonth);
        hospital.setSubscriptionPlan(plan.code());
        hospital.setSubscriptionStatus(freeMonth ? "active" : "payment_pending");
        hospital.setBillingCycle(cycle);
        hospital = hospitalRepository.save(hospital);

        com.danphe.emr.model.Employee adminEmp = new com.danphe.emr.model.Employee();
        String[] nameParts = splitName(request.adminName);
        adminEmp.setFirstName(nameParts[0]);
        adminEmp.setLastName(nameParts[1]);
        adminEmp.setRole("Admin");
        adminEmp.setAccessLevel("Admin");
        adminEmp.setDepartment("Administration");
        adminEmp.setPhoneNumber(request.contactNumber);
        adminEmp.setEmail(request.email);
        adminEmp.setStatus("Active");
        adminEmp.setIsActive(true);
        adminEmp.setHospitalId(hospital.getHospitalId());
        adminEmp.setUserName(request.adminUsername.trim());
        adminEmp.setAssignedModules(String.join(",", plan.modules()));
        adminEmp = employeeRepository.save(adminEmp);

        User adminUser = new User();
        adminUser.setUserName(request.adminUsername.trim());
        adminUser.setPassword(passwordEncoder.encode(request.adminPassword));
        adminUser.setEmployeeId(adminEmp.getEmployeeId());
        adminUser.setHospitalId(hospital.getHospitalId());
        adminUser.setIsActive(true);
        adminUser.setEmail(request.email);
        userRepository.save(adminUser);
        emailOtpService.consumeToken(request.emailOtpToken);

        HospitalSubscription subscription = new HospitalSubscription();
        subscription.setHospitalId(hospital.getHospitalId());
        subscription.setPlanCode(plan.code());
        subscription.setBillingCycle(cycle);
        subscription.setAmountInPaise(amount);
        subscription.setPromoCode(freeMonth ? FREE_MONTH_PROMO : null);
        subscription.setStatus(freeMonth ? "active" : "payment_pending");

        if (freeMonth) {
            LocalDateTime now = LocalDateTime.now();
            subscription.setStartsAt(now);
            subscription.setExpiresAt(now.plusMonths(1));
            subscription.setPaidAt(now);
            hospital.setSubscriptionExpiry(subscription.getExpiresAt());
            hospitalRepository.save(hospital);
            subscriptionRepository.save(subscription);

            Map<String, Object> response = baseRegistrationResponse(hospital, subscription, plan);
            response.put("promoApplied", true);
            response.put("message", "WELCOME applied. Your first month is active free.");
            return ResponseEntity.ok(DanpheHttpResponse.ok(response));
        }

        Map<String, Object> order = createRazorpayOrder(amount, hospital.getHospitalId(), plan.code());
        subscription.setRazorpayOrderId(order.get("orderId").toString());
        subscriptionRepository.save(subscription);

        Map<String, Object> response = baseRegistrationResponse(hospital, subscription, plan);
        response.put("promoApplied", false);
        response.put("payment", order);
        return ResponseEntity.ok(DanpheHttpResponse.ok(response));
    }

    @PostMapping("/VerifyPayment")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> verifyPayment(@RequestBody VerifyPaymentRequest request) {
        Optional<HospitalSubscription> opt = subscriptionRepository.findByRazorpayOrderId(request.razorpayOrderId);
        if (opt.isEmpty()) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Subscription order not found"));
        }

        HospitalSubscription subscription = opt.get();
        if (!razorpayMockMode && !isValidRazorpaySignature(request)) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Payment signature verification failed"));
        }

        Hospital hospital = hospitalRepository.findById(subscription.getHospitalId()).orElse(null);
        if (hospital == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital not found for subscription"));
        }

        activateSubscription(hospital, subscription, request.razorpayPaymentId, request.razorpaySignature);
        return ResponseEntity.ok(DanpheHttpResponse.ok(Map.of(
                "hospitalId", hospital.getHospitalId(),
                "subscriptionStatus", hospital.getSubscriptionStatus(),
                "subscriptionPlan", hospital.getSubscriptionPlan(),
                "subscriptionExpiry", hospital.getSubscriptionExpiry())));
    }

    @GetMapping("/MySubscription")
    public ResponseEntity<?> getMySubscription() {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null) {
            return ResponseEntity.ok(DanpheHttpResponse.ok(Map.of(
                    "subscriptionStatus", "active",
                    "subscriptionPlan", "PREMIUM",
                    "modules", List.of("Dashboard", "Patients", "Appointments", "Doctor Queue", "Prescriptions", "Billing", "Service Catalog", "Staff", "ADT", "Beds", "Analytics", "AI Copilot", "Reports", "Notifications"))));
        }

        Hospital hospital = hospitalRepository.findById(hospitalId).orElse(null);
        if (hospital == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital not found"));
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("hospitalId", hospital.getHospitalId());
        response.put("subscriptionStatus", "active");
        response.put("subscriptionPlan", "PREMIUM");
        response.put("billingCycle", "unlimited");
        response.put("subscriptionExpiry", null);
        response.put("modules", List.of("Dashboard", "Patients", "Appointments", "Doctor Queue", "Prescriptions", "Billing", "Service Catalog", "Staff", "ADT", "Beds", "Analytics", "AI Copilot", "Reports", "Notifications"));
        return ResponseEntity.ok(DanpheHttpResponse.ok(response));
    }

    @PostMapping("/Upgrade")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> upgradeSubscription(@RequestBody Map<String, String> request) {
        Integer hospitalId = SecurityUtil.getCurrentHospitalId();
        if (hospitalId == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Not authenticated"));
        }
        String newPlan = request.get("planCode");
        String cycle = request.get("billingCycle");

        Hospital hospital = hospitalRepository.findById(hospitalId).orElse(null);
        if (hospital == null) {
            return ResponseEntity.ok(DanpheHttpResponse.error("Hospital not found"));
        }

        Plan plan = getPlan(newPlan);
        String normCycle = normalizeCycle(cycle);
        int amount = amountFor(plan, normCycle);

        hospital.setSubscriptionPlan(plan.code());
        hospital.setSubscriptionStatus("active");
        hospital.setBillingCycle(normCycle);
        hospital.setSubscriptionExpiry(LocalDateTime.now().plusMonths(1));
        hospitalRepository.save(hospital);

        employeeRepository.findByHospitalIdAndRole(hospitalId, "Admin").stream().findFirst().ifPresent(adminEmp -> {
            adminEmp.setAssignedModules(String.join(",", plan.modules()));
            employeeRepository.save(adminEmp);
        });

        HospitalSubscription sub = new HospitalSubscription();
        sub.setHospitalId(hospitalId);
        sub.setPlanCode(plan.code());
        sub.setBillingCycle(normCycle);
        sub.setAmountInPaise(amount);
        sub.setStatus("active");
        sub.setStartsAt(LocalDateTime.now());
        sub.setExpiresAt(hospital.getSubscriptionExpiry());
        sub.setPaidAt(LocalDateTime.now());
        sub.setRazorpayPaymentId("pay_upgrade_" + System.currentTimeMillis());
        sub.setRazorpaySignature("upgrade_signature");
        subscriptionRepository.save(sub);

        return ResponseEntity.ok(DanpheHttpResponse.ok(Map.of(
                "message", "Subscription upgraded to " + plan.name() + " successfully!",
                "subscriptionPlan", plan.code(),
                "modules", plan.modules()
        )));
    }

    private String validateRegistration(RegisterRequest request) {
        if (request == null)
            return "Registration details are required";
        if (isBlank(request.hospitalName))
            return "Hospital or clinic name is required";
        if (isBlank(request.contactNumber))
            return "Contact number is required";
        if (isBlank(request.email))
            return "Email address is required";
        if (!emailOtpService.isTokenValidForEmail(request.emailOtpToken, request.email))
            return "Please verify your email OTP before checkout";
        if (isBlank(request.adminUsername) || request.adminUsername.trim().length() < 4)
            return "Admin username must be at least 4 characters";
        if (isBlank(request.adminPassword) || request.adminPassword.length() < 6)
            return "Admin password must be at least 6 characters";
        if (hospitalRepository.findByName(request.hospitalName.trim()).isPresent())
            return "Hospital name already exists";
        if (userRepository.findByUserName(request.adminUsername.trim()).isPresent())
            return "Admin username already taken";
        getPlan(request.planCode);
        normalizeCycle(request.billingCycle);
        return null;
    }

    private Plan getPlan(String code) {
        String normalized = isBlank(code) ? "STANDARD" : code.trim().toUpperCase(Locale.ROOT);
        return PLANS.stream().filter(p -> p.code().equals(normalized)).findFirst().orElse(PLANS.get(0));
    }

    private String normalizeCycle(String cycle) {
        return "yearly".equalsIgnoreCase(nullToBlank(cycle).trim()) ? "yearly" : "monthly";
    }

    private int amountFor(Plan plan, String cycle) {
        return "yearly".equals(cycle) ? plan.yearlyPaise() : plan.monthlyPaise();
    }

    private Map<String, Object> toPlanMap(Plan plan) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("code", plan.code());
        data.put("name", plan.name());
        data.put("monthlyPrice", plan.monthlyPaise() / 100);
        data.put("yearlyPrice", plan.yearlyPaise() / 100);
        data.put("modules", plan.modules());
        data.put("description", plan.description());
        data.put("bestFor", plan.bestFor());
        data.put("aiIncluded", plan.aiIncluded());
        data.put("limits", plan.limits());
        data.put("sellingPoints", plan.sellingPoints());
        return data;
    }

    private Map<String, Object> baseRegistrationResponse(Hospital hospital, HospitalSubscription subscription,
            Plan plan) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("hospitalId", hospital.getHospitalId());
        response.put("subscriptionId", subscription.getSubscriptionId());
        response.put("subscriptionStatus", subscription.getStatus());
        response.put("subscriptionPlan", plan.code());
        response.put("modules", plan.modules());
        return response;
    }

    private Map<String, Object> createRazorpayOrder(int amountInPaise, Integer hospitalId, String planCode) {
        if (razorpayMockMode || isBlank(razorpayKeySecret) || razorpayKeyId.contains("add_your_key")) {
            return Map.of(
                    "provider", "razorpay",
                    "mockMode", true,
                    "keyId", razorpayKeyId,
                    "orderId", "order_mock_" + hospitalId + "_" + System.currentTimeMillis(),
                    "amount", amountInPaise,
                    "currency", "INR");
        }

        try {
            String auth = Base64.getEncoder()
                    .encodeToString((razorpayKeyId + ":" + razorpayKeySecret).getBytes(StandardCharsets.UTF_8));
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("amount", amountInPaise);
            payload.put("currency", "INR");
            payload.put("receipt", "hms_" + hospitalId + "_" + System.currentTimeMillis());
            payload.put("notes", Map.of("hospitalId", hospitalId, "plan", planCode));

            String json = new ObjectMapper().writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.razorpay.com/v1/orders"))
                    .header("Authorization", "Basic " + auth)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new RuntimeException("Razorpay order failed: HTTP " + response.statusCode());
            }

            Map<?, ?> body = new ObjectMapper().readValue(response.body(), Map.class);
            return Map.of(
                    "provider", "razorpay",
                    "mockMode", false,
                    "keyId", razorpayKeyId,
                    "orderId", body.get("id"),
                    "amount", amountInPaise,
                    "currency", "INR");
        } catch (Exception e) {
            throw new RuntimeException("Unable to create Razorpay order: " + e.getMessage(), e);
        }
    }

    private boolean isValidRazorpaySignature(VerifyPaymentRequest request) {
        try {
            String payload = request.razorpayOrderId + "|" + request.razorpayPaymentId;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(razorpayKeySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString().equals(request.razorpaySignature);
        } catch (Exception e) {
            return false;
        }
    }

    private void activateSubscription(Hospital hospital, HospitalSubscription subscription, String paymentId,
            String signature) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiry = "yearly".equals(subscription.getBillingCycle()) ? now.plusYears(1) : now.plusMonths(1);

        subscription.setStatus("active");
        subscription.setStartsAt(now);
        subscription.setExpiresAt(expiry);
        subscription.setPaidAt(now);
        subscription.setRazorpayPaymentId(paymentId);
        subscription.setRazorpaySignature(signature);
        subscriptionRepository.save(subscription);

        hospital.setIsActive(true);
        hospital.setSubscriptionStatus("active");
        hospital.setSubscriptionPlan(subscription.getPlanCode());
        hospital.setBillingCycle(subscription.getBillingCycle());
        hospital.setSubscriptionExpiry(expiry);
        hospitalRepository.save(hospital);
    }

    private String validateDemoRequest(DemoRequest request) {
        if (request == null)
            return "Demo request details are required";
        if (isBlank(request.hospitalName))
            return "Clinic or hospital name is required";
        if (isBlank(request.contactName))
            return "Contact name is required";
        if (isBlank(request.phone))
            return "Mobile number is required";
        if (isBlank(request.email) || !request.email.trim().matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))
            return "Valid email address is required";
        return null;
    }

    private String buildDemoEmailBody(DemoRequest request) {
        return "New Trikaar HMS demo request\n\n"
                + "Hospital/Clinic: " + nullToBlank(request.hospitalName).trim() + "\n"
                + "Contact: " + nullToBlank(request.contactName).trim() + "\n"
                + "Phone: " + nullToBlank(request.phone).trim() + "\n"
                + "Email: " + nullToBlank(request.email).trim() + "\n"
                + "City: " + nullToBlank(request.city).trim() + "\n"
                + "Type: " + nullToBlank(request.hospitalType).trim() + "\n"
                + "Preferred plan: " + nullToBlank(request.preferredPlan).trim() + "\n"
                + "Preferred time: " + nullToBlank(request.preferredTime).trim() + "\n"
                + "Message: " + nullToBlank(request.message).trim() + "\n";
    }

    private String[] splitName(String value) {
        String cleaned = isBlank(value) ? "Hospital Admin" : value.trim();
        int idx = cleaned.indexOf(' ');
        if (idx < 0)
            return new String[] { cleaned, "Admin" };
        return new String[] { cleaned.substring(0, idx), cleaned.substring(idx + 1).trim() };
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String nullToBlank(String value) {
        return value == null ? "" : value;
    }
}
