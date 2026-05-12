/**
 * LandingPage — create or join a room
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';
import { AVATARS } from '../components/ui/PlayerAvatar';

export default function LandingPage() {
  const { emit, isConnected } = useSocket();
  const { dispatch } = useGame();
  const [view, setView] = useState('home'); // home | create | join
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return setError('Enter your name');
    setLoading(true);
    setError('');
    const res = await emit('room:create', { displayName: name.trim(), avatarIndex });
    setLoading(false);
    if (res?.success) {
      dispatch({ type: 'SET_ROOM', payload: res });
    } else {
      setError(res?.error || 'Failed to create room');
    }
  };

  const handleJoin = async () => {
    if (!name.trim()) return setError('Enter your name');
    if (!roomCode.trim()) return setError('Enter room code');
    setLoading(true);
    setError('');
    const res = await emit('room:join', { roomCode: roomCode.trim().toUpperCase(), displayName: name.trim(), avatarIndex });
    setLoading(false);
    if (res?.success) {
      dispatch({ type: 'SET_ROOM', payload: res });
    } else {
      setError(res?.error || 'Failed to join room');
    }
  };

  // Check URL for room code
  useState(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code) {
      setRoomCode(code.toUpperCase());
      setView('join');
    }
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {view === 'home' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-8 max-w-md w-full"
        >
          {/* Logo */}
          <div className="text-center">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-7xl mb-4"
            >
              🎭
            </motion.div>
            <h1 className="font-display text-5xl font-bold bg-gradient-to-r from-neon-purple via-neon-pink to-neon-cyan bg-clip-text text-transparent">
              MAFIA
            </h1>
            <p className="text-text-secondary mt-2 text-lg">Social Deduction Party Game</p>
          </div>

          {/* Connection indicator */}
          <div className={`flex items-center gap-2 text-xs ${isConnected ? 'text-neon-green' : 'text-neon-red'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-neon-green' : 'bg-neon-red'} animate-pulse-glow`} />
            {isConnected ? 'Connected' : 'Connecting...'}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-4 w-full">
            <button
              onClick={() => setView('create')}
              disabled={!isConnected}
              className="btn-primary w-full text-lg py-4"
              id="btn-create-room"
            >
              🚀 Create Room
            </button>
            <button
              onClick={() => setView('join')}
              disabled={!isConnected}
              className="btn-ghost w-full text-lg py-4"
              id="btn-join-room"
            >
              🔗 Join Room
            </button>
          </div>

          {/* Game explanation */}
          <div className="glass p-6 w-full">
            <h2 className="font-display font-semibold text-lg mb-3 text-neon-cyan">How to Play</h2>
            <div className="space-y-2 text-sm text-text-secondary">
              <p>🎭 <strong>Mafia</strong> secretly eliminates players at night</p>
              <p>🏥 <strong>Doctor</strong> can save one player each night</p>
              <p>🔍 <strong>Police</strong> can investigate one player each night</p>
              <p>👥 <strong>Civilians</strong> must find and vote out the Mafia</p>
              <p className="text-text-muted mt-3 italic">Play in person — the app is your digital moderator!</p>
            </div>
          </div>
        </motion.div>
      )}

      {(view === 'create' || view === 'join') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-6 max-w-md w-full"
        >
          <button onClick={() => { setView('home'); setError(''); }} className="self-start text-text-muted hover:text-text-primary transition-colors">
            ← Back
          </button>

          <h2 className="font-display text-3xl font-bold">
            {view === 'create' ? '🚀 Create Room' : '🔗 Join Room'}
          </h2>

          {/* Avatar selection */}
          <div className="glass p-4 w-full">
            <p className="text-xs text-text-muted uppercase tracking-wider mb-3">Choose Avatar</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {AVATARS.map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => setAvatarIndex(i)}
                  className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all
                    ${avatarIndex === i
                      ? 'bg-neon-purple/20 border-2 border-neon-purple glow-purple scale-110'
                      : 'bg-surface border border-border hover:border-border-glow'}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name input */}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your display name"
            maxLength={20}
            className="input-field"
            id="input-name"
          />

          {/* Room code input (join only) */}
          {view === 'join' && (
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Room code (e.g., A3KP7M)"
              maxLength={6}
              className="input-field text-center tracking-[0.3em] font-display text-xl uppercase"
              id="input-room-code"
            />
          )}

          {/* Error message */}
          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-neon-red text-sm">
              {error}
            </motion.p>
          )}

          {/* Submit button */}
          <button
            onClick={view === 'create' ? handleCreate : handleJoin}
            disabled={loading || !isConnected}
            className="btn-primary w-full text-lg py-4"
            id="btn-submit"
          >
            {loading ? '⏳ Loading...' : view === 'create' ? 'Create Room' : 'Join Room'}
          </button>
        </motion.div>
      )}
    </div>
  );
}
