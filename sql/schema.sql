-- ============================================================
-- Mafia Party Game — Database Schema
-- Run this file in MySQL Workbench or phpMyAdmin to set up
-- ============================================================

CREATE DATABASE IF NOT EXISTS mafia_game
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mafia_game;

-- ============================================================
-- ROOMS TABLE
-- Stores all game rooms with their settings and state
-- ============================================================
CREATE TABLE IF NOT EXISTS rooms (
  id CHAR(36) NOT NULL PRIMARY KEY,              -- UUID
  room_code VARCHAR(6) NOT NULL,                 -- 6-char join code
  host_player_id CHAR(36) DEFAULT NULL,          -- UUID of host player
  status ENUM('waiting','in_progress','finished') NOT NULL DEFAULT 'waiting',
  current_phase ENUM('lobby','role_assignment','night','day_discussion','voting','game_over') NOT NULL DEFAULT 'lobby',
  current_round INT NOT NULL DEFAULT 0,
  pin_code VARCHAR(4) DEFAULT NULL,              -- 4-digit PIN for role checking
  settings JSON DEFAULT NULL,                    -- game settings blob
  winner ENUM('impostors','civilians') DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_room_code (room_code)
) ENGINE=InnoDB;

-- ============================================================
-- PLAYERS TABLE
-- Stores all players across all rooms
-- ============================================================
CREATE TABLE IF NOT EXISTS players (
  id CHAR(36) NOT NULL PRIMARY KEY,              -- UUID
  room_id CHAR(36) NOT NULL,                     -- FK to rooms
  session_token CHAR(36) NOT NULL,               -- for reconnection
  display_name VARCHAR(30) NOT NULL,
  avatar_index INT NOT NULL DEFAULT 0,           -- avatar selection
  role ENUM('god','civilian','impostor','doctor','police') DEFAULT NULL,
  is_alive TINYINT(1) NOT NULL DEFAULT 1,
  is_host TINYINT(1) NOT NULL DEFAULT 0,
  is_ready TINYINT(1) NOT NULL DEFAULT 0,
  is_connected TINYINT(1) NOT NULL DEFAULT 1,
  socket_id VARCHAR(40) DEFAULT NULL,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_room_id (room_id),
  INDEX idx_session_token (session_token),
  CONSTRAINT fk_players_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- GAME SESSIONS TABLE
-- One record per game played in a room
-- ============================================================
CREATE TABLE IF NOT EXISTS game_sessions (
  id CHAR(36) NOT NULL PRIMARY KEY,              -- UUID
  room_id CHAR(36) NOT NULL,                     -- FK to rooms
  total_rounds INT NOT NULL DEFAULT 0,
  winner ENUM('impostors','civilians') DEFAULT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP DEFAULT NULL,
  INDEX idx_session_room (room_id),
  CONSTRAINT fk_sessions_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- VOTES TABLE
-- Stores every vote cast during voting phases
-- ============================================================
CREATE TABLE IF NOT EXISTS votes (
  id CHAR(36) NOT NULL PRIMARY KEY,              -- UUID
  game_session_id CHAR(36) NOT NULL,             -- FK to game_sessions
  round_number INT NOT NULL,
  voter_id CHAR(36) NOT NULL,                    -- FK to players
  target_id CHAR(36) DEFAULT NULL,               -- FK to players (NULL = skip)
  is_ghost_vote TINYINT(1) NOT NULL DEFAULT 0,   -- ghost votes don't count
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vote_session (game_session_id),
  INDEX idx_vote_round (game_session_id, round_number),
  CONSTRAINT fk_votes_session FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_votes_voter FOREIGN KEY (voter_id) REFERENCES players(id) ON DELETE CASCADE,
  CONSTRAINT fk_votes_target FOREIGN KEY (target_id) REFERENCES players(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- ROUND LOGS TABLE
-- Detailed log of every round's events (night actions, deaths, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS round_logs (
  id CHAR(36) NOT NULL PRIMARY KEY,              -- UUID
  game_session_id CHAR(36) NOT NULL,             -- FK to game_sessions
  round_number INT NOT NULL,
  phase ENUM('night','day_discussion','voting') NOT NULL,
  event_type ENUM('mafia_kill','doctor_save','police_check','elimination','skip','no_death') NOT NULL,
  actor_id CHAR(36) DEFAULT NULL,                -- who performed action
  target_id CHAR(36) DEFAULT NULL,               -- who was targeted
  result VARCHAR(255) DEFAULT NULL,              -- outcome description
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_log_session (game_session_id),
  INDEX idx_log_round (game_session_id, round_number),
  CONSTRAINT fk_logs_session FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB;
