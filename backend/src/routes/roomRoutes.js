/**
 * Room REST API Routes
 */
const express = require('express');
const router = express.Router();
const RoomModel = require('../models/Room');
const PlayerModel = require('../models/Player');
const { apiResponse } = require('../utils/helpers');

// GET /api/rooms/:code — Get room info by code
router.get('/:code', async (req, res) => {
  try {
    const room = await RoomModel.findByCode(req.params.code.toUpperCase());
    if (!room) return apiResponse(res, 404, null, 'Room not found');
    const playerCount = await PlayerModel.countInRoom(room.id);
    apiResponse(res, 200, {
      roomCode: room.room_code,
      status: room.status,
      playerCount,
      maxPlayers: room.settings?.maxPlayers || 10
    });
  } catch (err) {
    console.error('[GET /rooms/:code]', err);
    apiResponse(res, 500, null, 'Server error');
  }
});

module.exports = router;
