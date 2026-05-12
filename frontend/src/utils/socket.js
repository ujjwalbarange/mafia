/**
 * Socket.IO Client — singleton connection manager
 * 
 * In development: uses Vite proxy (empty URL)
 * In production: connects to VITE_SERVER_URL (your Render/Railway backend)
 */
import { io } from 'socket.io-client';

// In production, set VITE_SERVER_URL to your backend URL (e.g. https://mafia-backend.onrender.com)
const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

const socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 15000,
  // Required for cross-origin in production
  withCredentials: true,
  transports: ['websocket', 'polling']
});

export default socket;
