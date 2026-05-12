/**
 * GameContext — central game state management
 * Listens to socket events and maintains UI state
 */
import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';

const GameContext = createContext(null);

const initialState = {
  roomId: null,
  roomCode: null,
  playerId: null,
  sessionToken: null,
  isHost: false,
  phase: 'lobby',
  round: 0,
  players: [],
  myRole: null,
  isAlive: true,
  settings: null,
  nightStep: null,
  pinCode: null,
  policeResult: null,
  discussionDeadline: null,
  votingDeadline: null,
  voteResult: null,
  gameOverData: null,
  summary: null,
  notification: null,
  voteUpdate: null
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_ROOM':
      return {
        ...state,
        roomId: action.payload.roomId,
        roomCode: action.payload.roomCode,
        playerId: action.payload.playerId,
        sessionToken: action.payload.sessionToken,
        isHost: action.payload.isHost
      };
    case 'RESTORE_STATE':
      return { ...state, ...action.payload };
    case 'SET_PLAYERS':
      return { ...state, players: action.payload };
    case 'SET_PHASE':
      // Clear stale data from previous phase on every transition
      return {
        ...state,
        voteResult: null,
        voteUpdate: null,
        votingDeadline: null,
        discussionDeadline: null,
        phase: action.payload.phase,
        ...action.payload
      };
    case 'SET_ROLE':
      return { ...state, myRole: action.payload };
    case 'SET_PIN':
      return { ...state, pinCode: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'SET_NIGHT_STEP':
      return { ...state, nightStep: action.payload };
    case 'SET_VOTE_UPDATE':
      return { ...state, voteUpdate: action.payload };
    case 'SET_VOTE_RESULT':
      return { ...state, voteResult: action.payload };
    case 'SET_GAME_OVER':
      return { ...state, gameOverData: action.payload, phase: 'game_over' };
    case 'SET_SUMMARY':
      return { ...state, summary: action.payload };
    case 'SET_NOTIFICATION':
      return { ...state, notification: action.payload };
    case 'SET_HOST':
      return { ...state, isHost: true };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { socket, emit } = useSocket();

  // Persist session to localStorage
  useEffect(() => {
    if (state.sessionToken && state.roomId) {
      localStorage.setItem('mafia_session', JSON.stringify({
        sessionToken: state.sessionToken,
        roomId: state.roomId,
        playerId: state.playerId
      }));
    }
  }, [state.sessionToken, state.roomId, state.playerId]);

  // Attempt reconnection on mount
  useEffect(() => {
    const saved = localStorage.getItem('mafia_session');
    if (!saved) return;

    const { sessionToken, roomId } = JSON.parse(saved);
    if (!sessionToken || !roomId) return;

    const tryReconnect = async () => {
      const res = await emit('room:reconnect', { sessionToken, roomId });
      if (res?.success && res.gameState) {
        const gs = res.gameState;
        dispatch({
          type: 'RESTORE_STATE',
          payload: {
            roomId: gs.roomId,
            roomCode: gs.roomCode,
            playerId: gs.myId,
            sessionToken,
            isHost: gs.isHost,
            phase: gs.phase,
            round: gs.round,
            players: gs.players,
            myRole: gs.myRole,
            isAlive: gs.isAlive,
            settings: gs.settings,
            nightStep: gs.nightStep,
            pinCode: gs.pinCode,
            discussionDeadline: gs.discussionDeadline,
            votingDeadline: gs.votingDeadline,
            policeResult: gs.policeResult
          }
        });
      } else {
        localStorage.removeItem('mafia_session');
      }
    };

    // Wait for socket connection
    if (socket.connected) {
      tryReconnect();
    } else {
      socket.once('connect', tryReconnect);
    }
  }, []);

  // Listen to game events
  useEffect(() => {
    socket.on('room:players', (players) => {
      dispatch({ type: 'SET_PLAYERS', payload: players });
    });

    socket.on('room:player-joined', ({ displayName }) => {
      dispatch({ type: 'SET_NOTIFICATION', payload: `${displayName} joined the room` });
    });

    socket.on('room:player-disconnected', ({ displayName }) => {
      dispatch({ type: 'SET_NOTIFICATION', payload: `${displayName} disconnected` });
    });

    socket.on('room:player-reconnected', ({ displayName }) => {
      dispatch({ type: 'SET_NOTIFICATION', payload: `${displayName} reconnected` });
    });

    socket.on('room:host-assigned', () => {
      dispatch({ type: 'SET_HOST' });
      dispatch({ type: 'SET_NOTIFICATION', payload: 'You are now the host!' });
    });

    socket.on('game:role-reveal', ({ role }) => {
      dispatch({ type: 'SET_ROLE', payload: role });
    });

    socket.on('game:pin-code', ({ pinCode }) => {
      dispatch({ type: 'SET_PIN', payload: pinCode });
    });

    socket.on('game:phase-change', (data) => {
      dispatch({ type: 'SET_PHASE', payload: data });
    });

    socket.on('game:night-step', ({ step }) => {
      dispatch({ type: 'SET_NIGHT_STEP', payload: step });
    });

    socket.on('game:settings-updated', (settings) => {
      dispatch({ type: 'SET_SETTINGS', payload: settings });
    });

    socket.on('game:vote-update', (data) => {
      dispatch({ type: 'SET_VOTE_UPDATE', payload: data });
    });

    socket.on('game:vote-result', (data) => {
      dispatch({ type: 'SET_VOTE_RESULT', payload: data });
    });

    socket.on('game:over', (data) => {
      dispatch({ type: 'SET_GAME_OVER', payload: data });
    });

    return () => {
      socket.off('room:players');
      socket.off('room:player-joined');
      socket.off('room:player-disconnected');
      socket.off('room:player-reconnected');
      socket.off('room:host-assigned');
      socket.off('game:role-reveal');
      socket.off('game:pin-code');
      socket.off('game:phase-change');
      socket.off('game:night-step');
      socket.off('game:settings-updated');
      socket.off('game:vote-update');
      socket.off('game:vote-result');
      socket.off('game:over');
    };
  }, [socket]);

  // Auto-clear notifications
  useEffect(() => {
    if (state.notification) {
      const t = setTimeout(() => dispatch({ type: 'SET_NOTIFICATION', payload: null }), 3000);
      return () => clearTimeout(t);
    }
  }, [state.notification]);

  const leaveRoom = useCallback(() => {
    localStorage.removeItem('mafia_session');
    dispatch({ type: 'RESET' });
  }, []);

  return (
    <GameContext.Provider value={{ state, dispatch, leaveRoom }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
