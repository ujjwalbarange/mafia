/**
 * Room Model — Database operations for rooms
 * Uses raw mysql2 queries, no ORM
 */

const db = require('../config/database');
const { generateId, generateRoomCode, generatePin } = require('../utils/helpers');
const { DEFAULT_SETTINGS } = require('../config/constants');

const RoomModel = {
  /**
   * Create a new room with default settings
   */
  async create() {
    const id = generateId();
    const roomCode = generateRoomCode();
    const pinCode = generatePin();
    const settings = JSON.stringify(DEFAULT_SETTINGS);

    await db.query(
      `INSERT INTO rooms (id, room_code, pin_code, settings) VALUES (?, ?, ?, ?)`,
      [id, roomCode, pinCode, settings]
    );

    return { id, roomCode, pinCode, settings: DEFAULT_SETTINGS };
  },

  /**
   * Find a room by its UUID
   */
  async findById(id) {
    const [rows] = await db.query('SELECT * FROM rooms WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    const room = rows[0];
    if (typeof room.settings === 'string') {
      room.settings = JSON.parse(room.settings);
    }
    return room;
  },

  /**
   * Find a room by its join code
   */
  async findByCode(code) {
    const [rows] = await db.query('SELECT * FROM rooms WHERE room_code = ?', [code.toUpperCase()]);
    if (rows.length === 0) return null;
    const room = rows[0];
    if (typeof room.settings === 'string') {
      room.settings = JSON.parse(room.settings);
    }
    return room;
  },

  /**
   * Update room fields
   */
  async update(id, fields) {
    const allowed = ['host_player_id', 'status', 'current_phase', 'current_round', 'pin_code', 'settings', 'winner'];
    const setClauses = [];
    const values = [];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        setClauses.push(`${key} = ?`);
        values.push(key === 'settings' ? JSON.stringify(fields[key]) : fields[key]);
      }
    }

    if (setClauses.length === 0) return;
    values.push(id);

    await db.query(`UPDATE rooms SET ${setClauses.join(', ')} WHERE id = ?`, values);
  },

  /**
   * Delete a room and cascade delete players
   */
  async delete(id) {
    await db.query('DELETE FROM rooms WHERE id = ?', [id]);
  },

  /**
   * Clean up old finished/empty rooms (older than 24 hours)
   */
  async cleanup() {
    await db.query(
      `DELETE FROM rooms WHERE 
       (status = 'finished' AND updated_at < NOW() - INTERVAL 24 HOUR) OR
       (status = 'waiting' AND updated_at < NOW() - INTERVAL 6 HOUR)`
    );
  }
};

module.exports = RoomModel;
