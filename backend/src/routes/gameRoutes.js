/**
 * Game REST API Routes
 */
const express = require('express');
const router = express.Router();
const GameManager = require('../game/GameManager');
const { apiResponse } = require('../utils/helpers');

// GET /api/game/:roomId/summary — Get post-game summary
router.get('/:roomId/summary', async (req, res) => {
  try {
    const summary = await GameManager.getGameSummary(req.params.roomId);
    if (!summary) return apiResponse(res, 404, null, 'No game data found');
    apiResponse(res, 200, summary);
  } catch (err) {
    console.error('[GET /game/summary]', err);
    apiResponse(res, 500, null, 'Server error');
  }
});

module.exports = router;
