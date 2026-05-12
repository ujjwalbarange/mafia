/**
 * Player Model — Database operations for players
 * Uses raw mysql2 queries, no ORM
 */

const db = require('../config/database');
const { generateId } = require('../utils/helpers');

const PlayerModel = {
  /**
   * Create a new player in a room
   */
  async create({ roomId, displayName, avatarIndex = 0, isHost = false }) {
    const id = generateId();
    const sessionToken = generateId();

    await db.query(
      `INSERT INTO players (id, room_id, session_token, display_name, avatar_index, is_host) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, roomId, sessionToken, displayName, avatarIndex, isHost ? 1 : 0]
    );

    return { id, roomId, sessionToken, displayName, avatarIndex, isHost };
  },

  /**
   * Find a player by ID
   */
  async findById(id) {
    const [rows] = await db.query('SELECT * FROM players WHERE id = ?', [id]);
    return rows.length > 0 ? rows[0] : null;
  },

  /**
   * Find a player by session token (for reconnection)
   */
  async findBySessionToken(sessionToken) {
    const [rows] = await db.query('SELECT * FROM players WHERE session_token = ?', [sessionToken]);
    return rows.length > 0 ? rows[0] : null;
  },

  /**
   * Get all players in a room
   */
  async findByRoomId(roomId) {
    const [rows] = await db.query(
      'SELECT * FROM players WHERE room_id = ? ORDER BY joined_at ASC',
      [roomId]
    );
    return rows;
  },

  /**
   * Get alive players in a room
   */
  async findAliveByRoomId(roomId) {
    const [rows] = await db.query(
      'SELECT * FROM players WHERE room_id = ? AND is_alive = 1 ORDER BY joined_at ASC',
      [roomId]
    );
    return rows;
  },

  /**
   * Update player fields
   */
  async update(id, fields) {
    const allowed = ['display_name', 'avatar_index', 'role', 'is_alive', 'is_host', 'is_ready', 'is_connected', 'socket_id'];
    const setClauses = [];
    const values = [];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        setClauses.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }

    if (setClauses.length === 0) return;
    values.push(id);

    await db.query(`UPDATE players SET ${setClauses.join(', ')} WHERE id = ?`, values);
  },

  /**
   * Remove a player from the game
   */
  async delete(id) {
    await db.query('DELETE FROM players WHERE id = ?', [id]);
  },

  /**
   * Count players in a room
   */
  async countInRoom(roomId) {
    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM players WHERE room_id = ?',
      [roomId]
    );
    return rows[0].count;
  },

  /**
   * Count alive players by role in a room
   */
  async countAliveByRole(roomId) {
    const [rows] = await db.query(
      `SELECT role, COUNT(*) as count 
       FROM players 
       WHERE room_id = ? AND is_alive = 1 
       GROUP BY role`,
      [roomId]
    );
    const result = {};
    rows.forEach(row => { result[row.role] = row.count; });
    return result;
  },

  /**
   * Reset all players for a new game (keep in room)
   */
  async resetForNewGame(roomId) {
    await db.query(
      `UPDATE players SET role = NULL, is_alive = 1, is_ready = 0 WHERE room_id = ?`,
      [roomId]
    );
  }
};

module.exports = PlayerModel;
