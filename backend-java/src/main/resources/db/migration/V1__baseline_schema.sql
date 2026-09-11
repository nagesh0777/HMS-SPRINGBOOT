-- Trikaar HMS baseline schema (V1).
--
-- Generated from the JPA entities against MySQL 8, then committed as the migration of record.
-- Replaces ddl-auto=update, which issued unreviewed ALTERs against live patient data with no
-- ordering, no review and no rollback.
--
-- From here the schema changes only through numbered migrations in this directory. Hibernate
-- runs with ddl-auto=validate and refuses to start if the entities and the migrated schema have
-- drifted apart — a loud failure instead of a silent one.
--
-- Never edit this file once it has run anywhere real: Flyway checksums applied migrations and
-- will refuse to start if one changes underneath it. Add V2__describe_change.sql instead.

CREATE TABLE `admission` (
  `admitting_doctor_id` int DEFAULT NULL,
  `bed_id` int DEFAULT NULL,
  `cancelled_by` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `discharged_by` int DEFAULT NULL,
  `hospital_id` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  `patient_admission_id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int DEFAULT NULL,
  `patient_visit_id` int DEFAULT NULL,
  `admission_date` datetime(6) NOT NULL,
  `cancelled_on` datetime(6) DEFAULT NULL,
  `created_on` datetime(6) DEFAULT NULL,
  `discharge_date` datetime(6) DEFAULT NULL,
  `modified_on` datetime(6) DEFAULT NULL,
  `admission_notes` varchar(2000) DEFAULT NULL,
  `admission_orders` varchar(2000) DEFAULT NULL,
  `admission_status` varchar(255) DEFAULT NULL,
  `bill_status_on_discharge` varchar(255) DEFAULT NULL,
  `cancelled_remark` varchar(255) DEFAULT NULL,
  `care_of_person_name` varchar(255) DEFAULT NULL,
  `care_of_person_phone_no` varchar(255) DEFAULT NULL,
  `care_of_person_relation` varchar(255) DEFAULT NULL,
  `discharge_remarks` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`patient_admission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `appointment` (
  `appointment_id` int NOT NULL AUTO_INCREMENT,
  `cancelled_by` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `hospital_id` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  `patient_id` int DEFAULT NULL,
  `performer_id` int DEFAULT NULL,
  `appointment_date` datetime(6) NOT NULL,
  `cancelled_on` datetime(6) DEFAULT NULL,
  `created_on` datetime(6) DEFAULT NULL,
  `modified_on` datetime(6) DEFAULT NULL,
  `age` varchar(255) DEFAULT NULL,
  `appointment_status` varchar(255) DEFAULT NULL,
  `appointment_type` varchar(255) DEFAULT NULL,
  `cancelled_remarks` varchar(255) DEFAULT NULL,
  `contact_number` varchar(255) DEFAULT NULL,
  `first_name` varchar(255) DEFAULT NULL,
  `gender` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `middle_name` varchar(255) DEFAULT NULL,
  `patient_code` varchar(255) DEFAULT NULL,
  `performer_name` varchar(255) DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`appointment_id`),
  KEY `idx_appt_hospital` (`hospital_id`),
  KEY `idx_appt_hospital_performer` (`hospital_id`,`performer_id`),
  KEY `idx_appt_hospital_patient` (`hospital_id`,`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `attendance` (
  `attendance_id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int DEFAULT NULL,
  `hospital_id` int DEFAULT NULL,
  `timestamp` datetime(6) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`attendance_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `audit_log` (
  `hospital_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `log_id` bigint NOT NULL AUTO_INCREMENT,
  `timestamp` datetime(6) DEFAULT NULL,
  `action` varchar(255) DEFAULT NULL,
  `change_data` text,
  `description` text,
  `entity_id` varchar(255) DEFAULT NULL,
  `entity_name` varchar(255) DEFAULT NULL,
  `ip_address` varchar(255) DEFAULT NULL,
  `module` varchar(255) DEFAULT NULL,
  `severity` varchar(255) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `user_role` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`log_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `bed` (
  `bed_id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int DEFAULT NULL,
  `is_active` bit(1) DEFAULT NULL,
  `price_per_day` double DEFAULT NULL,
  `bed_number` varchar(255) DEFAULT NULL,
  `floor` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `ward` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`bed_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `billing` (
  `bill_id` int NOT NULL AUTO_INCREMENT,
  `created_by` int DEFAULT NULL,
  `discount_amount` double DEFAULT NULL,
  `discount_percent` double DEFAULT NULL,
  `grand_total` double DEFAULT NULL,
  `hospital_id` int NOT NULL,
  `paid_amount` double DEFAULT NULL,
  `patient_id` int NOT NULL,
  `subtotal` double DEFAULT NULL,
  `tax_amount` double DEFAULT NULL,
  `tax_percent` double DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `modified_at` datetime(6) DEFAULT NULL,
  `bill_items` text,
  `bill_number` varchar(255) DEFAULT NULL,
  `bill_type` varchar(255) NOT NULL,
  `payment_mode` varchar(255) DEFAULT NULL,
  `payment_status` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`bill_id`),
  UNIQUE KEY `UK_8x8y598kg4b4ysq8qc5j1r734` (`bill_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `doctor` (
  `doctor_id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int DEFAULT NULL,
  `hospital_id` int DEFAULT NULL,
  `is_active` bit(1) DEFAULT NULL,
  `consultation_qr_path` varchar(255) DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `end_time` varchar(255) DEFAULT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `phone_number` varchar(255) DEFAULT NULL,
  `photo_path` varchar(255) DEFAULT NULL,
  `prescription_templates` text,
  `qualifications` varchar(255) DEFAULT NULL,
  `registration_number` varchar(255) DEFAULT NULL,
  `specialization` varchar(255) DEFAULT NULL,
  `start_time` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`doctor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `email_otp` (
  `attempts` int DEFAULT NULL,
  `otp_id` int NOT NULL AUTO_INCREMENT,
  `consumed_at` datetime(6) DEFAULT NULL,
  `created_on` datetime(6) DEFAULT NULL,
  `expires_at` datetime(6) DEFAULT NULL,
  `verified_at` datetime(6) DEFAULT NULL,
  `code_hash` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `verification_token` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`otp_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `employee` (
  `doctor_id` int DEFAULT NULL,
  `employee_id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int DEFAULT NULL,
  `is_active` bit(1) DEFAULT NULL,
  `created_on` datetime(6) DEFAULT NULL,
  `admin_notes` varchar(1000) DEFAULT NULL,
  `access_level` varchar(255) DEFAULT NULL,
  `assigned_modules` varchar(255) DEFAULT NULL,
  `assigned_ward` varchar(255) DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL,
  `duty_days` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `first_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `phone_number` varchar(255) DEFAULT NULL,
  `photo_path` varchar(255) DEFAULT NULL,
  `role` varchar(255) DEFAULT NULL,
  `shift_timing` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `employee_log` (
  `employee_id` int DEFAULT NULL,
  `hospital_id` int DEFAULT NULL,
  `log_id` int NOT NULL AUTO_INCREMENT,
  `timestamp` datetime(6) DEFAULT NULL,
  `details` varchar(2000) DEFAULT NULL,
  `action` varchar(255) DEFAULT NULL,
  `employee_name` varchar(255) DEFAULT NULL,
  `performed_by` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`log_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `final_bill` (
  `created_by` int DEFAULT NULL,
  `discount_amount` double DEFAULT NULL,
  `discount_percent` double DEFAULT NULL,
  `final_bill_id` int NOT NULL AUTO_INCREMENT,
  `grand_total` double DEFAULT NULL,
  `hospital_id` int NOT NULL,
  `paid_amount` double DEFAULT NULL,
  `patient_id` int NOT NULL,
  `subtotal` double DEFAULT NULL,
  `tax_amount` double DEFAULT NULL,
  `tax_percent` double DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `bill_items` text,
  `bill_number` varchar(255) DEFAULT NULL,
  `payment_mode` varchar(255) DEFAULT NULL,
  `payment_status` varchar(255) DEFAULT NULL,
  `source_bill_ids` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`final_bill_id`),
  UNIQUE KEY `UK_8cserpsrcsn3r8f54uxu97sw0` (`bill_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `follow_up` (
  `appointment_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `doctor_id` int DEFAULT NULL,
  `follow_up_date` date DEFAULT NULL,
  `follow_up_id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int DEFAULT NULL,
  `patient_id` int DEFAULT NULL,
  `prescription_id` int DEFAULT NULL,
  `created_on` datetime(6) DEFAULT NULL,
  `modified_on` datetime(6) DEFAULT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `care_instructions` varchar(2000) DEFAULT NULL,
  `priority` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `treatment_plan` text,
  PRIMARY KEY (`follow_up_id`),
  KEY `idx_fu_hospital` (`hospital_id`),
  KEY `idx_fu_hospital_doctor` (`hospital_id`,`doctor_id`),
  KEY `idx_fu_hospital_status` (`hospital_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `hospital` (
  `hospital_id` int NOT NULL AUTO_INCREMENT,
  `is_active` bit(1) DEFAULT NULL,
  `created_on` datetime(6) DEFAULT NULL,
  `subscription_expiry` datetime(6) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `billing_cycle` varchar(255) DEFAULT NULL,
  `contact_number` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `logo_path` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `subscription_plan` varchar(255) DEFAULT NULL,
  `subscription_status` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`hospital_id`),
  UNIQUE KEY `UK_mg15n86jud2riqbr0ah93p7mw` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `hospital_settings` (
  `hospital_id` int NOT NULL,
  `last_bill_number` int DEFAULT NULL,
  `settings_id` int NOT NULL AUTO_INCREMENT,
  `created_on` datetime(6) DEFAULT NULL,
  `modified_on` datetime(6) DEFAULT NULL,
  `footer_text` varchar(2000) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `gst_number` varchar(255) DEFAULT NULL,
  `hospital_code` varchar(255) DEFAULT NULL,
  `hospital_name` varchar(255) DEFAULT NULL,
  `logo_path` varchar(255) DEFAULT NULL,
  `phone_number` varchar(255) DEFAULT NULL,
  `registration_number` varchar(255) DEFAULT NULL,
  `signature_image_path` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`settings_id`),
  UNIQUE KEY `UK_r9lugja1tfn7sw4d0khhn70e8` (`hospital_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `hospital_subscription` (
  `amount_in_paise` int DEFAULT NULL,
  `hospital_id` int DEFAULT NULL,
  `subscription_id` int NOT NULL AUTO_INCREMENT,
  `created_on` datetime(6) DEFAULT NULL,
  `expires_at` datetime(6) DEFAULT NULL,
  `paid_at` datetime(6) DEFAULT NULL,
  `starts_at` datetime(6) DEFAULT NULL,
  `billing_cycle` varchar(255) DEFAULT NULL,
  `currency` varchar(255) DEFAULT NULL,
  `plan_code` varchar(255) DEFAULT NULL,
  `promo_code` varchar(255) DEFAULT NULL,
  `razorpay_order_id` varchar(255) DEFAULT NULL,
  `razorpay_payment_id` varchar(255) DEFAULT NULL,
  `razorpay_signature` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`subscription_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `medical_record` (
  `appointment_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `doctor_id` int DEFAULT NULL,
  `hospital_id` int DEFAULT NULL,
  `patient_id` int DEFAULT NULL,
  `record_id` int NOT NULL AUTO_INCREMENT,
  `created_on` datetime(6) DEFAULT NULL,
  `modified_on` datetime(6) DEFAULT NULL,
  `title` varchar(500) DEFAULT NULL,
  `allergies` varchar(1000) DEFAULT NULL,
  `attachment_url` varchar(1000) DEFAULT NULL,
  `risk_flags` varchar(1000) DEFAULT NULL,
  `attachment_name` varchar(255) DEFAULT NULL,
  `description` text,
  `findings` text,
  `lab_result` varchar(255) DEFAULT NULL,
  `lab_status` varchar(255) DEFAULT NULL,
  `lab_test_name` varchar(255) DEFAULT NULL,
  `record_type` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`record_id`),
  KEY `idx_mr_hospital` (`hospital_id`),
  KEY `idx_mr_hospital_patient` (`hospital_id`,`patient_id`),
  KEY `idx_mr_hospital_type` (`hospital_id`,`record_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `notification` (
  `hospital_id` int DEFAULT NULL,
  `is_read` bit(1) DEFAULT NULL,
  `target_user_id` int DEFAULT NULL,
  `created_on` datetime(6) DEFAULT NULL,
  `notification_id` bigint NOT NULL AUTO_INCREMENT,
  `read_on` datetime(6) DEFAULT NULL,
  `message` varchar(2000) DEFAULT NULL,
  `priority` varchar(255) DEFAULT NULL,
  `related_entity_id` varchar(255) DEFAULT NULL,
  `related_module` varchar(255) DEFAULT NULL,
  `target_role` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`notification_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `patient` (
  `created_by` int DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `height` double DEFAULT NULL,
  `hospital_id` int DEFAULT NULL,
  `is_active` bit(1) DEFAULT NULL,
  `is_dob_verified` bit(1) DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  `patient_id` int NOT NULL AUTO_INCREMENT,
  `patient_no` int NOT NULL,
  `weight` double DEFAULT NULL,
  `created_on` datetime(6) DEFAULT NULL,
  `modified_on` datetime(6) DEFAULT NULL,
  `patient_code` varchar(50) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `age` varchar(255) DEFAULT NULL,
  `blood_group` varchar(255) DEFAULT NULL,
  `country_id` varchar(255) DEFAULT NULL,
  `country_sub_division_id` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `empi` varchar(255) DEFAULT NULL,
  `first_name` varchar(255) DEFAULT NULL,
  `gender` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `marital_status` varchar(255) DEFAULT NULL,
  `middle_name` varchar(255) DEFAULT NULL,
  `pan_number` varchar(255) DEFAULT NULL,
  `phone_number` varchar(255) DEFAULT NULL,
  `photo_path` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`patient_id`),
  KEY `idx_patient_hospital` (`hospital_id`),
  KEY `idx_patient_hospital_phone` (`hospital_id`,`phone_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `prescription` (
  `appointment_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `doctor_id` int DEFAULT NULL,
  `follow_up_date` date DEFAULT NULL,
  `hospital_id` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  `patient_height` double DEFAULT NULL,
  `patient_id` int DEFAULT NULL,
  `patient_weight` double DEFAULT NULL,
  `prescription_id` int NOT NULL AUTO_INCREMENT,
  `created_on` datetime(6) DEFAULT NULL,
  `modified_on` datetime(6) DEFAULT NULL,
  `follow_up_notes` varchar(500) DEFAULT NULL,
  `allergy_warnings` varchar(1000) DEFAULT NULL,
  `advice` varchar(2000) DEFAULT NULL,
  `clinical_notes` varchar(2000) DEFAULT NULL,
  `diagnosis` varchar(2000) DEFAULT NULL,
  `recommended_tests` varchar(2000) DEFAULT NULL,
  `medicines` text,
  `status` varchar(255) DEFAULT NULL,
  `template_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`prescription_id`),
  KEY `idx_rx_hospital` (`hospital_id`),
  KEY `idx_rx_hospital_doctor` (`hospital_id`,`doctor_id`),
  KEY `idx_rx_hospital_patient` (`hospital_id`,`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `rbac_user` (
  `created_by` int DEFAULT NULL,
  `employee_id` int DEFAULT NULL,
  `hospital_id` int DEFAULT NULL,
  `is_active` bit(1) DEFAULT NULL,
  `landing_page_route_id` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  `needs_password_update` bit(1) DEFAULT NULL,
  `user_id` int NOT NULL AUTO_INCREMENT,
  `created_on` datetime(6) DEFAULT NULL,
  `modified_on` datetime(6) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `user_name` varchar(255) NOT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `UK_phk1sctb7fm9kn137kcrp70ts` (`user_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `service_catalog` (
  `hospital_id` int NOT NULL,
  `is_active` bit(1) DEFAULT NULL,
  `rate` double NOT NULL,
  `service_id` int NOT NULL AUTO_INCREMENT,
  `created_on` datetime(6) DEFAULT NULL,
  `modified_on` datetime(6) DEFAULT NULL,
  `description` varchar(500) DEFAULT NULL,
  `category` varchar(255) NOT NULL,
  `department` varchar(255) DEFAULT NULL,
  `rate_type` varchar(255) DEFAULT NULL,
  `service_name` varchar(255) NOT NULL,
  `sub_category` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`service_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
