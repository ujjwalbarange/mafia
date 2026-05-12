/**
 * RoleRevealPhase — Roles have been assigned
 * 
 * Players use the RoleBar (at the top of the screen) to check their role via PIN.
 * Host sees the PIN and can start the night phase.
 */
import { motion } from 'framer-motion';
import { useSocket } from '../../context/SocketContext';
import { useGame } from '../../context/GameContext';

export default function RoleRevealPhase() {
  const { emit } = useSocket();
  const { state } = useGame();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Host view: PIN + Start button */}
      {state.isHost && state.pinCode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-6 mb-6 text-center w-full max-w-xs"
        >
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Game PIN (God Only)</p>
          <p className="font-display text-4xl font-bold tracking-[0.3em] text-neon-amber">{state.pinCode}</p>
          <p className="text-xs text-text-muted mt-3">
            Share this PIN verbally so players can reveal their role using the 👁 button above
          </p>
          <button onClick={() => emit('game:start-night')} className="btn-primary mt-6 w-full text-lg py-3">
            🌙 Begin Night Phase
          </button>
        </motion.div>
      )}

      {/* Player view: instructions */}
      {!state.isHost && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-6 text-center w-full max-w-xs"
        >
          <p className="text-5xl mb-4">🎴</p>
          <h2 className="font-display text-xl font-bold mb-2">Roles Assigned!</h2>
          <p className="text-sm text-text-secondary mb-4">
            Tap the <span className="text-lg">👁</span> button in the bar above to reveal your role.
          </p>
          <p className="text-xs text-text-muted">
            Ask God for the game PIN to unlock your role.
            <br />Make sure no one is looking at your screen!
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-text-muted text-sm">
            <div className="w-2 h-2 rounded-full bg-neon-purple animate-pulse" />
            Waiting for God to start the night...
          </div>
        </motion.div>
      )}
    </div>
  );
}
