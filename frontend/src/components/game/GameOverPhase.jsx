/**
 * GameOverPhase — victory screen + post-game summary
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../../context/SocketContext';
import { useGame } from '../../context/GameContext';
import PlayerAvatar from '../ui/PlayerAvatar';

const ROLE_EMOJI = { civilian: '👤', impostor: '🐺', doctor: '🏥', police: '🔍', god: '👁' };
const ROLE_DISPLAY = { civilian: 'Civilian', impostor: 'Mafia', doctor: 'Doctor', police: 'Police', god: 'God' };

export default function GameOverPhase() {
  const { emit } = useSocket();
  const { state, leaveRoom } = useGame();
  const [summary, setSummary] = useState(null);
  const [showSummary, setShowSummary] = useState(false);

  const gameOver = state.gameOverData;
  const winner = gameOver?.winner;
  const isImpostorWin = winner === 'impostors';

  useEffect(() => {
    const fetchSummary = async () => {
      const res = await emit('game:get-summary');
      if (res?.success) setSummary(res.summary);
    };
    fetchSummary();
  }, []);

  const handlePlayAgain = async () => {
    await emit('game:play-again');
  };

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 max-w-lg mx-auto">
      {/* Victory banner */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-7xl mb-4"
        >
          {isImpostorWin ? '🐺' : '🎉'}
        </motion.div>
        <h1 className={`font-display text-4xl font-bold ${isImpostorWin ? 'text-neon-red text-glow-red' : 'text-neon-green'}`}>
          {isImpostorWin ? 'Mafia Wins!' : 'Civilians Win!'}
        </h1>
        <p className="text-text-secondary mt-2">
          {isImpostorWin ? 'The mafia has taken over...' : 'Justice prevails!'}
        </p>
      </motion.div>

      {/* All players with roles revealed */}
      <div className="glass p-5 mb-6">
        <h3 className="font-display font-semibold text-sm text-text-muted uppercase tracking-wider mb-4">All Players</h3>
        <div className="space-y-3">
          {(gameOver?.players || state.players).map((player, i) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-center gap-3 ${!player.isAlive ? 'opacity-50' : ''}`}
            >
              <PlayerAvatar avatarIndex={player.avatarIndex} isAlive={player.isAlive} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{player.displayName}</p>
                <p className="text-xs text-text-muted">{!player.isAlive ? '💀 Dead' : '✅ Survived'}</p>
              </div>
              {player.role && (
                <span className={`text-sm font-semibold ${player.role === 'impostor' ? 'text-neon-red' : player.role === 'god' ? 'text-neon-amber' : 'text-text-secondary'}`}>
                  {ROLE_EMOJI[player.role]} {ROLE_DISPLAY[player.role] || player.role}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Summary toggle */}
      <button
        onClick={() => setShowSummary(!showSummary)}
        className="btn-ghost w-full mb-4 text-sm"
      >
        {showSummary ? 'Hide' : 'Show'} Game Summary
      </button>

      {/* Detailed summary */}
      {showSummary && summary && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass p-5 mb-6 space-y-4"
        >
          <h3 className="font-display font-semibold text-neon-cyan">📋 Round Timeline</h3>

          {/* Group logs by round */}
          {Array.from({ length: summary.totalRounds }, (_, i) => i + 1).map(round => {
            const roundLogs = summary.roundLogs.filter(l => l.round_number === round);
            const roundVotes = summary.voteHistory.filter(v => v.round_number === round);

            return (
              <div key={round} className="border-l-2 border-border pl-4">
                <p className="font-display font-semibold text-sm mb-2">Round {round}</p>
                {roundLogs.map((log, j) => (
                  <div key={j} className="text-xs text-text-secondary mb-1">
                    <span className="text-text-muted">{log.event_type}: </span>
                    {log.result}
                  </div>
                ))}
                {roundVotes.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-text-muted mb-1">Votes:</p>
                    {roundVotes.map((vote, j) => (
                      <div key={j} className="text-xs text-text-secondary">
                        {vote.voter_name} → {vote.target_name || 'Skip'} {vote.is_ghost_vote ? '👻' : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Action buttons */}
      <div className="mt-auto space-y-3">
        {state.isHost && (
          <button onClick={handlePlayAgain} className="btn-primary w-full text-lg py-4">
            🔄 Play Again
          </button>
        )}
        <button onClick={leaveRoom} className="btn-ghost w-full">
          🚪 Leave Room
        </button>
      </div>
    </div>
  );
}
