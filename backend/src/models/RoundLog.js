/**
 * RoundLog Model — Database operations for round event logs
 */

const db = require('../config/database');
const { generateId } = require('../utils/helpers');

const RoundLogModel = {
  /**
   * Log an event for a round
   */
  async create({ gameSessionId, roundNumber, phase, eventType, actorId = null, targetId = null, result = null }) {
    const id = generateId();
    await db.query(
      `INSERT INTO round_logs (id, game_session_id, round_number, phase, event_type, actor_id, target_id, result) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, gameSessionId, roundNumber, phase, eventType, actorId, targetId, result]
    );
    return { id };
  },

  /**
   * Get all logs for a game session
   */
  async getBySession(gameSessionId) {
    const [rows] = await db.query(
      `SELECT rl.*, 
              a.display_name as actor_name, 
              t.display_name as target_name
       FROM round_logs rl
       LEFT JOIN players a ON rl.actor_id = a.id
       LEFT JOIN players t ON rl.target_id = t.id
       WHERE rl.game_session_id = ?
       ORDER BY rl.round_number ASC, rl.created_at ASC`,
      [gameSessionId]
    );
    return rows;
  },

  /**
   * Get logs for a specific round
   */
  async getByRound(gameSessionId, roundNumber) {
    const [rows] = await db.query(
      `SELECT rl.*, 
              a.display_name as actor_name, 
              t.display_name as target_name
       FROM round_logs rl
       LEFT JOIN players a ON rl.actor_id = a.id
       LEFT JOIN players t ON rl.target_id = t.id
       WHERE rl.game_session_id = ? AND rl.round_number = ?
       ORDER BY rl.created_at ASC`,
      [gameSessionId, roundNumber]
    );
    return rows;
  }
};

module.exports = RoundLogModel;
