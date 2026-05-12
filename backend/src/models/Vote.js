/**
 * Vote Model — Database operations for votes
 */

const db = require('../config/database');
const { generateId } = require('../utils/helpers');

const VoteModel = {
  /**
   * Cast a vote
   */
  async create({ gameSessionId, roundNumber, voterId, targetId, isGhostVote = false }) {
    const id = generateId();
    await db.query(
      `INSERT INTO votes (id, game_session_id, round_number, voter_id, target_id, is_ghost_vote) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, gameSessionId, roundNumber, voterId, targetId, isGhostVote ? 1 : 0]
    );
    return { id, gameSessionId, roundNumber, voterId, targetId, isGhostVote };
  },

  /**
   * Check if a player has already voted this round
   */
  async hasVoted(gameSessionId, roundNumber, voterId) {
    const [rows] = await db.query(
      `SELECT id FROM votes WHERE game_session_id = ? AND round_number = ? AND voter_id = ? AND is_ghost_vote = 0`,
      [gameSessionId, roundNumber, voterId]
    );
    return rows.length > 0;
  },

  /**
   * Get all votes for a round
   */
  async getByRound(gameSessionId, roundNumber) {
    const [rows] = await db.query(
      `SELECT v.*, p.display_name as voter_name, t.display_name as target_name
       FROM votes v
       LEFT JOIN players p ON v.voter_id = p.id
       LEFT JOIN players t ON v.target_id = t.id
       WHERE v.game_session_id = ? AND v.round_number = ?`,
      [gameSessionId, roundNumber]
    );
    return rows;
  },

  /**
   * Tally votes for a round (non-ghost votes only)
   */
  async tallyVotes(gameSessionId, roundNumber) {
    const [rows] = await db.query(
      `SELECT target_id, COUNT(*) as vote_count
       FROM votes
       WHERE game_session_id = ? AND round_number = ? AND is_ghost_vote = 0 AND target_id IS NOT NULL
       GROUP BY target_id
       ORDER BY vote_count DESC`,
      [gameSessionId, roundNumber]
    );
    return rows;
  },

  /**
   * Get full voting history for a game session
   */
  async getHistory(gameSessionId) {
    const [rows] = await db.query(
      `SELECT v.*, p.display_name as voter_name, t.display_name as target_name
       FROM votes v
       LEFT JOIN players p ON v.voter_id = p.id
       LEFT JOIN players t ON v.target_id = t.id
       WHERE v.game_session_id = ?
       ORDER BY v.round_number ASC, v.created_at ASC`,
      [gameSessionId]
    );
    return rows;
  }
};

module.exports = VoteModel;
