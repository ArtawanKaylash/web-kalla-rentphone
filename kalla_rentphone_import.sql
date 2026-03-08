-- ============================================================
--  KALLA RENTPHONE — Database Schema
--  File   : kalla_rentphone.sql
--  Import : phpMyAdmin > Import > pilih file ini
--  XAMPP  : pastikan Apache & MySQL sudah Running
-- ============================================================

CREATE DATABASE IF NOT EXISTS `kalla_rentphone`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `kalla_rentphone`;

-- ─────────────────────────────────────────
--  Tabel: users
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `username`   VARCHAR(60)  NOT NULL UNIQUE,
  `password`   VARCHAR(255) NOT NULL COMMENT 'bcrypt hash',
  `full_name`  VARCHAR(120) NOT NULL,
  `role`       ENUM('Administrator','Staff') NOT NULL DEFAULT 'Staff',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- password: admin123  (bcrypt hash)
INSERT INTO `users` (`username`, `password`, `full_name`, `role`) VALUES
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator', 'Administrator');
-- CATATAN: hash di atas = "password" bawaan Laravel. Ganti dengan hash baru jika perlu.
-- Untuk "admin123": jalankan script PHP berikut:
--   echo password_hash('admin123', PASSWORD_BCRYPT);

-- ─────────────────────────────────────────
--  Tabel: phones (unit HP)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `phones` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `brand`       VARCHAR(60)  NOT NULL COMMENT 'Merek: Samsung, Apple, dll',
  `model`       VARCHAR(100) NOT NULL COMMENT 'Model: Galaxy S23, iPhone 14, dll',
  `color`       VARCHAR(60)  NOT NULL DEFAULT '',
  `storage`     SMALLINT     NOT NULL DEFAULT 0 COMMENT 'GB',
  `condition`   ENUM('Baru','Sangat Baik','Baik','Cukup') NOT NULL DEFAULT 'Baik',
  `price_day`   INT          NOT NULL DEFAULT 0 COMMENT 'Harga sewa per hari (Rp)',
  `imei`        CHAR(15)     NULL UNIQUE COMMENT '15 digit IMEI',
  `status`      ENUM('Tersedia','Disewa','Perawatan') NOT NULL DEFAULT 'Tersedia',
  `notes`       TEXT         NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_brand`  (`brand`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `phones` (`brand`,`model`,`color`,`storage`,`condition`,`price_day`,`imei`,`status`,`notes`) VALUES
('Samsung', 'Galaxy S23',    'Phantom Black', 256, 'Baru',       75000,  '123456789012345', 'Tersedia', 'Flagship terbaru'),
('Apple',   'iPhone 14',     'Midnight',      128, 'Sangat Baik',100000, '234567890123456', 'Tersedia', ''),
('Xiaomi',  'Redmi Note 12', 'Ice Blue',      128, 'Baik',       35000,  '345678901234567', 'Tersedia', 'Budget friendly');

-- ─────────────────────────────────────────
--  Tabel: customers (data pelanggan)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `customers` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(120) NOT NULL,
  `nik`        CHAR(16)     NOT NULL UNIQUE COMMENT 'NIK KTP 16 digit',
  `phone`      VARCHAR(20)  NOT NULL,
  `address`    VARCHAR(255) NULL DEFAULT '',
  `dob`        DATE         NULL COMMENT 'Tanggal lahir',
  `notes`      TEXT         NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_nik`  (`nik`),
  INDEX `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────
--  Tabel: transactions (sewa HP)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `transactions` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `tx_code`       VARCHAR(20)  NOT NULL UNIQUE COMMENT 'Kode unik misal TX1700000000',
  `customer_id`   INT          NOT NULL,
  `phone_id`      INT          NOT NULL,
  `start_date`    DATE         NOT NULL,
  `end_date`      DATE         NOT NULL,
  `days`          SMALLINT     NOT NULL DEFAULT 1,
  `price_per_day` INT          NOT NULL DEFAULT 0,
  `total_cost`    INT          NOT NULL DEFAULT 0,
  `status`        ENUM('Aktif','Selesai','Dibatalkan') NOT NULL DEFAULT 'Aktif',
  `returned_at`   DATETIME     NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_status`      (`status`),
  INDEX `idx_customer`    (`customer_id`),
  INDEX `idx_phone`       (`phone_id`),
  CONSTRAINT `fk_tx_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_tx_phone`    FOREIGN KEY (`phone_id`)    REFERENCES `phones`(`id`)    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────
--  View: v_transactions (join lengkap)
-- ─────────────────────────────────────────
CREATE OR REPLACE VIEW `v_transactions` AS
SELECT
  t.id,
  t.tx_code,
  t.customer_id,
  c.name        AS customer_name,
  c.nik         AS customer_nik,
  c.phone       AS customer_phone,
  t.phone_id,
  CONCAT(p.brand, ' ', p.model) AS phone_name,
  p.brand       AS phone_brand,
  p.model       AS phone_model,
  t.start_date,
  t.end_date,
  t.days,
  t.price_per_day,
  t.total_cost,
  t.status,
  t.returned_at,
  t.created_at
FROM `transactions` t
JOIN `customers` c ON t.customer_id = c.id
JOIN `phones`    p ON t.phone_id    = p.id;

-- ─────────────────────────────────────────
--  View: v_dashboard (statistik ringkas)
-- ─────────────────────────────────────────
CREATE OR REPLACE VIEW `v_dashboard` AS
SELECT
  (SELECT COUNT(*) FROM phones)                               AS total_phones,
  (SELECT COUNT(*) FROM phones WHERE status='Tersedia')       AS available_phones,
  (SELECT COUNT(*) FROM phones WHERE status='Disewa')         AS rented_phones,
  (SELECT COUNT(*) FROM phones WHERE status='Perawatan')      AS maintenance_phones,
  (SELECT COUNT(*) FROM customers)                            AS total_customers,
  (SELECT COUNT(*) FROM transactions)                         AS total_transactions,
  (SELECT COUNT(*) FROM transactions WHERE status='Aktif')    AS active_transactions,
  (SELECT IFNULL(SUM(total_cost),0) FROM transactions)        AS total_revenue;

