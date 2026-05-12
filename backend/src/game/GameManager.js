/**
 * GameManager — In-memory game state management
 * 
 * This is the core game engine. It keeps active game states in memory
 * for fast access, and persists to MySQL for durability.
 * 
 * The server is AUTHORITATIVE — all game logic runs here.
 * Client state is derived from server broadcasts.
 */

const RoomModel = require('../models/Room');
const PlayerModel = require('../models/Player');
const GameSessionModel = require('../models/GameSession');
const VoteModel = require('../models/Vote');
const RoundLogModel = require('../models/RoundLog');
const { generatePin } = require('../utils/helpers');
const { PHASES, ROLES, ROOM_STATUS, NIGHT_STEPS, EVENT_TYPES, DEFAULT_SETTINGS, MIN_PLAYERS } = require('../config/constants');

// In-memory store for active game states
const activeGames = new Map();

/**
 * Get or create an in-memory game state for a room
 */
function getGameState(roomId) {
  return activeGames.get(roomId) || null;
}

/**
 * Initialize a game state in memory when a room is created
 */
function createGameState(roomId, roomCode, settings = DEFAULT_SETTINGS) {
  const state = {
    roomId,
    roomCode,
    phase: PHASES.LOBBY,
    round: 0,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    players: new Map(),          // playerId -> player data
    sessionId: null,             // current game session ID
    pinCode: null,

    // Night phase tracking
    nightActions: {
      step: null,                // current night sub-step
      mafiaTarget: null,         // player ID targeted by mafia
      doctorSave: null,          // player ID protected by doctor
      policeCheck: null,         // player ID investigated by police
      policeResult: null         // result of police investigation
    },

    // Voting phase tracking
    votes: new Map(),            // voterId -> targetId
    votingDeadline: null,

    // Discussion timer
    discussionDeadline: null,

    // Timers (setTimeout references)
    timerRef: null,

    // Disconnection tracking
    disconnectTimers: new Map()  // playerId -> setTimeout ref
  };

  activeGames.set(roomId, state);
  return state;
}

/**
 * Remove a game state from memory
 */
function removeGameState(roomId) {
  const state = activeGames.get(roomId);
  if (state) {
    if (state.timerRef) clearTimeout(state.timerRef);
    state.disconnectTimers.forEach(timer => clearTimeout(timer));
    activeGames.delete(roomId);
  }
}

/**
 * Add a player to the in-memory game state
 */
function addPlayer(roomId, playerData) {
  const state = getGameState(roomId);
  if (!state) return null;

  state.players.set(playerData.id, {
    id: playerData.id,
    displayName: playerData.displayName || playerData.display_name,
    avatarIndex: playerData.avatarIndex || playerData.avatar_index || 0,
    role: playerData.role || null,
    isAlive: playerData.is_alive !== undefined ? !!playerData.is_alive : true,
    isHost: playerData.is_host !== undefined ? !!playerData.is_host : playerData.isHost || false,
    isReady: playerData.is_ready !== undefined ? !!playerData.is_ready : false,
    isConnected: true,
    socketId: playerData.socketId || null,
    sessionToken: playerData.sessionToken || playerData.session_token
  });

  return state.players.get(playerData.id);
}

/**
 * Get public player data (safe to send to clients — NO role info)
 */
function getPublicPlayers(roomId) {
  const state = getGameState(roomId);
  if (!state) return [];

  return Array.from(state.players.values()).map(p => ({
    id: p.id,
    displayName: p.displayName,
    avatarIndex: p.avatarIndex,
    isAlive: p.isAlive,
    isHost: p.isHost,
    isReady: p.isReady,
    isConnected: p.isConnected,
    // Role is only included during game_over
    role: state.phase === PHASES.GAME_OVER ? p.role : undefined
  }));
}

/**
 * Get the state data safe for sending to a specific player
 */
function getPlayerView(roomId, playerId) {
  const state = getGameState(roomId);
  if (!state) return null;

  const player = state.players.get(playerId);
  if (!player) return null;

  return {
    roomId: state.roomId,
    roomCode: state.roomCode,
    phase: state.phase,
    round: state.round,
    settings: state.settings,
    players: getPublicPlayers(roomId),
    myRole: player.role,
    myId: playerId,
    isHost: player.isHost,
    isAlive: player.isAlive,
    nightStep: player.isHost ? state.nightActions.step : undefined,
    discussionDeadline: state.discussionDeadline,
    votingDeadline: state.votingDeadline,
    pinCode: player.isHost ? state.pinCode : undefined,
    // Host sees police check results
    policeResult: player.isHost ? state.nightActions.policeResult : undefined
  };
}

/**
 * Assign roles to players
 * Host manually assigns roles, but this validates the assignment
 */
function validateRoleAssignment(roomId, assignments) {
  const state = getGameState(roomId);
  if (!state) return { valid: false, error: 'Room not found' };

  const players = Array.from(state.players.values());
  const playerIds = players.map(p => p.id);

  // Check all assigned player IDs exist
  for (const [playerId] of Object.entries(assignments)) {
    if (!playerIds.includes(playerId)) {
      return { valid: false, error: `Player ${playerId} not in room` };
    }
  }

  // Count roles
  const roleCounts = {};
  for (const role of Object.values(assignments)) {
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  }

  // Validate impostor count
  if ((roleCounts[ROLES.IMPOSTOR] || 0) < 1) {
    return { valid: false, error: 'At least 1 impostor required' };
  }
  if ((roleCounts[ROLES.IMPOSTOR] || 0) > state.settings.numImpostors) {
    return { valid: false, error: `Max ${state.settings.numImpostors} impostors allowed` };
  }

  // Doctor check
  if (!state.settings.enableDoctor && (roleCounts[ROLES.DOCTOR] || 0) > 0) {
    return { valid: false, error: 'Doctor role is disabled' };
  }
  if ((roleCounts[ROLES.DOCTOR] || 0) > 1) {
    return { valid: false, error: 'Only 1 doctor allowed' };
  }

  // Police check
  if (!state.settings.enablePolice && (roleCounts[ROLES.POLICE] || 0) > 0) {
    return { valid: false, error: 'Police role is disabled' };
  }
  if ((roleCounts[ROLES.POLICE] || 0) > 1) {
    return { valid: false, error: 'Only 1 police allowed' };
  }

  return { valid: true };
}

/**
 * Apply role assignments to the game state and DB
 */
async function applyRoleAssignment(roomId, assignments) {
  const state = getGameState(roomId);
  if (!state) return false;

  // Apply to in-memory state
  for (const [playerId, role] of Object.entries(assignments)) {
    const player = state.players.get(playerId);
    if (player) {
      player.role = role;
      // Persist to DB
      await PlayerModel.update(playerId, { role });
    }
  }

  // Generate new PIN for this game
  state.pinCode = generatePin();
  await RoomModel.update(roomId, { pin_code: state.pinCode });

  // Create game session
  const session = await GameSessionModel.create(roomId);
  state.sessionId = session.id;

  // Update phase
  state.phase = PHASES.ROLE_ASSIGNMENT;
  await RoomModel.update(roomId, {
    current_phase: PHASES.ROLE_ASSIGNMENT,
    status: ROOM_STATUS.IN_PROGRESS
  });

  return true;
}

/**
 * Start the night phase
 */
async function startNightPhase(roomId) {
  const state = getGameState(roomId);
  if (!state) return false;

  state.round += 1;
  state.phase = PHASES.NIGHT;
  state.nightActions = {
    step: NIGHT_STEPS.MAFIA_WAKE,
    mafiaTarget: null,
    doctorSave: null,
    policeCheck: null,
    policeResult: null
  };

  await RoomModel.update(roomId, {
    current_phase: PHASES.NIGHT,
    current_round: state.round
  });

  return true;
}

/**
 * Process a night action from the host
 */
async function processNightAction(roomId, step, targetId) {
  const state = getGameState(roomId);
  if (!state || state.phase !== PHASES.NIGHT) return { success: false, error: 'Not in night phase' };

  const targetPlayer = targetId ? state.players.get(targetId) : null;

  switch (step) {
    case NIGHT_STEPS.MAFIA_WAKE:
      state.nightActions.mafiaTarget = targetId;
      // Move to next step
      if (state.settings.enableDoctor) {
        state.nightActions.step = NIGHT_STEPS.DOCTOR_WAKE;
      } else if (state.settings.enablePolice) {
        state.nightActions.step = NIGHT_STEPS.POLICE_WAKE;
      } else {
        state.nightActions.step = NIGHT_STEPS.RESOLVE;
      }
      break;

    case NIGHT_STEPS.DOCTOR_WAKE:
      state.nightActions.doctorSave = targetId;
      if (state.settings.enablePolice) {
        state.nightActions.step = NIGHT_STEPS.POLICE_WAKE;
      } else {
        state.nightActions.step = NIGHT_STEPS.RESOLVE;
      }
      break;

    case NIGHT_STEPS.POLICE_WAKE:
      state.nightActions.policeCheck = targetId;
      if (targetPlayer) {
        state.nightActions.policeResult = {
          playerId: targetId,
          playerName: targetPlayer.displayName,
          isImpostor: targetPlayer.role === ROLES.IMPOSTOR
        };
      }
      state.nightActions.step = NIGHT_STEPS.RESOLVE;
      break;

    default:
      return { success: false, error: 'Invalid night step' };
  }

  return { success: true, nextStep: state.nightActions.step, policeResult: state.nightActions.policeResult };
}

/**
 * Resolve the night phase — determine who dies
 */
async function resolveNight(roomId) {
  const state = getGameState(roomId);
  if (!state || state.nightActions.step !== NIGHT_STEPS.RESOLVE) {
    return { success: false, error: 'Night not ready to resolve' };
  }

  const { mafiaTarget, doctorSave } = state.nightActions;
  let killedPlayerId = null;
  let wasSaved = false;

  if (mafiaTarget) {
    if (mafiaTarget === doctorSave) {
      // Doctor saved the target!
      wasSaved = true;
      // Log the save
      await RoundLogModel.create({
        gameSessionId: state.sessionId,
        roundNumber: state.round,
        phase: 'night',
        eventType: EVENT_TYPES.DOCTOR_SAVE,
        targetId: mafiaTarget,
        result: 'Player was saved by the doctor'
      });
      await RoundLogModel.create({
        gameSessionId: state.sessionId,
        roundNumber: state.round,
        phase: 'night',
        eventType: EVENT_TYPES.NO_DEATH,
        result: 'No one died this night'
      });
    } else {
      // Player dies
      killedPlayerId = mafiaTarget;
      const killedPlayer = state.players.get(killedPlayerId);
      if (killedPlayer) {
        killedPlayer.isAlive = false;
        await PlayerModel.update(killedPlayerId, { is_alive: 0 });
      }
      // Log the kill
      await RoundLogModel.create({
        gameSessionId: state.sessionId,
        roundNumber: state.round,
        phase: 'night',
        eventType: EVENT_TYPES.MAFIA_KILL,
        targetId: mafiaTarget,
        result: `${killedPlayer?.displayName || 'Unknown'} was killed by the mafia`
      });
    }
  } else {
    // No target selected
    await RoundLogModel.create({
      gameSessionId: state.sessionId,
      roundNumber: state.round,
      phase: 'night',
      eventType: EVENT_TYPES.NO_DEATH,
      result: 'Mafia did not kill anyone'
    });
  }

  // Log police check
  if (state.nightActions.policeCheck) {
    await RoundLogModel.create({
      gameSessionId: state.sessionId,
      roundNumber: state.round,
      phase: 'night',
      eventType: EVENT_TYPES.POLICE_CHECK,
      targetId: state.nightActions.policeCheck,
      result: state.nightActions.policeResult?.isImpostor ? 'Target is an impostor' : 'Target is not an impostor'
    });
  }

  // Check win conditions
  const winCheck = checkWinCondition(roomId);

  return {
    success: true,
    killedPlayerId,
    killedPlayerName: killedPlayerId ? state.players.get(killedPlayerId)?.displayName : null,
    wasSaved,
    gameOver: winCheck.gameOver,
    winner: winCheck.winner
  };
}

/**
 * Start the day/discussion phase
 */
async function startDayPhase(roomId) {
  const state = getGameState(roomId);
  if (!state) return false;

  state.phase = PHASES.DAY_DISCUSSION;
  state.discussionDeadline = Date.now() + (state.settings.discussionTimer * 1000);

  await RoomModel.update(roomId, { current_phase: PHASES.DAY_DISCUSSION });
  return true;
}

/**
 * Start the voting phase
 */
async function startVotingPhase(roomId) {
  const state = getGameState(roomId);
  if (!state) return false;

  state.phase = PHASES.VOTING;
  state.votes = new Map();
  state.votingDeadline = Date.now() + (state.settings.votingTimer * 1000);

  await RoomModel.update(roomId, { current_phase: PHASES.VOTING });
  return true;
}

/**
 * Cast a vote
 */
async function castVote(roomId, voterId, targetId) {
  const state = getGameState(roomId);
  if (!state || state.phase !== PHASES.VOTING) {
    return { success: false, error: 'Not in voting phase' };
  }

  const voter = state.players.get(voterId);
  if (!voter) return { success: false, error: 'Player not found' };

  // Ghost votes don't count but are allowed
  const isGhost = !voter.isAlive;

  // Check for duplicate vote (alive players only)
  if (!isGhost && state.votes.has(voterId)) {
    return { success: false, error: 'Already voted' };
  }

  // Store in memory
  state.votes.set(voterId, targetId);

  // Persist to DB
  await VoteModel.create({
    gameSessionId: state.sessionId,
    roundNumber: state.round,
    voterId,
    targetId,
    isGhostVote: isGhost
  });

  return { success: true, isGhost };
}

/**
 * Tally votes and determine elimination
 */
async function resolveVoting(roomId) {
  const state = getGameState(roomId);
  if (!state) return { success: false, error: 'Room not found' };

  // Count only alive player votes
  const tally = new Map();
  let skipCount = 0;

  for (const [voterId, targetId] of state.votes.entries()) {
    const voter = state.players.get(voterId);
    if (!voter || !voter.isAlive) continue; // Ghost votes don't count

    if (!targetId) {
      skipCount++;
      continue;
    }

    tally.set(targetId, (tally.get(targetId) || 0) + 1);
  }

  // Find the player(s) with the most votes
  let maxVotes = 0;
  let eliminatedId = null;
  let isTie = false;

  for (const [playerId, count] of tally.entries()) {
    if (count > maxVotes) {
      maxVotes = count;
      eliminatedId = playerId;
      isTie = false;
    } else if (count === maxVotes) {
      isTie = true;
    }
  }

  // If skip count >= max votes, no elimination
  if (skipCount >= maxVotes) {
    eliminatedId = null;
    isTie = false;
  }

  let eliminatedPlayer = null;
  let wasImpostor = false;

  if (eliminatedId && !isTie) {
    eliminatedPlayer = state.players.get(eliminatedId);
    if (eliminatedPlayer) {
      wasImpostor = eliminatedPlayer.role === ROLES.IMPOSTOR;
      eliminatedPlayer.isAlive = false;
      await PlayerModel.update(eliminatedId, { is_alive: 0 });

      await RoundLogModel.create({
        gameSessionId: state.sessionId,
        roundNumber: state.round,
        phase: 'voting',
        eventType: EVENT_TYPES.ELIMINATION,
        targetId: eliminatedId,
        result: `${eliminatedPlayer.displayName} was eliminated by vote`
      });
    }
  } else {
    await RoundLogModel.create({
      gameSessionId: state.sessionId,
      roundNumber: state.round,
      phase: 'voting',
      eventType: EVENT_TYPES.SKIP,
      result: isTie ? 'Vote was tied, no one eliminated' : 'Vote was skipped'
    });
  }

  // Build vote results
  const voteResults = {};
  for (const [voterId, targetId] of state.votes.entries()) {
    const voter = state.players.get(voterId);
    if (!voter) continue;
    voteResults[voterId] = {
      voterName: voter.displayName,
      targetId,
      targetName: targetId ? state.players.get(targetId)?.displayName : 'Skip',
      isGhost: !voter.isAlive
    };
  }

  // Check win
  const winCheck = checkWinCondition(roomId);

  return {
    success: true,
    eliminatedId,
    eliminatedName: eliminatedPlayer?.displayName || null,
    wasImpostor,
    isTie,
    voteResults,
    showRole: state.settings.confirmEjects,
    gameOver: winCheck.gameOver,
    winner: winCheck.winner
  };
}

/**
 * Check if the game has ended
 * Impostors win when impostors >= non-impostors alive
 * Civilians win when all impostors are eliminated
 */
function checkWinCondition(roomId) {
  const state = getGameState(roomId);
  if (!state) return { gameOver: false };

  const alivePlayers = Array.from(state.players.values()).filter(p => p.isAlive);
  const aliveImpostors = alivePlayers.filter(p => p.role === ROLES.IMPOSTOR);
  const aliveCivilians = alivePlayers.filter(p => p.role !== ROLES.IMPOSTOR);

  if (aliveImpostors.length === 0) {
    return { gameOver: true, winner: 'civilians' };
  }

  if (aliveImpostors.length >= aliveCivilians.length) {
    return { gameOver: true, winner: 'impostors' };
  }

  return { gameOver: false };
}

/**
 * End the game
 */
async function endGame(roomId, winner) {
  const state = getGameState(roomId);
  if (!state) return;

  state.phase = PHASES.GAME_OVER;

  await RoomModel.update(roomId, {
    current_phase: PHASES.GAME_OVER,
    status: ROOM_STATUS.FINISHED,
    winner
  });

  if (state.sessionId) {
    await GameSessionModel.update(state.sessionId, {
      total_rounds: state.round,
      winner,
      ended_at: new Date()
    });
  }

  // Clear any timers
  if (state.timerRef) {
    clearTimeout(state.timerRef);
    state.timerRef = null;
  }
}

/**
 * Get the post-game summary
 */
async function getGameSummary(roomId) {
  const state = getGameState(roomId);
  if (!state || !state.sessionId) return null;

  const logs = await RoundLogModel.getBySession(state.sessionId);
  const votes = await VoteModel.getHistory(state.sessionId);

  // Build summary with all player roles revealed
  const players = Array.from(state.players.values()).map(p => ({
    id: p.id,
    displayName: p.displayName,
    avatarIndex: p.avatarIndex,
    role: p.role,
    isAlive: p.isAlive
  }));

  return {
    roomCode: state.roomCode,
    totalRounds: state.round,
    winner: state.phase === PHASES.GAME_OVER ? (checkWinCondition(roomId).winner || 'unknown') : null,
    players,
    roundLogs: logs,
    voteHistory: votes
  };
}

/**
 * Reset room for a new game
 */
async function resetForNewGame(roomId) {
  const state = getGameState(roomId);
  if (!state) return false;

  // Reset in-memory state
  state.phase = PHASES.LOBBY;
  state.round = 0;
  state.sessionId = null;
  state.pinCode = null;
  state.nightActions = {
    step: null, mafiaTarget: null, doctorSave: null, policeCheck: null, policeResult: null
  };
  state.votes = new Map();
  state.votingDeadline = null;
  state.discussionDeadline = null;

  // Reset player states
  for (const player of state.players.values()) {
    player.role = null;
    player.isAlive = true;
    player.isReady = false;
  }

  // Reset in DB
  await PlayerModel.resetForNewGame(roomId);
  await RoomModel.update(roomId, {
    current_phase: PHASES.LOBBY,
    current_round: 0,
    status: ROOM_STATUS.WAITING,
    winner: null,
    pin_code: null
  });

  return true;
}

module.exports = {
  getGameState,
  createGameState,
  removeGameState,
  addPlayer,
  getPublicPlayers,
  getPlayerView,
  validateRoleAssignment,
  applyRoleAssignment,
  startNightPhase,
  processNightAction,
  resolveNight,
  startDayPhase,
  startVotingPhase,
  castVote,
  resolveVoting,
  checkWinCondition,
  endGame,
  getGameSummary,
  resetForNewGame
};
