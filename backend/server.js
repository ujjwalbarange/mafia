/**
 * Mafia Party Game — Main Server Entry Point
 * Express + Socket.IO server with MySQL connection
 */

require('dotenv').config({ path: '../.env.example' });
const path = require('path');

// Also try loading .env from project root and current dir
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });
require('dotenv').config({ path: path.resolve(__dirname, '.env'), override: true });

const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const db = require('./src/config/database');
const { initSocketHandlers } = require('./src/socket');
const roomRoutes = require('./src/routes/roomRoutes');
const playerRoutes = require('./src/routes/playerRoutes');
const gameRoutes = require('./src/routes/gameRoutes');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Build allowed origins list dynamically
const allowedOrigins = [
  CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

// CORS origin checker — allows configured URLs + any *.vercel.app domain
function corsOriginCheck(origin, callback) {
  // Allow no-origin requests (curl, mobile apps, server-to-server)
  if (!origin) return callback(null, true);
  if (allowedOrigins.includes(origin)) return callback(null, true);
  // Allow any Vercel deployment (preview + production)
  if (/\.vercel\.app$/.test(origin)) return callback(null, true);
  callback(null, false);
}

/* ========== Middleware ========== */
app.use(cors({
  origin: corsOriginCheck,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ========== REST API Routes ========== */
app.use('/api/rooms', roomRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/game', gameRoutes);

/* ========== Health Check ========== */
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', uptime: process.uptime() });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected', message: err.message });
  }
});

/* ========== Socket.IO Setup ========== */
const io = new Server(server, {
  cors: {
    origin: corsOriginCheck,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 10000
});

// Initialize all socket event handlers
initSocketHandlers(io);

/* ========== Error Handling ========== */
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

/* ========== Start Server ========== */
server.listen(PORT, () => {
  console.log(`\n🎭 Mafia Game Server running on port ${PORT}`);
  console.log(`📡 Client URL: ${CLIENT_URL}`);
  console.log(`🔌 Socket.IO ready`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down...');
  server.close(() => {
    db.end();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down...');
  server.close(() => {
    db.end();
    process.exit(0);
  });
});

module.exports = { app, server, io };
