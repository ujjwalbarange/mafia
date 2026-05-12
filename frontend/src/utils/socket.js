/**
 * Socket.IO Client — singleton connection manager
 */
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

const socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000
});

export default socket;
