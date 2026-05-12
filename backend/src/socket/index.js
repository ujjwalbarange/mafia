/**
 * Socket.IO Event Handlers — Main entry point
 * Registers all socket event listeners
 */

const RoomModel = require('../models/Room');
const PlayerModel = require('../models/Player');
const GameManager = require('../game/GameManager');
const { sanitize, generateId } = require('../utils/helpers');
const { PHASES, NIGHT_STEPS, MIN_PLAYERS, RECONNECT_TIMEOUT } = require('../config/constants');

function initSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    /* ========== TIME SYNC ========== */
    // Clients ping this to calculate their clock offset for synchronized timers
    socket.on('server:ping', (_, callback) => {
      callback?.({ serverTime: Date.now() });
    });

    /* ========== ROOM EVENTS ========== */

    // Create a new room
    socket.on('room:create', async ({ displayName, avatarIndex }, callback) => {
      try {
        const name = sanitize(displayName);
        if (!name) return callback({ success: false, error: 'Name required' });

        const room = await RoomModel.create();
        const player = await PlayerModel.create({
          roomId: room.id, displayName: name, avatarIndex: avatarIndex || 0, isHost: true
        });
        await RoomModel.update(room.id, { host_player_id: player.id });
        await PlayerModel.update(player.id, { socket_id: socket.id });

        const state = GameManager.createGameState(room.id, room.roomCode, room.settings);
        GameManager.addPlayer(room.id, { ...player, socketId: socket.id });

        socket.join(room.id);
        socket.playerId = player.id;
        socket.roomId = room.id;

        callback({
          success: true,
          roomCode: room.roomCode,
          roomId: room.id,
          playerId: player.id,
          sessionToken: player.sessionToken,
          isHost: true
        });

        io.to(room.id).emit('room:players', GameManager.getPublicPlayers(room.id));
      } catch (err) {
        console.error('[room:create]', err);
        callback({ success: false, error: 'Failed to create room' });
      }
    });

    // Join an existing room
    socket.on('room:join', async ({ roomCode, displayName, avatarIndex }, callback) => {
      try {
        const name = sanitize(displayName);
        if (!name) return callback({ success: false, error: 'Name required' });
        if (!roomCode) return callback({ success: false, error: 'Room code required' });

        const room = await RoomModel.findByCode(roomCode.toUpperCase());
        if (!room) return callback({ success: false, error: 'Room not found' });
        if (room.status === 'finished') return callback({ success: false, error: 'Game has ended' });

        const existingPlayers = await PlayerModel.findByRoomId(room.id);
        const maxPlayers = room.settings?.maxPlayers || 10;
        if (existingPlayers.length >= maxPlayers) return callback({ success: false, error: 'Room is full' });

        // Check duplicate names
        if (existingPlayers.some(p => p.display_name.toLowerCase() === name.toLowerCase())) {
          return callback({ success: false, error: 'Name already taken' });
        }

        const player = await PlayerModel.create({
          roomId: room.id, displayName: name, avatarIndex: avatarIndex || 0, isHost: false
        });
        await PlayerModel.update(player.id, { socket_id: socket.id });

        // Ensure game state exists
        let state = GameManager.getGameState(room.id);
        if (!state) {
          state = GameManager.createGameState(room.id, room.room_code, room.settings);
          // Reload existing players into memory
          for (const ep of existingPlayers) {
            GameManager.addPlayer(room.id, { ...ep, displayName: ep.display_name, socketId: ep.socket_id });
          }
        }
        GameManager.addPlayer(room.id, { ...player, socketId: socket.id });

        socket.join(room.id);
        socket.playerId = player.id;
        socket.roomId = room.id;

        callback({
          success: true,
          roomCode: room.room_code,
          roomId: room.id,
          playerId: player.id,
          sessionToken: player.sessionToken,
          isHost: false
        });

        io.to(room.id).emit('room:players', GameManager.getPublicPlayers(room.id));
        socket.to(room.id).emit('room:player-joined', { displayName: name });
      } catch (err) {
        console.error('[room:join]', err);
        callback({ success: false, error: 'Failed to join room' });
      }
    });

    // Reconnect using session token
    socket.on('room:reconnect', async ({ sessionToken, roomId }, callback) => {
      try {
        if (!sessionToken) return callback({ success: false, error: 'No session token' });

        const player = await PlayerModel.findBySessionToken(sessionToken);
        if (!player) return callback({ success: false, error: 'Session expired' });

        const room = await RoomModel.findById(player.room_id);
        if (!room) return callback({ success: false, error: 'Room no longer exists' });

        await PlayerModel.update(player.id, { socket_id: socket.id, is_connected: 1 });

        let state = GameManager.getGameState(room.id);
        if (!state) {
          state = GameManager.createGameState(room.id, room.room_code, room.settings);
          state.phase = room.current_phase;
          state.round = room.current_round;
          state.pinCode = room.pin_code;
          const allPlayers = await PlayerModel.findByRoomId(room.id);
          for (const p of allPlayers) {
            GameManager.addPlayer(room.id, { ...p, displayName: p.display_name, socketId: p.id === player.id ? socket.id : p.socket_id });
          }
        } else {
          const memPlayer = state.players.get(player.id);
          if (memPlayer) {
            memPlayer.isConnected = true;
            memPlayer.socketId = socket.id;
          }
          // Clear disconnect timer
          const timer = state.disconnectTimers.get(player.id);
          if (timer) { clearTimeout(timer); state.disconnectTimers.delete(player.id); }
        }

        socket.join(room.id);
        socket.playerId = player.id;
        socket.roomId = room.id;

        // Cancel any scheduled room cleanup since someone reconnected
        GameManager.cancelRoomCleanup(room.id);

        const view = GameManager.getPlayerView(room.id, player.id);

        callback({ success: true, gameState: view });
        io.to(room.id).emit('room:players', GameManager.getPublicPlayers(room.id));
        socket.to(room.id).emit('room:player-reconnected', { displayName: player.display_name });
      } catch (err) {
        console.error('[room:reconnect]', err);
        callback({ success: false, error: 'Reconnection failed' });
      }
    });

    // Player ready toggle
    socket.on('player:ready', async (callback) => {
      try {
        const state = GameManager.getGameState(socket.roomId);
        if (!state) return callback?.({ success: false });
        const player = state.players.get(socket.playerId);
        if (!player) return callback?.({ success: false });

        player.isReady = !player.isReady;
        await PlayerModel.update(socket.playerId, { is_ready: player.isReady ? 1 : 0 });
        io.to(socket.roomId).emit('room:players', GameManager.getPublicPlayers(socket.roomId));
        callback?.({ success: true, isReady: player.isReady });
      } catch (err) {
        console.error('[player:ready]', err);
        callback?.({ success: false });
      }
    });

    // Kick a player (host only)
    socket.on('player:kick', async ({ targetId }, callback) => {
      try {
        const state = GameManager.getGameState(socket.roomId);
        if (!state) return callback?.({ success: false, error: 'Room not found' });
        const host = state.players.get(socket.playerId);
        if (!host?.isHost) return callback?.({ success: false, error: 'Not host' });

        const target = state.players.get(targetId);
        if (!target) return callback?.({ success: false, error: 'Player not found' });
        if (target.isHost) return callback?.({ success: false, error: 'Cannot kick yourself' });

        // Force disconnect the kicked player's socket
        if (target.socketId) {
          const targetSocket = io.sockets.sockets.get(target.socketId);
          if (targetSocket) {
            targetSocket.emit('room:kicked');
            targetSocket.leave(socket.roomId);
            targetSocket.roomId = null;
            targetSocket.playerId = null;
          }
        }

        // Remove from in-memory state
        state.players.delete(targetId);
        // Clear any disconnect timer
        const timer = state.disconnectTimers.get(targetId);
        if (timer) { clearTimeout(timer); state.disconnectTimers.delete(targetId); }

        // Remove from DB
        await PlayerModel.delete(targetId);

        io.to(socket.roomId).emit('room:players', GameManager.getPublicPlayers(socket.roomId));
        io.to(socket.roomId).emit('room:player-kicked', { displayName: target.displayName });
        callback?.({ success: true });
      } catch (err) {
        console.error('[player:kick]', err);
        callback?.({ success: false });
      }
    });

    // Update game settings (host only)
    socket.on('game:settings', async ({ settings }, callback) => {
      try {
        const state = GameManager.getGameState(socket.roomId);
        if (!state) return callback?.({ success: false, error: 'Room not found' });
        const player = state.players.get(socket.playerId);
        if (!player?.isHost) return callback?.({ success: false, error: 'Not host' });

        state.settings = { ...state.settings, ...settings };
        await RoomModel.update(socket.roomId, { settings: state.settings });
        io.to(socket.roomId).emit('game:settings-updated', state.settings);
        callback?.({ success: true });
      } catch (err) {
        console.error('[game:settings]', err);
        callback?.({ success: false });
      }
    });

    /* ========== GAME FLOW EVENTS ========== */

    // Assign roles (host only)
    socket.on('game:assign-roles', async ({ assignments }, callback) => {
      try {
        const state = GameManager.getGameState(socket.roomId);
        if (!state) return callback?.({ success: false, error: 'Room not found' });
        const player = state.players.get(socket.playerId);
        if (!player?.isHost) return callback?.({ success: false, error: 'Not host' });

        const validation = GameManager.validateRoleAssignment(socket.roomId, assignments);
        if (!validation.valid) return callback?.({ success: false, error: validation.error });

        await GameManager.applyRoleAssignment(socket.roomId, assignments);

        // Send each player their role privately
        for (const [pid, role] of Object.entries(assignments)) {
          const p = state.players.get(pid);
          if (p?.socketId) {
            io.to(p.socketId).emit('game:role-reveal', { role, pinCode: undefined });
          }
        }
        // Send host the PIN
        if (player.socketId) {
          io.to(player.socketId).emit('game:pin-code', { pinCode: state.pinCode });
        }

        io.to(socket.roomId).emit('game:phase-change', { phase: PHASES.ROLE_ASSIGNMENT });
        callback?.({ success: true, pinCode: state.pinCode });
      } catch (err) {
        console.error('[game:assign-roles]', err);
        callback?.({ success: false, error: 'Failed to assign roles' });
      }
    });

    // Verify PIN to view role
    socket.on('game:verify-pin', async ({ pin }, callback) => {
      try {
        const state = GameManager.getGameState(socket.roomId);
        if (!state) return callback?.({ success: false });
        if (pin === state.pinCode) {
          const player = state.players.get(socket.playerId);
          callback?.({ success: true, role: player?.role });
        } else {
          callback?.({ success: false, error: 'Wrong PIN' });
        }
      } catch (err) {
        callback?.({ success: false });
      }
    });

    // Start night phase (host only)
    socket.on('game:start-night', async (callback) => {
      try {
        const state = GameManager.getGameState(socket.roomId);
        if (!state) return callback?.({ success: false });
        const player = state.players.get(socket.playerId);
        if (!player?.isHost) return callback?.({ success: false, error: 'Not host' });

        await GameManager.startNightPhase(socket.roomId);
        io.to(socket.roomId).emit('game:phase-change', {
          phase: PHASES.NIGHT,
          round: state.round,
          nightStep: state.nightActions.step
        });
        callback?.({ success: true, nightStep: state.nightActions.step });
      } catch (err) {
        console.error('[game:start-night]', err);
        callback?.({ success: false });
      }
    });

    // Night action (host selects target)
    socket.on('game:night-action', async ({ step, targetId }, callback) => {
      try {
        const state = GameManager.getGameState(socket.roomId);
        if (!state) return callback?.({ success: false });
        const player = state.players.get(socket.playerId);
        if (!player?.isHost) return callback?.({ success: false, error: 'Not host' });

        const result = await GameManager.processNightAction(socket.roomId, step, targetId);
        if (!result.success) return callback?.({ success: false, error: result.error });

        // If next step is resolve, tell host
        io.to(socket.roomId).emit('game:night-step', { step: result.nextStep });
        callback?.({ success: true, nextStep: result.nextStep, policeResult: result.policeResult });
      } catch (err) {
        console.error('[game:night-action]', err);
        callback?.({ success: false });
      }
    });

    // Resolve night (host confirms)
    socket.on('game:resolve-night', async (callback) => {
      try {
        const state = GameManager.getGameState(socket.roomId);
        if (!state) return callback?.({ success: false });
        const player = state.players.get(socket.playerId);
        if (!player?.isHost) return callback?.({ success: false, error: 'Not host' });

        const result = await GameManager.resolveNight(socket.roomId);
        if (!result.success) return callback?.({ success: false, error: result.error });

        if (result.gameOver) {
          await GameManager.endGame(socket.roomId, result.winner);
          io.to(socket.roomId).emit('game:over', {
            winner: result.winner,
            players: GameManager.getPublicPlayers(socket.roomId)
          });
        } else {
          await GameManager.startDayPhase(socket.roomId);
          io.to(socket.roomId).emit('game:phase-change', {
            phase: PHASES.DAY_DISCUSSION,
            killedPlayerId: result.killedPlayerId,
            killedPlayerName: result.killedPlayerName,
            wasSaved: result.wasSaved,
            discussionDeadline: GameManager.getGameState(socket.roomId)?.discussionDeadline
          });
        }

        io.to(socket.roomId).emit('room:players', GameManager.getPublicPlayers(socket.roomId));
        callback?.({ success: true, ...result });
      } catch (err) {
        console.error('[game:resolve-night]', err);
        callback?.({ success: false });
      }
    });

    // Start voting (host only)
    socket.on('game:start-voting', async (callback) => {
      try {
        const state = GameManager.getGameState(socket.roomId);
        if (!state) return callback?.({ success: false });
        const player = state.players.get(socket.playerId);
        if (!player?.isHost) return callback?.({ success: false, error: 'Not host' });

        await GameManager.startVotingPhase(socket.roomId);
        io.to(socket.roomId).emit('game:phase-change', {
          phase: PHASES.VOTING,
          votingDeadline: state.votingDeadline
        });
        callback?.({ success: true });
      } catch (err) {
        console.error('[game:start-voting]', err);
        callback?.({ success: false });
      }
    });

    // Cast vote
    socket.on('game:vote', async ({ targetId }, callback) => {
      try {
        const result = await GameManager.castVote(socket.roomId, socket.playerId, targetId);
        if (!result.success) return callback?.({ success: false, error: result.error });

        const state = GameManager.getGameState(socket.roomId);
        // Notify room about vote count — exclude God (host) from counts
        const aliveCount = Array.from(state.players.values()).filter(p => p.isAlive && !p.isHost && p.role !== 'god').length;
        const voteCount = Array.from(state.votes.entries()).filter(([vid]) => {
          const v = state.players.get(vid);
          return v?.isAlive && !v.isHost && v.role !== 'god';
        }).length;

        io.to(socket.roomId).emit('game:vote-update', {
          voteCount,
          totalVoters: aliveCount,
          anonymous: state.settings.anonymousVoting
        });

        // Auto-resolve if all alive players voted
        if (voteCount >= aliveCount) {
          const resolveResult = await GameManager.resolveVoting(socket.roomId);
          emitVoteResult(io, socket.roomId, resolveResult);
        }

        callback?.({ success: true, isGhost: result.isGhost });
      } catch (err) {
        console.error('[game:vote]', err);
        callback?.({ success: false });
      }
    });

    // Force resolve voting (host or timer)
    socket.on('game:resolve-voting', async (callback) => {
      try {
        const state = GameManager.getGameState(socket.roomId);
        if (!state) return callback?.({ success: false });
        const player = state.players.get(socket.playerId);
        if (!player?.isHost) return callback?.({ success: false, error: 'Not host' });

        const result = await GameManager.resolveVoting(socket.roomId);
        emitVoteResult(io, socket.roomId, result);
        callback?.({ success: true });
      } catch (err) {
        console.error('[game:resolve-voting]', err);
        callback?.({ success: false });
      }
    });

    // Get game summary
    socket.on('game:get-summary', async (callback) => {
      try {
        const summary = await GameManager.getGameSummary(socket.roomId);
        callback?.({ success: true, summary });
      } catch (err) {
        callback?.({ success: false });
      }
    });

    // Play again (host resets room)
    socket.on('game:play-again', async (callback) => {
      try {
        const state = GameManager.getGameState(socket.roomId);
        if (!state) return callback?.({ success: false });
        const player = state.players.get(socket.playerId);
        if (!player?.isHost) return callback?.({ success: false, error: 'Not host' });

        await GameManager.resetForNewGame(socket.roomId);
        io.to(socket.roomId).emit('game:phase-change', { phase: PHASES.LOBBY });
        io.to(socket.roomId).emit('room:players', GameManager.getPublicPlayers(socket.roomId));
        callback?.({ success: true });
      } catch (err) {
        console.error('[game:play-again]', err);
        callback?.({ success: false });
      }
    });

    /* ========== DISCONNECT ========== */
    socket.on('disconnect', async () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      if (!socket.roomId || !socket.playerId) return;

      const state = GameManager.getGameState(socket.roomId);
      if (!state) return;

      const player = state.players.get(socket.playerId);
      if (!player) return;

      player.isConnected = false;
      await PlayerModel.update(socket.playerId, { is_connected: 0 });
      io.to(socket.roomId).emit('room:players', GameManager.getPublicPlayers(socket.roomId));
      io.to(socket.roomId).emit('room:player-disconnected', { displayName: player.displayName });

      // Set a timeout — if they don't reconnect, handle host reassignment
      const timer = setTimeout(async () => {
        const currentState = GameManager.getGameState(socket.roomId);
        if (!currentState) return;
        const p = currentState.players.get(socket.playerId);
        if (!p || p.isConnected) return;

        // If host disconnected, reassign
        if (p.isHost) {
          p.isHost = false;
          await PlayerModel.update(socket.playerId, { is_host: 0 });
          const connected = Array.from(currentState.players.values()).find(cp => cp.isConnected && cp.id !== socket.playerId);
          if (connected) {
            connected.isHost = true;
            await PlayerModel.update(connected.id, { is_host: 1 });
            await RoomModel.update(socket.roomId, { host_player_id: connected.id });
            io.to(connected.socketId).emit('room:host-assigned');
          }
          io.to(socket.roomId).emit('room:players', GameManager.getPublicPlayers(socket.roomId));
        }

        // If all disconnected, schedule DB cleanup
        const anyConnected = Array.from(currentState.players.values()).some(cp => cp.isConnected);
        if (!anyConnected) {
          // Schedule full DB purge after ROOM_CLEANUP_TIMEOUT
          GameManager.scheduleRoomCleanup(socket.roomId);
        }
      }, RECONNECT_TIMEOUT);

      state.disconnectTimers.set(socket.playerId, timer);
    });
  });
}

/** Helper to emit vote results and handle game over */
function emitVoteResult(io, roomId, result) {
  if (!result.success) return;

  if (result.gameOver) {
    GameManager.endGame(roomId, result.winner);
    io.to(roomId).emit('game:vote-result', result);
    io.to(roomId).emit('game:over', {
      winner: result.winner,
      players: GameManager.getPublicPlayers(roomId)
    });
  } else {
    io.to(roomId).emit('game:vote-result', result);
  }
  io.to(roomId).emit('room:players', GameManager.getPublicPlayers(roomId));
}

module.exports = { initSocketHandlers };
