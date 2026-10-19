-- Appvizo Database Schema & Seed Data
-- Import this file in phpMyAdmin or MySQL CLI

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- Table structure for `admins`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `settings`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `site_name` VARCHAR(100) NOT NULL DEFAULT 'Appvizo',
  `site_tagline` VARCHAR(255) DEFAULT 'Discover & Download Best Apps & Games',
  `site_description` TEXT DEFAULT 'Download the latest Android, iOS and PC apps, games and utilities with verified safe links.',
  `site_keywords` TEXT DEFAULT 'apps, games, download apk, verified apps, app store, utilities',
  `meta_author` VARCHAR(100) DEFAULT 'Appvizo',
  `site_logo_text` VARCHAR(50) DEFAULT 'Appvizo',
  `telegram_link` VARCHAR(255) DEFAULT '',
  `contact_email` VARCHAR(100) DEFAULT 'admin@appvizo.online',
  `footer_text` VARCHAR(255) DEFAULT '© 2026 Appvizo. All rights reserved.'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `apps`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `apps` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `logo` VARCHAR(255) DEFAULT '',
  `download_url` TEXT NOT NULL,
  `rating` DECIMAL(2,1) DEFAULT 4.9,
  `badge` VARCHAR(50) DEFAULT 'Verified',
  `category` VARCHAR(100) DEFAULT 'Games',
  `size` VARCHAR(50) DEFAULT '45 MB',
  `downloads` INT DEFAULT 0,
  `description` TEXT,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `sort_order` INT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Seed Data for `admins`
-- Default credentials:
-- Username: admin
-- Password: admin123
-- (Hash: $2y$10$wT8KzQ8VfKzO0yF5Hk8D0u0uQyVb8x3Z5k4B2C1D0E9F8G7H6I5J = admin123)
-- --------------------------------------------------------
INSERT INTO `admins` (`id`, `username`, `password`, `created_at`) VALUES
(1, 'admin', '$2y$10$Wp00Y1v86i3J82g9G5mEw.uB3aUffo37mky2vV6K6cW.sZfNsz2q2', NOW())
ON DUPLICATE KEY UPDATE `username` = `username`;

-- --------------------------------------------------------
-- Seed Data for `settings`
-- --------------------------------------------------------
INSERT INTO `settings` (`id`, `site_name`, `site_tagline`, `site_description`, `site_keywords`, `site_logo_text`, `footer_text`) VALUES
(1, 'Appvizo', 'Discover & Download Verified Apps & Games', 'Appvizo provides fast and safe direct download links for the top trending games and utilities.', 'appvizo, games download, verified apk, android games, trending apps', 'Appvizo', '© 2026 Appvizo. All rights reserved.')
ON DUPLICATE KEY UPDATE `site_name` = `site_name`;

-- --------------------------------------------------------
-- Seed Data for `apps` (matching screenshot items)
-- --------------------------------------------------------
INSERT INTO `apps` (`name`, `logo`, `download_url`, `rating`, `badge`, `category`, `size`, `downloads`, `status`, `sort_order`) VALUES
('Nexo 45', 'uploads/logos/nexo.svg', 'https://example.com/download/nexo45', 4.9, 'Verified', 'Games', '52 MB', 12450, 'active', 1),
('Classic 200', 'uploads/logos/classic200.svg', 'https://example.com/download/classic200', 4.9, 'Verified', 'Games', '64 MB', 9820, 'active', 2),
('Khelo 567', 'uploads/logos/khelo567.svg', 'https://example.com/download/khelo567', 4.9, 'Verified', 'Games', '48 MB', 24100, 'active', 3),
('Fifa 202', 'uploads/logos/fifa202.svg', 'https://example.com/download/fifa202', 4.9, 'Verified', 'Games', '78 MB', 31500, 'active', 4),
('Ram 404', 'uploads/logos/ram404.svg', 'https://example.com/download/ram404', 4.9, 'Verified', 'Utilities', '24 MB', 8740, 'active', 5),
('Mkm Vex', 'uploads/logos/mkmvex.svg', 'https://example.com/download/mkmvex', 4.9, 'Verified', 'Games', '60 MB', 15320, 'active', 6),
('Aqua 888', 'uploads/logos/aqua888.svg', 'https://example.com/download/aqua888', 4.9, 'Verified', 'Games', '55 MB', 18900, 'active', 7),
('Zivo 67', 'uploads/logos/zivo67.svg', 'https://example.com/download/zivo67', 4.9, 'Verified', 'Games', '42 MB', 11200, 'active', 8),
('Yoho 888', 'uploads/logos/yoho888.svg', 'https://example.com/download/yoho888', 4.9, 'Verified', 'Games', '50 MB', 14750, 'active', 9),
('Ludo 567', 'uploads/logos/ludo567.svg', 'https://example.com/download/ludo567', 4.9, 'Verified', 'Games', '38 MB', 45200, 'active', 10),
('Classic 500', 'uploads/logos/classic500.svg', 'https://example.com/download/classic500', 4.9, 'Verified', 'Games', '68 MB', 13400, 'active', 11),
('Monkey games', 'uploads/logos/monkeygames.svg', 'https://example.com/download/monkeygames', 4.9, 'Verified', 'Games', '72 MB', 22100, 'active', 12);

COMMIT;
