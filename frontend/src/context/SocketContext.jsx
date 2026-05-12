/**
 * SocketContext — provides socket instance and connection state
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import socket from '../utils/socket';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  const emit = useCallback((event, data) => {
    return new Promise((resolve) => {
      socket.emit(event, data, (response) => {
        resolve(response);
      });
    });
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, emit }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
