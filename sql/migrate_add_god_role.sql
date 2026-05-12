-- ============================================================
-- Migration: Add 'god' role to players table
-- Run this if your database already has the tables created
-- ============================================================

USE mafia_game;

ALTER TABLE players
  MODIFY COLUMN role ENUM('god','civilian','impostor','doctor','police') DEFAULT NULL;
