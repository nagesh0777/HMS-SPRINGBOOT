-- Adds the table backing TeamChatMessage (the Care Teams feature). This entity shipped
-- without a migration, so Hibernate's schema validation fails on any database migrated
-- through Flyway alone: `Schema-validation: missing table [team_chat_message]`, which
-- refuses to let the application start at all.

CREATE TABLE `team_chat_message` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `channel` varchar(64) NOT NULL,
  `sender_user_id` int DEFAULT NULL,
  `sender_employee_id` int DEFAULT NULL,
  `sender_name` varchar(128) NOT NULL,
  `sender_role` varchar(64) NOT NULL,
  `sender_title` varchar(128) DEFAULT NULL,
  `message` varchar(4000) NOT NULL,
  `is_urgent` bit(1) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_team_chat_hosp_chan_time` (`hospital_id`, `channel`, `created_at`),
  KEY `idx_team_chat_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
