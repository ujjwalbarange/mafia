/**
 * VotingPhase — players vote to eliminate someone
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../../context/SocketContext';
import { useGame } from '../../context/GameContext';
import PlayerAvatar from '../ui/PlayerAvatar';
import Timer from '../ui/Timer';

export default function VotingPhase() {
  const { emit } = useSocket();
  const { state } = useGame();
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const alivePlayers = state.players.filter(p => p.isAlive);
  const me = state.players.find(p => p.id === state.playerId);
  const isDead = !me?.isAlive;

  // Show vote result when received
  useEffect(() => {
    if (state.voteResult) setShowResult(true);
  }, [state.voteResult]);

  const handleVote = async () => {
    const res = await emit('game:vote', { targetId: selectedTarget });
    if (res?.success) {
      setHasVoted(true);
    }
  };

  const handleSkipVote = async () => {
    const res = await emit('game:vote', { targetId: null });
    if (res?.success) {
      setHasVoted(true);
      setSelectedTarget(null);
    }
  };

  const handleTimerExpire = async () => {
    if (state.isHost) {
      await emit('game:resolve-voting');
    }
  };

  // Vote result screen
  if (showResult && state.voteResult) {
    const result = state.voteResult;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-8 max-w-sm w-full text-center"
        >
          {result.eliminatedId ? (
            <>
              <p className="text-5xl mb-4">⚖️</p>
              <h2 className="font-display text-2xl font-bold text-neon-red mb-2">
                {result.eliminatedName} was eliminated!
              </h2>
              {result.showRole && (
                <p className={`text-lg font-semibold ${result.wasImpostor ? 'text-neon-red' : 'text-neon-green'}`}>
                  They were {result.wasImpostor ? '🐺 an Impostor!' : '👤 not an Impostor.'}
                </p>
              )}
            </>
          ) : result.isTie ? (
            <>
              <p className="text-5xl mb-4">⚖️</p>
              <h2 className="font-display text-2xl font-bold mb-2">It's a Tie!</h2>
              <p className="text-text-secondary">No one was eliminated.</p>
            </>
          ) : (
            <>
              <p className="text-5xl mb-4">🤝</p>
              <h2 className="font-display text-2xl font-bold mb-2">Vote Skipped</h2>
              <p className="text-text-secondary">No one was eliminated.</p>
            </>
          )}

          {/* Vote breakdown */}
          {result.voteResults && !state.settings?.anonymousVoting && (
            <div className="mt-6 text-left">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Vote Breakdown</p>
              <div className="space-y-1">
                {Object.entries(result.voteResults).map(([voterId, vote]) => (
                  <div key={voterId} className={`flex justify-between text-xs ${vote.isGhost ? 'opacity-40' : ''}`}>
                    <span>{vote.voterName} {vote.isGhost ? '👻' : ''}</span>
                    <span className="text-text-muted">→ {vote.targetName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Continue button (host) */}
          {state.isHost && !result.gameOver && (
            <button onClick={() => emit('game:start-night')} className="btn-primary w-full mt-6">
              🌙 Continue to Night
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  // Voting interface
  return (
    <div className="min-h-screen flex flex-col px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <p className="text-xs text-text-muted uppercase tracking-wider">Voting · Round {state.round}</p>
        <h2 className="font-display text-2xl font-bold mt-1 text-neon-red">🗳️ Official Vote</h2>
      </div>

      {/* Timer */}
      {state.votingDeadline && (
        <div className="flex justify-center mb-6">
          <Timer deadline={state.votingDeadline} onExpire={handleTimerExpire} label="Vote Time" />
        </div>
      )}

      {/* Vote progress */}
      {state.voteUpdate && (
        <div className="glass p-3 text-center mb-4 text-sm">
          Votes: {state.voteUpdate.voteCount} / {state.voteUpdate.totalVoters}
        </div>
      )}

      {/* Dead player notice */}
      {isDead && (
        <div className="glass p-3 text-center mb-4 text-sm text-neon-amber">
          👻 You're dead — your vote won't count, but you can still participate!
        </div>
      )}

      {/* Player vote grid */}
      {!hasVoted ? (
        <>
          <div className="grid grid-cols-2 gap-3 flex-1">
            {alivePlayers.filter(p => p.id !== state.playerId).map(player => (
              <motion.button
                key={player.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedTarget(player.id)}
                className={`glass p-4 flex flex-col items-center gap-2 transition-all
                  ${selectedTarget === player.id
                    ? 'border-neon-red glow-red'
                    : 'glass-hover'}`}
              >
                <PlayerAvatar avatarIndex={player.avatarIndex} size="sm" showDead={false} />
                <p className="text-sm font-medium truncate w-full text-center">{player.displayName}</p>
              </motion.button>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            <button
              onClick={handleVote}
              disabled={!selectedTarget}
              className="btn-danger w-full"
            >
              🗳️ Lock Vote
            </button>
            <button onClick={handleSkipVote} className="btn-ghost w-full text-sm">
              Skip Vote
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <p className="text-5xl mb-4">✅</p>
            <h3 className="font-display text-xl font-semibold">Vote Locked</h3>
            <p className="text-text-muted text-sm mt-2">Waiting for other players...</p>
          </motion.div>
        </div>
      )}

      {/* Host force-resolve */}
      {state.isHost && (
        <button onClick={() => emit('game:resolve-voting')} className="btn-ghost w-full mt-4 text-sm">
          ⚡ Force End Voting
        </button>
      )}
    </div>
  );
}
