/**
 * NightPhase — host moderator controls for night actions
 * Non-host players see a "Night" screen
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../../context/SocketContext';
import { useGame } from '../../context/GameContext';
import PlayerAvatar from '../ui/PlayerAvatar';

const STEP_INFO = {
  mafia_wake: { title: '🐺 Mafia, Wake Up', desc: 'Choose a player to eliminate', color: 'text-neon-red' },
  doctor_wake: { title: '🏥 Doctor, Wake Up', desc: 'Choose a player to protect', color: 'text-neon-green' },
  police_wake: { title: '🔍 Police, Wake Up', desc: 'Choose a player to investigate', color: 'text-neon-blue' },
  resolve: { title: '☀️ Dawn Approaches', desc: 'All night actions complete', color: 'text-neon-amber' }
};

export default function NightPhase() {
  const { emit } = useSocket();
  const { state } = useGame();
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [policeResult, setPoliceResult] = useState(null);

  const nightStep = state.nightStep || 'mafia_wake';
  const stepInfo = STEP_INFO[nightStep] || STEP_INFO.mafia_wake;
  // Exclude God (host) from the target list
  const alivePlayers = state.players.filter(p => p.isAlive && !p.isHost);

  const handleAction = async () => {
    if (nightStep === 'resolve') {
      const res = await emit('game:resolve-night');
      return;
    }

    const res = await emit('game:night-action', { step: nightStep, targetId: selectedTarget });
    if (res?.success) {
      setSelectedTarget(null);
      if (res.policeResult) {
        setPoliceResult(res.policeResult);
      }
    }
  };

  const skipAction = async () => {
    const res = await emit('game:night-action', { step: nightStep, targetId: null });
    if (res?.success) setSelectedTarget(null);
  };

  // Non-host night screen
  if (!state.isHost) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-8xl mb-6"
          >
            🌙
          </motion.div>
          <h2 className="font-display text-3xl font-bold mb-2">Night Time</h2>
          <p className="text-text-secondary">Close your eyes and wait for the host...</p>
          <p className="text-text-muted text-sm mt-4">Round {state.round}</p>
        </motion.div>
      </div>
    );
  }

  // Host moderator view
  return (
    <div className="min-h-screen flex flex-col px-4 py-6 max-w-lg mx-auto">
      {/* Round indicator */}
      <div className="text-center mb-4">
        <p className="text-xs text-text-muted uppercase tracking-wider">Night · Round {state.round}</p>
      </div>

      {/* Step prompt */}
      <motion.div
        key={nightStep}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-6 text-center mb-6"
      >
        <h2 className={`font-display text-2xl font-bold ${stepInfo.color}`}>{stepInfo.title}</h2>
        <p className="text-text-secondary mt-2">{stepInfo.desc}</p>
      </motion.div>

      {/* Police result */}
      {policeResult && nightStep !== 'police_wake' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`glass p-4 mb-4 text-center ${policeResult.isImpostor ? 'border-neon-red' : 'border-neon-green'}`}>
          <p className="text-sm">
            Investigation: <strong>{policeResult.playerName}</strong> is{' '}
            <span className={policeResult.isImpostor ? 'text-neon-red font-bold' : 'text-neon-green'}>
              {policeResult.isImpostor ? '🐺 Mafia!' : '✅ Not Mafia'}
            </span>
          </p>
        </motion.div>
      )}

      {/* Player grid for selection */}
      {nightStep !== 'resolve' && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {alivePlayers.map(player => (
            <motion.button
              key={player.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedTarget(player.id)}
              className={`glass p-4 flex flex-col items-center gap-2 transition-all
                ${selectedTarget === player.id
                  ? 'border-neon-purple glow-purple'
                  : 'glass-hover'}`}
            >
              <PlayerAvatar avatarIndex={player.avatarIndex} size="sm" showDead={false} />
              <p className="text-sm font-medium truncate w-full text-center">{player.displayName}</p>
            </motion.button>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-auto space-y-3">
        {nightStep !== 'resolve' && (
          <>
            <button
              onClick={handleAction}
              disabled={!selectedTarget}
              className="btn-primary w-full"
            >
              Confirm Selection
            </button>
            <button onClick={skipAction} className="btn-ghost w-full text-sm">
              Skip (No selection)
            </button>
          </>
        )}
        {nightStep === 'resolve' && (
          <button onClick={handleAction} className="btn-primary w-full text-lg py-4 glow-purple">
            ☀️ Reveal Night Results
          </button>
        )}
      </div>
    </div>
  );
}
