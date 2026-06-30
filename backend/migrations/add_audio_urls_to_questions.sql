-- Add audio URL fields to questions table for voice-over support
-- This script is safe to run even if the columns already exist

ALTER TABLE `questions` 
ADD COLUMN IF NOT EXISTS `audio_url_en` VARCHAR(500) NULL DEFAULT NULL AFTER `text_kh`,
ADD COLUMN IF NOT EXISTS `audio_url_kh` VARCHAR(500) NULL DEFAULT NULL AFTER `audio_url_en`;
