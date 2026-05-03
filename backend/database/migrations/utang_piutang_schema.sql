-- ============================================================
-- UTANG PIUTANG (DEBTS & CREDITS) SCHEMA
-- Run this SQL script to create tables for debt/credit management
-- ============================================================

-- Debts Table
CREATE TABLE IF NOT EXISTS `debts` (
  `debt_id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `creditor_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nama kreditor/orang yang memberikan pinjaman',
  `total_amount` decimal(14,2) NOT NULL COMMENT 'Total hutang awal',
  `paid_amount` decimal(14,2) NOT NULL DEFAULT 0 COMMENT 'Jumlah yang sudah dibayar',
  `remaining_amount` decimal(14,2) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Sisa hutang',
  `description` text COLLATE utf8mb4_unicode_ci,
  `start_date` date NOT NULL COMMENT 'Tanggal mulai hutang',
  `due_date` date DEFAULT NULL COMMENT 'Tanggal harus lunas',
  `debt_status` enum('active','completed','paused','defaulted') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `account_id` int unsigned DEFAULT NULL COMMENT 'Akun default untuk pembayaran',
  `priority` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `color_code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '#e74c3c',
  `progress_percentage` int DEFAULT 0 COMMENT 'Progress 0-100%',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`debt_id`),
  KEY `user_id` (`user_id`),
  KEY `debt_status` (`debt_status`),
  KEY `due_date` (`due_date`),
  CONSTRAINT `debts_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `debts_account_id_foreign` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Debt Payments Table
CREATE TABLE IF NOT EXISTS `debt_payments` (
  `payment_id` int unsigned NOT NULL AUTO_INCREMENT,
  `debt_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `account_id` int unsigned NOT NULL COMMENT 'Akun mana yang digunakan untuk pembayaran',
  `payment_amount` decimal(14,2) NOT NULL,
  `payment_date` date NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `payment_method` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'cash' COMMENT 'cash, bank transfer, etc',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  KEY `debt_id` (`debt_id`),
  KEY `user_id` (`user_id`),
  KEY `payment_date` (`payment_date`),
  CONSTRAINT `debt_payments_debt_id_foreign` FOREIGN KEY (`debt_id`) REFERENCES `debts` (`debt_id`) ON DELETE CASCADE,
  CONSTRAINT `debt_payments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `debt_payments_account_id_foreign` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Credits Table
CREATE TABLE IF NOT EXISTS `credits` (
  `credit_id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `debtor_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nama orang yang berhutang',
  `total_amount` decimal(14,2) NOT NULL COMMENT 'Total piutang awal',
  `received_amount` decimal(14,2) NOT NULL DEFAULT 0 COMMENT 'Jumlah yang sudah diterima',
  `remaining_amount` decimal(14,2) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Sisa piutang',
  `description` text COLLATE utf8mb4_unicode_ci,
  `start_date` date NOT NULL COMMENT 'Tanggal mulai piutang',
  `due_date` date DEFAULT NULL COMMENT 'Tanggal harus dibayar',
  `credit_status` enum('active','completed','paused','written_off') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `account_id` int unsigned DEFAULT NULL COMMENT 'Akun penerima pembayaran default',
  `priority` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `color_code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '#27ae60',
  `progress_percentage` int DEFAULT 0 COMMENT 'Progress 0-100%',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`credit_id`),
  KEY `user_id` (`user_id`),
  KEY `credit_status` (`credit_status`),
  KEY `due_date` (`due_date`),
  CONSTRAINT `credits_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `credits_account_id_foreign` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Credit Payments Table
CREATE TABLE IF NOT EXISTS `credit_payments` (
  `payment_id` int unsigned NOT NULL AUTO_INCREMENT,
  `credit_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `account_id` int unsigned NOT NULL COMMENT 'Akun mana yang menerima pembayaran',
  `payment_amount` decimal(14,2) NOT NULL,
  `payment_date` date NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `payment_method` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'cash' COMMENT 'cash, bank transfer, etc',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  KEY `credit_id` (`credit_id`),
  KEY `user_id` (`user_id`),
  KEY `payment_date` (`payment_date`),
  CONSTRAINT `credit_payments_credit_id_foreign` FOREIGN KEY (`credit_id`) REFERENCES `credits` (`credit_id`) ON DELETE CASCADE,
  CONSTRAINT `credit_payments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `credit_payments_account_id_foreign` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
