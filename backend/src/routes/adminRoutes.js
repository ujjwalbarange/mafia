/**
 * Admin Routes — room management dashboard API
 * Protected by URL obscurity (/api/admin/adgxyz05)
 */

const express = require('express');
const router = express.Router();
const GameManager = require('../game/GameManager');
const RoomModel = require('../models/Room');
const db = require('../config/database');

/**
 * GET /api/admin/adgxyz05/rooms
 * Returns all active rooms with player info, status, cleanup timers
 */
router.get('/rooms', async (req, res) => {
  try {
    // Get in-memory active rooms
    const activeRooms = GameManager.getAdminRoomList();

    // Also get DB-only rooms (that might not be in memory)
    const [dbRooms] = await db.query(
      `SELECT r.id, r.room_code, r.status, r.current_phase, r.current_round, r.created_at, r.updated_at,
              COUNT(p.id) as total_players,
              SUM(CASE WHEN p.is_connected = 1 THEN 1 ELSE 0 END) as connected_players
       FROM rooms r
       LEFT JOIN players p ON p.room_id = r.id
       GROUP BY r.id
       ORDER BY r.created_at DESC`
    );

    // Merge: flag DB rooms that are also in memory
    const activeRoomIds = new Set(activeRooms.map(r => r.roomId));
    const dbOnlyRooms = dbRooms
      .filter(r => !activeRoomIds.has(r.id))
      .map(r => ({
        roomId: r.id,
        roomCode: r.room_code,
        phase: r.current_phase,
        round: r.current_round,
        totalPlayers: r.total_players,
        connectedCount: r.connected_players || 0,
        players: [],
        isCleanupScheduled: false,
        cleanupRemainingMs: null,
        createdAt: r.created_at,
        isDbOnly: true,  // not in memory
        dbStatus: r.status
      }));

    res.json({
      success: true,
      activeRooms,
      dbOnlyRooms,
      totalActive: activeRooms.length,
      totalDbOnly: dbOnlyRooms.length
    });
  } catch (err) {
    console.error('[Admin] GET rooms error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch rooms' });
  }
});

/**
 * DELETE /api/admin/adgxyz05/rooms
 * Deletes specified rooms and all their data (players, sessions, votes, logs)
 * Body: { roomIds: ['id1', 'id2', ...] }
 */
router.delete('/rooms', async (req, res) => {
  try {
    const { roomIds } = req.body;
    if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
      return res.status(400).json({ success: false, error: 'roomIds array required' });
    }

    const results = [];
    for (const roomId of roomIds) {
      try {
        // Cancel any cleanup timer
        GameManager.cancelRoomCleanup(roomId);
        // Remove from memory
        GameManager.removeGameState(roomId);
        // Purge from DB (CASCADE deletes players, sessions, votes, logs)
        await GameManager.purgeRoomData(roomId);
        results.push({ roomId, success: true });
      } catch (err) {
        results.push({ roomId, success: false, error: err.message });
      }
    }

    res.json({ success: true, results, deletedCount: results.filter(r => r.success).length });
  } catch (err) {
    console.error('[Admin] DELETE rooms error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete rooms' });
  }
});

module.exports = router;
