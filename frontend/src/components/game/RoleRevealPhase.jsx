/**
 * RoleRevealPhase — animated role reveal with PIN lock
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../../context/SocketContext';
import { useGame } from '../../context/GameContext';

const ROLE_INFO = {
  civilian: { label: 'Civilian', emoji: '👤', color: 'from-blue-500 to-cyan-500', desc: 'Find and vote out the impostors!' },
  impostor: { label: 'Impostor', emoji: '🐺', color: 'from-red-600 to-pink-600', desc: 'Eliminate players without getting caught!' },
  doctor: { label: 'Doctor', emoji: '🏥', color: 'from-green-500 to-emerald-500', desc: 'Save one player each night from the mafia!' },
  police: { label: 'Police', emoji: '🔍', color: 'from-blue-600 to-indigo-600', desc: 'Investigate one player each night!' }
};

export default function RoleRevealPhase() {
  const { emit } = useSocket();
  const { state } = useGame();
  const [revealed, setRevealed] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [showRole, setShowRole] = useState(false);

  const role = state.myRole;
  const info = ROLE_INFO[role] || ROLE_INFO.civilian;

  const handleReveal = () => {
    setRevealed(true);
    setTimeout(() => setShowRole(true), 600);
    // Auto-lock after 5 seconds
    setTimeout(() => {
      setLocked(true);
      setShowRole(false);
    }, 8000);
  };

  const handlePinUnlock = async () => {
    setPinError('');
    const res = await emit('game:verify-pin', { pin: pinInput });
    if (res?.success) {
      setShowRole(true);
      setPinInput('');
      setTimeout(() => { setShowRole(false); }, 5000);
    } else {
      setPinError('Wrong PIN');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Host info */}
      {state.isHost && state.pinCode && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-4 mb-6 text-center">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Game PIN (Host Only)</p>
          <p className="font-display text-3xl font-bold tracking-[0.3em] text-neon-amber">{state.pinCode}</p>
          <p className="text-xs text-text-muted mt-2">Share this PIN verbally so players can recheck their roles</p>
          <button onClick={() => emit('game:start-night')} className="btn-primary mt-4 w-full">
            🌙 Begin Night Phase
          </button>
        </motion.div>
      )}

      {/* Role reveal card */}
      {!locked && !revealed && (
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-xs">
          <button onClick={handleReveal} className="glass w-full p-8 flex flex-col items-center gap-4 glass-hover cursor-pointer">
            <motion.div animate={{ rotateY: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-6xl">
              🎴
            </motion.div>
            <p className="font-display font-semibold text-lg text-neon-purple">Tap to Reveal Role</p>
            <p className="text-xs text-text-muted">Make sure no one is looking!</p>
          </button>
        </motion.div>
      )}

      {/* Revealed role animation */}
      <AnimatePresence>
        {showRole && role && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotateY: 180 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.6, type: 'spring' }}
            className={`w-full max-w-xs rounded-2xl p-8 bg-gradient-to-br ${info.color} flex flex-col items-center gap-4 shadow-2xl`}
          >
            <span className="text-7xl">{info.emoji}</span>
            <h2 className="font-display text-3xl font-bold text-white">{info.label}</h2>
            <p className="text-white/80 text-center text-sm">{info.desc}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Blurred / locked state */}
      {locked && !showRole && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-xs flex flex-col items-center gap-6">
          <div className="glass p-8 w-full text-center">
            <p className="text-4xl mb-4">🔒</p>
            <p className="font-display font-semibold text-lg">Role Locked</p>
            <p className="text-sm text-text-muted mt-2">Enter PIN to view your role again</p>
          </div>

          {/* PIN input */}
          <div className="flex gap-2 justify-center">
            {[0, 1, 2, 3].map(i => (
              <input
                key={i}
                type="text"
                maxLength={1}
                value={pinInput[i] || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  const newPin = pinInput.split('');
                  newPin[i] = val;
                  setPinInput(newPin.join(''));
                  // Auto-focus next
                  if (val && i < 3) {
                    const next = e.target.parentElement.children[i + 1];
                    next?.focus();
                  }
                }}
                className="input-field w-14 h-14 text-center text-2xl font-display"
              />
            ))}
          </div>

          {pinError && <p className="text-neon-red text-sm">{pinError}</p>}

          <button onClick={handlePinUnlock} disabled={pinInput.length < 4} className="btn-primary w-full">
            Unlock
          </button>
        </motion.div>
      )}

      {/* Revealed then auto-locked message */}
      {revealed && !locked && !showRole && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="text-4xl animate-spin mb-4">⏳</div>
          <p className="text-text-muted">Memorize your role...</p>
        </motion.div>
      )}
    </div>
  );
}
