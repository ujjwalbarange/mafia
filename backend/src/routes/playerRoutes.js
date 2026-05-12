/**
 * Player REST API Routes
 */
const express = require('express');
const router = express.Router();
const PlayerModel = require('../models/Player');
const { apiResponse } = require('../utils/helpers');

// GET /api/players/session/:token — Check session validity
router.get('/session/:token', async (req, res) => {
  try {
    const player = await PlayerModel.findBySessionToken(req.params.token);
    if (!player) return apiResponse(res, 404, null, 'Session not found');
    apiResponse(res, 200, {
      playerId: player.id,
      roomId: player.room_id,
      displayName: player.display_name,
      isHost: !!player.is_host
    });
  } catch (err) {
    console.error('[GET /players/session]', err);
    apiResponse(res, 500, null, 'Server error');
  }
});

module.exports = router;
