/**
 * Utility helpers used throughout the backend
 */

const { v4: uuidv4 } = require('uuid');
const { ROOM_CODE_CHARS, ROOM_CODE_LENGTH, PIN_LENGTH } = require('../config/constants');

/**
 * Generate a new UUID v4
 */
function generateId() {
  return uuidv4();
}

/**
 * Generate a random room code (e.g., "A3KP7M")
 * Uses only non-ambiguous characters
 */
function generateRoomCode(length = ROOM_CODE_LENGTH) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ROOM_CODE_CHARS.charAt(Math.floor(Math.random() * ROOM_CODE_CHARS.length));
  }
  return code;
}

/**
 * Generate a random numeric PIN (e.g., "4829")
 */
function generatePin(length = PIN_LENGTH) {
  let pin = '';
  for (let i = 0; i < length; i++) {
    pin += Math.floor(Math.random() * 10).toString();
  }
  return pin;
}

/**
 * Sanitize user input string — strip tags, limit length
 */
function sanitize(str, maxLength = 30) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim().substring(0, maxLength);
}

/**
 * Create a standardized API response
 */
function apiResponse(res, statusCode, data = null, error = null) {
  const response = { success: statusCode >= 200 && statusCode < 300 };
  if (data !== null) response.data = data;
  if (error !== null) response.error = error;
  return res.status(statusCode).json(response);
}

/**
 * Shuffle an array in-place using Fisher-Yates
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

module.exports = {
  generateId,
  generateRoomCode,
  generatePin,
  sanitize,
  apiResponse,
  shuffle
};
