/**
 * GameSession Model — Database operations for game sessions
 */

const db = require('../config/database');
const { generateId } = require('../utils/helpers');

const GameSessionModel = {
  /**
   * Create a new game session
   */
  async create(roomId) {
    const id = generateId();
    await db.query(
      'INSERT INTO game_sessions (id, room_id) VALUES (?, ?)',
      [id, roomId]
    );
    return { id, roomId };
  },

  /**
   * Find session by ID
   */
  async findById(id) {
    const [rows] = await db.query('SELECT * FROM game_sessions WHERE id = ?', [id]);
    return rows.length > 0 ? rows[0] : null;
  },

  /**
   * Find active session for a room
   */
  async findActiveByRoomId(roomId) {
    const [rows] = await db.query(
      'SELECT * FROM game_sessions WHERE room_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1',
      [roomId]
    );
    return rows.length > 0 ? rows[0] : null;
  },

  /**
   * Update session
   */
  async update(id, fields) {
    const allowed = ['total_rounds', 'winner', 'ended_at'];
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

    await db.query(`UPDATE game_sessions SET ${setClauses.join(', ')} WHERE id = ?`, values);
  },

  /**
   * End a session
   */
  async endSession(id, winner) {
    await db.query(
      'UPDATE game_sessions SET winner = ?, ended_at = NOW() WHERE id = ?',
      [winner, id]
    );
  }
};

module.exports = GameSessionModel;
