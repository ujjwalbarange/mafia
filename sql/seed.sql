-- ============================================================
-- Mafia Party Game — Seed Data (Optional)
-- Run this after schema.sql if you want test data
-- ============================================================

USE mafia_game;

-- Insert a test room
INSERT INTO rooms (id, room_code, status, current_phase, pin_code, settings) VALUES
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'TEST01',
  'waiting',
  'lobby',
  '1234',
  JSON_OBJECT(
    'discussionTimer', 120,
    'votingTimer', 30,
    'anonymousVoting', false,
    'confirmEjects', true,
    'numImpostors', 1,
    'enableDoctor', true,
    'enablePolice', true,
    'maxPlayers', 10
  )
);

-- Insert test players
INSERT INTO players (id, room_id, session_token, display_name, avatar_index, is_host) VALUES
('p1000000-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 't1000000-0000-0000-0000-000000000001', 'HostPlayer', 0, 1),
('p1000000-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 't1000000-0000-0000-0000-000000000002', 'Player2', 1, 0),
('p1000000-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 't1000000-0000-0000-0000-000000000003', 'Player3', 2, 0),
('p1000000-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 't1000000-0000-0000-0000-000000000004', 'Player4', 3, 0);
