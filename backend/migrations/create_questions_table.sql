-- Create questions table for Question Manager
-- This script is safe to run even if the table already exists
-- It will only create the table if it doesn't exist

CREATE TABLE IF NOT EXISTS `questions` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `question_key` VARCHAR(100) NOT NULL,
  `questionnaire_type` ENUM('client', 'provider') NOT NULL DEFAULT 'client',
  `section` VARCHAR(100) NOT NULL,
  `question_type` ENUM('text', 'radio', 'checkbox', 'textarea') NOT NULL DEFAULT 'text',
  `text_en` TEXT NOT NULL,
  `text_kh` TEXT NOT NULL,
  `order` INT(11) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_question_key` (`question_key`),
  KEY `idx_questionnaire_type` (`questionnaire_type`),
  KEY `idx_section` (`section`),
  KEY `idx_order` (`order`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

