-- HellCorp Database Schema
-- Deliberately vulnerable: no parameterized queries used by the application

CREATE DATABASE IF NOT EXISTS hellcorp;
USE hellcorp;

-- ============================================
-- USERS
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role ENUM('guest','buyer','seller','admin') DEFAULT 'buyer',
  nickname VARCHAR(255),
  bio TEXT,
  address TEXT,
  custom_js TEXT,
  custom_css TEXT,
  private_key VARCHAR(512),
  is_verified TINYINT(1) DEFAULT 0,
  balance DECIMAL(12,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- PRODUCTS
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  tier VARCHAR(20),
  price DECIMAL(12,2),
  description TEXT,
  specs JSON,
  seller_id INT,
  is_hidden TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- ORDERS
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL UNIQUE,
  user_id INT,
  total DECIMAL(12,2),
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50) DEFAULT 'XMR',
  shipping_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT,
  product_id INT,
  quantity INT DEFAULT 1,
  price DECIMAL(12,2)
) ENGINE=InnoDB;

-- ============================================
-- MESSAGING
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT,
  recipient_id INT,
  subject VARCHAR(255),
  body TEXT,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- SUPPORT & REPORTS
-- ============================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  subject VARCHAR(255),
  description TEXT,
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reporter_id INT,
  product_id INT,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- ADMIN
-- ============================================
CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT,
  title VARCHAR(255),
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admin_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(255),
  user_id INT,
  ip_address VARCHAR(100),
  user_agent TEXT,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS discount_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  formula TEXT,
  created_by INT,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- SELLER
-- ============================================
CREATE TABLE IF NOT EXISTS seller_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  seller_id INT,
  product_id INT,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS email_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  seller_id INT,
  template_name VARCHAR(255),
  template_content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- PASSWORD RESETS
-- ============================================
CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  token VARCHAR(255),
  email VARCHAR(255),
  used TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- SESSIONS (for SQLi session token extraction)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions_store (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(255),
  user_id INT,
  token VARCHAR(512),
  ip_address VARCHAR(100),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Enable LOAD_FILE and INTO OUTFILE (for SQLi exploitation)
-- These require specific MySQL server config (--secure-file-priv="")
