/**
 * SocketContext — provides socket instance, connection state, and server time offset
 * 
 * The timeOffset is used to synchronize timers across devices.
 * offset = serverTime - clientTime
 * To get "server now": Date.now() + timeOffset
 */
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import socket from '../utils/socket';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const timeOffset = useRef(0); // serverTime - clientTime (ms)

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => {
      setIsConnected(true);
      // Sync clock with server — compute offset
      syncClock();
    });
    socket.on('disconnect', () => setIsConnected(false));

    // Server can push time sync events
    socket.on('server:time', ({ serverTime }) => {
      timeOffset.current = serverTime - Date.now();
    });

    // Auto-reconnect aggressively when app comes to foreground
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (socket.disconnected) {
          socket.connect();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('server:time');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Clock sync: send a ping and calculate round-trip offset
  const syncClock = useCallback(() => {
    const t0 = Date.now();
    socket.emit('server:ping', null, (response) => {
      if (response?.serverTime) {
        const t1 = Date.now();
        const roundTrip = t1 - t0;
        // Estimate server time at the moment we received the response
        // serverTime was captured mid-roundtrip, so adjust by half RTT
        timeOffset.current = response.serverTime - t0 - Math.floor(roundTrip / 2);
      }
    });
  }, []);

  const emit = useCallback((event, data) => {
    return new Promise((resolve) => {
      socket.emit(event, data, (response) => {
        resolve(response);
      });
    });
  }, []);

  // Get the current server-adjusted time
  const getServerNow = useCallback(() => {
    return Date.now() + timeOffset.current;
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, emit, getServerNow, timeOffset }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
