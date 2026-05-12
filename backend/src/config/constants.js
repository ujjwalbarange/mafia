/**
 * Game Constants
 * Central place for all game configuration values
 */

module.exports = {
  // Game phases in order
  PHASES: {
    LOBBY: 'lobby',
    ROLE_ASSIGNMENT: 'role_assignment',
    NIGHT: 'night',
    DAY_DISCUSSION: 'day_discussion',
    VOTING: 'voting',
    GAME_OVER: 'game_over'
  },

  // Player roles
  ROLES: {
    GOD: 'god',           // Host/moderator — not a player
    CIVILIAN: 'civilian',
    IMPOSTOR: 'impostor',
    DOCTOR: 'doctor',
    POLICE: 'police'
  },

  // Room statuses
  ROOM_STATUS: {
    WAITING: 'waiting',
    IN_PROGRESS: 'in_progress',
    FINISHED: 'finished'
  },

  // Night phase sub-steps
  NIGHT_STEPS: {
    MAFIA_WAKE: 'mafia_wake',
    DOCTOR_WAKE: 'doctor_wake',
    POLICE_WAKE: 'police_wake',
    RESOLVE: 'resolve'
  },

  // Default game settings
  DEFAULT_SETTINGS: {
    discussionTimer: 120,   // seconds
    votingTimer: 30,        // seconds
    anonymousVoting: false,
    confirmEjects: true,
    numImpostors: 1,
    enableDoctor: true,
    enablePolice: true,
    maxPlayers: 10
  },

  // Round log event types
  EVENT_TYPES: {
    MAFIA_KILL: 'mafia_kill',
    DOCTOR_SAVE: 'doctor_save',
    POLICE_CHECK: 'police_check',
    ELIMINATION: 'elimination',
    SKIP: 'skip',
    NO_DEATH: 'no_death'
  },

  // Misc
  MIN_PLAYERS: 4,
  ROOM_CODE_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', // no confusing chars
  ROOM_CODE_LENGTH: parseInt(process.env.ROOM_CODE_LENGTH || '6', 10),
  PIN_LENGTH: parseInt(process.env.PIN_LENGTH || '4', 10),
  RECONNECT_TIMEOUT: parseInt(process.env.RECONNECT_TIMEOUT_MS || '30000', 10)
};
