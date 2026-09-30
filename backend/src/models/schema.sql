-- Campus Queue Manager — Database Schema
-- Run this once against your MySQL instance to create the schema.

CREATE DATABASE IF NOT EXISTS campus_queue_manager;
USE campus_queue_manager;

-- Students, staff, and admins all live in one table, distinguished by role.
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('student', 'staff', 'admin') NOT NULL DEFAULT 'student',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- A "service" is a queue type: certificate counter, help desk, lab equipment, etc.
CREATE TABLE services (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  name                   VARCHAR(120) NOT NULL,
  description            VARCHAR(255),
  is_active              BOOLEAN DEFAULT TRUE,
  is_paused              BOOLEAN DEFAULT FALSE,
  avg_service_time_secs  INT DEFAULT 180,   -- used by the wait-time predictor; updated as real data comes in
  created_by             INT,
  created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Which staff members handle which services (a staff member can cover more than one).
CREATE TABLE staff_service (
  staff_id   INT NOT NULL,
  service_id INT NOT NULL,
  PRIMARY KEY (staff_id, service_id),
  FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

-- Every queue join creates a token. This is the core table the whole app revolves around.
CREATE TABLE tokens (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  service_id    INT NOT NULL,
  user_id       INT NOT NULL,
  token_number  INT NOT NULL,               -- sequential per service per day
  status        ENUM('waiting', 'called', 'serving', 'completed', 'skipped', 'cancelled')
                  NOT NULL DEFAULT 'waiting',
  queued_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  called_at     TIMESTAMP NULL,
  completed_at  TIMESTAMP NULL,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index to make "what's my position in line" lookups fast.
CREATE INDEX idx_tokens_service_status ON tokens (service_id, status, queued_at);
