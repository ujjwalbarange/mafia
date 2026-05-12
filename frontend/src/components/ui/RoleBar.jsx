/**
 * RoleBar — Persistent role display at the top of game screens (like Scribbl's word bar)
 * 
 * Behavior:
 * - Auto-reveals role when first assigned (role_assignment phase)
 * - Once the player clicks "Hide", all future reveals require PIN entry
 * - Auto-hides when a new phase starts (night, day, voting) in case player forgot
 * - God always sees their role without PIN
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../../context/SocketContext';
import { useGame } from '../../context/GameContext';

const ROLE_DISPLAY = {
  god: { label: 'God', emoji: '👁', color: 'text-amber-400', bg: 'from-amber-500/20 to-orange-500/20' },
  civilian: { label: 'Civilian', emoji: '👤', color: 'text-cyan-400', bg: 'from-cyan-500/20 to-blue-500/20' },
  impostor: { label: 'Mafia', emoji: '🐺', color: 'text-red-400', bg: 'from-red-500/20 to-pink-500/20' },
  doctor: { label: 'Doctor', emoji: '🏥', color: 'text-green-400', bg: 'from-green-500/20 to-emerald-500/20' },
  police: { label: 'Police', emoji: '🔍', color: 'text-blue-400', bg: 'from-blue-500/20 to-indigo-500/20' }
};

export default function RoleBar() {
  const { emit } = useSocket();
  const { state } = useGame();
  const [revealed, setRevealed] = useState(false);
  const [showPinPopup, setShowPinPopup] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifiedRole, setVerifiedRole] = useState(null);
  const pinInputRef = useRef(null);

  // Once set to true, every future reveal requires PIN
  const pinLocked = useRef(false);

  // Track the previous phase to detect transitions
  const prevPhase = useRef(state.phase);

  // Use the role we already know from context, or verifiedRole from PIN check
  const displayRole = state.myRole || verifiedRole;
  const roleInfo = ROLE_DISPLAY[displayRole] || null;
  const isGod = state.isHost;

  // === EFFECT 1: Auto-reveal on role_assignment (first time only) ===
  useEffect(() => {
    if (state.phase === 'role_assignment' && displayRole && !pinLocked.current && !isGod) {
      setRevealed(true);
    }
  }, [state.phase, displayRole, isGod]);

  // === EFFECT 2: Auto-hide when phase changes (night/day/voting starts) ===
  useEffect(() => {
    if (state.phase !== prevPhase.current) {
      prevPhase.current = state.phase;

      // Auto-hide on any phase transition (except staying on role_assignment)
      if (revealed && state.phase !== 'role_assignment') {
        setRevealed(false);
        // If role was showing and phase changed, lock to PIN from now on
        if (displayRole) {
          pinLocked.current = true;
        }
      }
    }
  }, [state.phase, revealed, displayRole]);

  // Focus PIN input when popup opens
  useEffect(() => {
    if (showPinPopup && pinInputRef.current) {
      setTimeout(() => pinInputRef.current?.focus(), 100);
    }
  }, [showPinPopup]);

  // === Handlers ===

  const handleReveal = () => {
    if (isGod) {
      // God always sees role, no PIN needed
      setRevealed(true);
      return;
    }

    if (!pinLocked.current && displayRole) {
      // First reveal (before ever hidden) — show directly
      setRevealed(true);
    } else {
      // Locked — need PIN
      setShowPinPopup(true);
      setPin('');
      setPinError('');
    }
  };

  const handleHide = () => {
    setRevealed(false);
    // Lock: from now on, PIN is required to reveal again
    pinLocked.current = true;
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setPinError('');
    const res = await emit('game:verify-pin', { pin });
    if (res?.success) {
      setVerifiedRole(res.role);
      setShowPinPopup(false);
      setRevealed(true);
      setPin('');
    } else {
      setPinError(res?.error || 'Wrong PIN');
      setPin('');
    }
  };

  // Don't show the bar if no role assigned yet and not in a game phase
  if (!displayRole && !['role_assignment', 'night', 'day_discussion', 'voting'].includes(state.phase)) {
    return null;
  }

  return (
    <>
      {/* Role Bar */}
      <div className="sticky top-0 z-30 w-full">
        <div className={`
          mx-auto max-w-lg px-4 py-2
          backdrop-blur-xl bg-black/60 border-b border-white/10
          flex items-center justify-between gap-3
        `}>
          <span className="text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap">
            Your Role
          </span>

          <div className="flex-1 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {revealed && roleInfo ? (
                <motion.div
                  key="revealed"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={`flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r ${roleInfo.bg}`}
                >
                  <span className="text-lg">{roleInfo.emoji}</span>
                  <span className={`font-bold text-sm ${roleInfo.color}`}>{roleInfo.label}</span>
                </motion.div>
              ) : (
                <motion.div
                  key="hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1"
                >
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="w-2.5 h-2.5 rounded-full bg-gray-600 inline-block" />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Eye toggle / Hide button */}
          {revealed ? (
            <button
              onClick={handleHide}
              className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10"
            >
              Hide
            </button>
          ) : (
            <button
              onClick={handleReveal}
              className="text-lg px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              title={pinLocked.current ? 'Enter PIN to reveal' : 'Reveal your role'}
            >
              {pinLocked.current ? '🔐' : '👁'}
            </button>
          )}
        </div>
      </div>

      {/* PIN Popup */}
      <AnimatePresence>
        {showPinPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            onClick={() => setShowPinPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass p-6 w-full max-w-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold text-center text-lg mb-1">🔐 Enter PIN</h3>
              <p className="text-xs text-gray-400 text-center mb-4">Ask God for the game PIN</p>

              <form onSubmit={handlePinSubmit}>
                <input
                  ref={pinInputRef}
                  type="tel"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="● ● ● ●"
                  className="input-field w-full text-center text-2xl tracking-[0.5em] font-mono mb-3"
                  autoComplete="off"
                />
                {pinError && (
                  <p className="text-red-400 text-xs text-center mb-3">{pinError}</p>
                )}
                <button
                  type="submit"
                  disabled={pin.length < 4}
                  className="btn-primary w-full disabled:opacity-40"
                >
                  Reveal
                </button>
              </form>

              <button
                onClick={() => setShowPinPopup(false)}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-300 mt-3 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
