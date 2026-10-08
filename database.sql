-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: docai_db
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `docai_db`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `docai_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;

USE `docai_db`;

--
-- Table structure for table `binance_transactions`
--

DROP TABLE IF EXISTS `binance_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `binance_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `order_id` varchar(100) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(10) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_binance_transactions_order_id` (`order_id`),
  KEY `user_id` (`user_id`),
  KEY `ix_binance_transactions_id` (`id`),
  CONSTRAINT `binance_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `binance_transactions`
--

LOCK TABLES `binance_transactions` WRITE;
/*!40000 ALTER TABLE `binance_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `binance_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `coupon_redemptions`
--

DROP TABLE IF EXISTS `coupon_redemptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `coupon_redemptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `coupon_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `discount_applied` decimal(10,2) NOT NULL,
  `tokens_granted` int(11) NOT NULL,
  `order_type` varchar(50) DEFAULT NULL,
  `order_reference` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_coupon_redemptions_id` (`id`),
  KEY `ix_coupon_redemptions_user_id` (`user_id`),
  KEY `ix_coupon_redemptions_coupon_id` (`coupon_id`),
  CONSTRAINT `coupon_redemptions_ibfk_1` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `coupon_redemptions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `coupon_redemptions`
--

LOCK TABLES `coupon_redemptions` WRITE;
/*!40000 ALTER TABLE `coupon_redemptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `coupon_redemptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `coupons`
--

DROP TABLE IF EXISTS `coupons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `coupons` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `coupon_type` enum('discount_percent','discount_fixed','tokens') NOT NULL,
  `discount_value` decimal(10,2) NOT NULL,
  `tokens_value` int(11) NOT NULL,
  `min_purchase_amount` decimal(10,2) NOT NULL,
  `max_uses` int(11) NOT NULL,
  `current_uses` int(11) NOT NULL,
  `max_uses_per_user` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `starts_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_coupons_code` (`code`),
  KEY `ix_coupons_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `coupons`
--

LOCK TABLES `coupons` WRITE;
/*!40000 ALTER TABLE `coupons` DISABLE KEYS */;
/*!40000 ALTER TABLE `coupons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pago_movil_transactions`
--

DROP TABLE IF EXISTS `pago_movil_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pago_movil_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `reference_number` varchar(50) NOT NULL,
  `phone_number` varchar(20) NOT NULL,
  `amount_ves` decimal(10,2) NOT NULL,
  `amount_usd` decimal(10,2) NOT NULL,
  `item_type` varchar(20) NOT NULL,
  `item_id` int(11) NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `ix_pago_movil_transactions_id` (`id`),
  CONSTRAINT `pago_movil_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pago_movil_transactions`
--

LOCK TABLES `pago_movil_transactions` WRITE;
/*!40000 ALTER TABLE `pago_movil_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `pago_movil_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plans`
--

DROP TABLE IF EXISTS `plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `plans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `max_docs_per_month` int(11) DEFAULT NULL,
  `has_ai_analysis` tinyint(1) DEFAULT NULL,
  `has_watermark` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `tokens_per_month` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `ix_plans_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plans`
--

LOCK TABLES `plans` WRITE;
/*!40000 ALTER TABLE `plans` DISABLE KEYS */;
INSERT INTO `plans` VALUES (1,'free',0.00,3,0,1,'2026-04-28 21:32:11',0),(2,'pro',12.00,-1,1,0,'2026-04-28 21:32:11',0);
/*!40000 ALTER TABLE `plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `processed_documents`
--

DROP TABLE IF EXISTS `processed_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `processed_documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `original_filename` varchar(255) NOT NULL,
  `apa_version` varchar(10) NOT NULL,
  `download_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `ix_processed_documents_id` (`id`),
  CONSTRAINT `processed_documents_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `processed_documents`
--

LOCK TABLES `processed_documents` WRITE;
/*!40000 ALTER TABLE `processed_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `processed_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `push_subscriptions`
--

DROP TABLE IF EXISTS `push_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `push_subscriptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `endpoint` varchar(500) NOT NULL,
  `p256dh` varchar(255) NOT NULL,
  `auth` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `ix_push_subscriptions_id` (`id`),
  CONSTRAINT `push_subscriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `push_subscriptions`
--

LOCK TABLES `push_subscriptions` WRITE;
/*!40000 ALTER TABLE `push_subscriptions` DISABLE KEYS */;
INSERT INTO `push_subscriptions` VALUES (1,1,'https://updates.push.services.mozilla.com/wpush/v2/gAAAAABqJvEwkZKtzvuDOZL2pxydod-HCO0jeyRrdAE8wc6N3ywSGBih_WlytpinHlEMHA0Thbc3D8ddv2dwV8IcywK6sk3slB1GDZmlQwYnEFzUtnyDCdaQHpsvRPJoqoZ045eCwzxxopeHC589mWPrK2nT3dBFlzPnUoj_onolSE08uMfliVA','BJS4Ems5VJYgGamt0YFnsPYo7lQoeLszIZk3mrpL_jgk-fVD2C2Ym72jkKiFW5YGgcgl-xtvv_Zq_-KcpGQEFfk','Zxz8uqORLfqeWNzgm6egNQ','2026-06-08 16:43:30'),(2,1,'https://updates.push.services.mozilla.com/wpush/v2/gAAAAABqxpZi7r1f_A8dUNSukl2jftc0vXF1yRTUO2BuQt7fUc1UX0ub-PDvW0vkeZSIim5T5BltOeHfqqm4JR-ES2vPWxSrLGUGw_tQ4oKvBPpIS2KuEqrJ3TnMXvbQXKQ39zgO6S9sTXXQZNbDMPs4lJshz40gqpUXtl0YrX3r2ssACGaB16I','BI15owTFIuCVRO7YYODoIknZA3JycoMsibFLATbvuQUbwFaZFSbmZKAVD3Nt0SLYqnDXxK31VkeKZp7LYFe988c','uQvWrcGzmLJftV1EZNBSQw','2026-10-07 18:58:42');
/*!40000 ALTER TABLE `push_subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `referrals`
--

DROP TABLE IF EXISTS `referrals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `referrals` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `referrer_id` int(11) NOT NULL,
  `referred_id` int(11) NOT NULL,
  `reward_granted` tinyint(1) NOT NULL,
  `reward_tokens` int(11) NOT NULL,
  `rewarded_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_referrals_referred_id` (`referred_id`),
  KEY `ix_referrals_referrer_id` (`referrer_id`),
  KEY `ix_referrals_id` (`id`),
  CONSTRAINT `referrals_ibfk_1` FOREIGN KEY (`referrer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `referrals_ibfk_2` FOREIGN KEY (`referred_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `referrals`
--

LOCK TABLES `referrals` WRITE;
/*!40000 ALTER TABLE `referrals` DISABLE KEYS */;
/*!40000 ALTER TABLE `referrals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscriptions`
--

DROP TABLE IF EXISTS `subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `subscriptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `paypal_order_id` varchar(100) NOT NULL,
  `months_paid` int(11) NOT NULL,
  `tokens_per_month` int(11) NOT NULL,
  `started_at` datetime NOT NULL,
  `ends_at` datetime NOT NULL,
  `status` enum('active','expired','cancelled') DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `ix_subscriptions_id` (`id`),
  CONSTRAINT `subscriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscriptions`
--

LOCK TABLES `subscriptions` WRITE;
/*!40000 ALTER TABLE `subscriptions` DISABLE KEYS */;
INSERT INTO `subscriptions` VALUES (1,1,'27B82891PC2743804',12,10000,'2026-04-29 17:00:09','2027-04-29 17:00:09','active','2026-04-29 17:00:09');
/*!40000 ALTER TABLE `subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `token_balance`
--

DROP TABLE IF EXISTS `token_balance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `token_balance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `monthly_tokens` int(11) DEFAULT NULL,
  `extra_tokens` int(11) DEFAULT NULL,
  `last_reset_at` datetime DEFAULT NULL,
  `next_reset_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `ix_token_balance_id` (`id`),
  CONSTRAINT `token_balance_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `token_balance`
--

LOCK TABLES `token_balance` WRITE;
/*!40000 ALTER TABLE `token_balance` DISABLE KEYS */;
INSERT INTO `token_balance` VALUES (1,1,9447,100462,'2026-10-07 18:58:28','2026-11-07 18:58:28'),(2,2,0,0,NULL,NULL);
/*!40000 ALTER TABLE `token_balance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `token_packs`
--

DROP TABLE IF EXISTS `token_packs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `token_packs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `tokens` int(11) NOT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_token_packs_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `token_packs`
--

LOCK TABLES `token_packs` WRITE;
/*!40000 ALTER TABLE `token_packs` DISABLE KEYS */;
INSERT INTO `token_packs` VALUES (1,'Starter Pack',3.00,200,1),(2,'Standard Pack',6.00,500,1),(3,'Power Pack',10.00,1000,1);
/*!40000 ALTER TABLE `token_packs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `token_transactions`
--

DROP TABLE IF EXISTS `token_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `token_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `tokens_consumed` int(11) NOT NULL,
  `document_name` varchar(255) DEFAULT NULL,
  `source` enum('monthly','extra') NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `deepseek_prompt_tokens` int(11) DEFAULT 0,
  `deepseek_completion_tokens` int(11) DEFAULT 0,
  `deepseek_total_tokens` int(11) DEFAULT 0,
  `total_paragraphs` int(11) DEFAULT 0,
  `total_words` int(11) DEFAULT 0,
  `model_used` varchar(50) DEFAULT NULL,
  `estimated_cost_usd` decimal(10,6) DEFAULT 0.000000,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `ix_token_transactions_id` (`id`),
  CONSTRAINT `token_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `token_transactions`
--

LOCK TABLES `token_transactions` WRITE;
/*!40000 ALTER TABLE `token_transactions` DISABLE KEYS */;
INSERT INTO `token_transactions` VALUES (1,1,6,'Prueba 1.docx','monthly','2026-05-26 21:00:24',0,0,0,0,0,NULL,0.000000),(2,1,6,'Prueba 1.docx','monthly','2026-05-26 21:08:24',0,0,0,0,0,NULL,0.000000),(3,1,6,'Prueba 1.docx','extra','2026-05-26 21:20:02',0,0,0,0,0,NULL,0.000000),(4,1,11,'Prueba 1.docx','extra','2026-05-26 21:24:09',0,0,0,0,0,NULL,0.000000),(5,1,21,'Tesis - Bryan Moreno.docx','extra','2026-05-26 21:31:17',0,0,0,0,0,NULL,0.000000),(6,1,5,'certificado-1711043119513.docx','monthly','2026-06-03 23:57:55',0,0,0,0,0,NULL,0.000000),(7,1,5,'no-__.docx','monthly','2026-06-03 23:59:30',0,0,0,0,0,NULL,0.000000),(8,1,1,'Estudiar_-_Metodologia_Expo.docx','monthly','2026-06-04 17:42:03',0,0,0,0,0,NULL,0.000000),(9,1,1,'Estudiar_-_Metodologia_Expo.docx','monthly','2026-06-04 17:43:14',0,0,0,0,0,NULL,0.000000),(10,1,23,'Estudiar_-_Metodologia_Expo.docx','monthly','2026-06-04 17:46:03',0,0,0,0,0,NULL,0.000000),(11,1,23,'Estudiar_-_Metodologia_Expo.docx','monthly','2026-06-04 17:48:08',0,0,0,0,0,NULL,0.000000),(12,1,23,'Estudiar_-_Metodologia_Expo.docx','monthly','2026-06-04 17:57:36',0,0,0,0,0,NULL,0.000000),(13,1,23,'Estudiar_-_Metodologia_Expo.docx','monthly','2026-06-04 18:15:19',0,0,0,0,0,NULL,0.000000),(14,1,23,'Estudiar_-_Metodologia_Expo.docx','monthly','2026-06-04 18:17:59',0,0,0,0,0,NULL,0.000000),(15,1,23,'Estudiar_-_Metodologia_Expo.docx','monthly','2026-06-07 17:08:22',0,0,0,0,0,NULL,0.000000),(16,1,23,'Estudiar_-_Metodologia_Expo.docx','monthly','2026-06-07 17:10:19',0,0,0,0,0,NULL,0.000000),(17,1,18,'Estudiar_-_Metodologia_Expo.docx','monthly','2026-06-07 17:11:00',0,0,0,0,0,NULL,0.000000),(18,1,246,'Tesis_-_Bryan_Moreno.docx','monthly','2026-10-07 19:36:17',22260,2248,24508,368,14876,'deepseek-chat',0.003746),(19,1,307,'Tesis_-_Bryan_Moreno.docx','monthly','2026-10-07 20:08:28',27311,3337,30648,550,16880,'deepseek-chat',0.004758),(20,1,0,'Cup├│n canjeado: TESTPROMO (+500 tokens)','extra','2026-10-08 15:53:01',0,0,0,0,0,NULL,0.000000);
/*!40000 ALTER TABLE `token_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_sessions`
--

DROP TABLE IF EXISTS `user_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token` varchar(500) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `ix_user_sessions_id` (`id`),
  CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_sessions`
--

LOCK TABLES `user_sessions` WRITE;
/*!40000 ALTER TABLE `user_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_usage`
--

DROP TABLE IF EXISTS `user_usage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_usage` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `month_year` varchar(7) NOT NULL,
  `docs_count` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `ix_user_usage_id` (`id`),
  CONSTRAINT `user_usage_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_usage`
--

LOCK TABLES `user_usage` WRITE;
/*!40000 ALTER TABLE `user_usage` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_usage` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `plan_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `country` varchar(100) DEFAULT NULL,
  `is_email_verified` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `last_login_at` datetime DEFAULT NULL,
  `last_login_ip` varchar(45) DEFAULT NULL,
  `failed_login_attempts` int(11) DEFAULT 0,
  `account_locked_until` datetime DEFAULT NULL,
  `is_admin` tinyint(1) DEFAULT 0,
  `password_setup_required` tinyint(1) DEFAULT 0,
  `referral_code` varchar(30) DEFAULT NULL,
  `referred_by_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_users_email` (`email`),
  UNIQUE KEY `idx_unique_users_phone` (`phone`),
  UNIQUE KEY `idx_unique_referral_code` (`referral_code`),
  KEY `plan_id` (`plan_id`),
  KEY `ix_users_id` (`id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Bryan','Moreno','bryanalfredoxd@gmail.com','+584242438916','$2b$12$.gcsZnOKkR8jqBLkQu3Gx./oOLJKl0jk4pwIso1ma3rW5LKBq/cYC',2,'2026-04-28 21:37:16','2026-10-08 15:46:55',NULL,0,1,'2026-10-07 20:09:40',NULL,0,NULL,1,0,'DOC-KVER8A',NULL),(2,'klk','klk','prueba@gmail.com','+584242438917','$2b$12$AWU.NYM6EjPEen9rbeNQXOOvg47wZyozNO8ukLWsIfw95q0fRV2Wi',1,'2026-06-03 23:49:44','2026-10-08 15:46:55','VE',0,1,'2026-10-07 18:57:11',NULL,0,NULL,0,0,'DOC-HBSZQ5',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-08 12:10:49
