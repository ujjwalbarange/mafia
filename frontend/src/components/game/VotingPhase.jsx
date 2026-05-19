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

  // Exclude God (host) from votable players
  const alivePlayers = state.players.filter(p => p.isAlive && !p.isHost);
  const me = state.players.find(p => p.id === state.playerId);
  const isDead = !me?.isAlive;
  const isGod = state.isHost;

  const [suspense, setSuspense] = useState(true);
  const [msgIndex, setMsgIndex] = useState(0);

  // Show vote result when received
  useEffect(() => {
    if (state.voteResult) {
      setShowResult(true);
      setSuspense(true);
      setMsgIndex(Math.floor(Math.random() * 3));
      const t = setTimeout(() => setSuspense(false), 3500);
      return () => clearTimeout(t);
    }
  }, [state.voteResult]);

  // Messages
  const getEliminatedMsg = (name) => [
    `${name} was eliminated.`,
    `The town voted out ${name}.`,
    `Goodbye, ${name}.`
  ][msgIndex];
  const getTieMsg = () => [
    "Voting ended in a tie.",
    "The town couldn't decide.",
    "No player was eliminated."
  ][msgIndex];
  const getSkipMsg = () => [
    "No one was eliminated.",
    "The town decided to skip.",
    "Voting was skipped."
  ][msgIndex];

  const handleVote = async () => {
    if (isDead) {
      setHasVoted(true);
      return;
    }
    const res = await emit('game:vote', { targetId: selectedTarget });
    if (res?.success) {
      setHasVoted(true);
    }
  };

  const handleSkipVote = async () => {
    if (isDead) {
      setHasVoted(true);
      setSelectedTarget(null);
      return;
    }
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

    if (suspense) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-black/90">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-6">
            <div className="w-12 h-12 border-4 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" />
            <h2 className="font-display text-2xl font-semibold tracking-widest uppercase text-white animate-pulse">Tallying Votes...</h2>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 transition-colors duration-1000 bg-black/80">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="glass p-10 max-w-sm w-full text-center border-t-4 border-t-white/20 shadow-2xl"
        >
          {!result.isTie && result.eliminatedId ? (
            <>
              <h2 className="font-display text-3xl font-bold text-white mb-2 leading-tight">
                {getEliminatedMsg(result.eliminatedName)}
              </h2>
              {result.showRole && (
                <motion.p 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  transition={{ delay: 1 }} 
                  className={`mt-4 text-xl tracking-wide ${result.wasImpostor ? 'text-neon-red font-bold' : 'text-neon-cyan'}`}
                >
                  {result.eliminatedName} was {result.wasImpostor ? 'an Impostor.' : 'not an Impostor.'}
                </motion.p>
              )}
            </>
          ) : result.isTie ? (
            <>
              <h2 className="font-display text-3xl font-bold mb-2 text-white">{getTieMsg()}</h2>
              {result.showRole && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-4 text-xl tracking-wide text-text-muted">
                  Result: Draw
                </motion.p>
              )}
            </>
          ) : (
            <>
              <h2 className="font-display text-3xl font-bold mb-2 text-white">{getSkipMsg()}</h2>
            </>
          )}

          {/* Vote breakdown */}
          {result.voteResults && !state.settings?.anonymousVoting && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="mt-8 text-left border-t border-white/10 pt-4">
              <p className="text-xs text-text-muted uppercase tracking-widest mb-3 text-center">Vote Breakdown</p>
              <div className="space-y-2">
                {Object.entries(result.voteResults).map(([voterId, vote]) => (
                  <div key={voterId} className={`flex justify-between items-center text-sm ${vote.isGhost ? 'opacity-30' : ''}`}>
                    <span className="font-medium text-white/80">{vote.voterName} {vote.isGhost ? '👻' : ''}</span>
                    <span className="text-text-muted text-xs mx-2">voted</span>
                    <span className="font-medium text-white/80">{vote.targetName}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Continue button (host) */}
          {state.isHost && !result.gameOver && (
            <motion.button 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 2 }} 
              onClick={() => emit('game:start-night')} 
              className="btn-primary w-full mt-8"
            >
              Proceed
            </motion.button>
          )}
        </motion.div>
      </div>
    );
  }

  // Get voters for a specific target
  const getVotersFor = (targetId) => {
    if (!state.voteUpdate || !state.voteUpdate.votes) return [];
    return state.voteUpdate.votes
      .filter(v => v.targetId === targetId)
      .map(v => {
        if (state.voteUpdate.anonymous) {
          return { id: v.voterId, isAnonymous: true };
        }
        return state.players.find(p => p.id === v.voterId);
      })
      .filter(Boolean);
  };

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

      {/* God (host) notice — moderator cannot vote */}
      {isGod && (
        <div className="glass p-3 text-center mb-4 text-sm text-neon-amber">
          👁 You are God — you observe the vote but cannot participate.
        </div>
      )}

      {/* Dead player notice */}
      {isDead && !isGod && (
        <div className="glass p-3 text-center mb-4 text-sm text-neon-amber">
          👻 You're dead — your vote won't count, but you can still participate!
        </div>
      )}

      {/* Unified Player Grid (for everyone including God) */}
      <div className="grid grid-cols-3 gap-3 flex-1">
        {state.players.filter(p => !p.isHost).map(player => {
          const voters = getVotersFor(player.id);
          const isSelected = selectedTarget === player.id;
          const isOwn = player.id === state.playerId;
          const canVote = !isGod && !hasVoted && !isOwn && player.isAlive;
          const isFaded = isOwn || !player.isAlive;

          return (
            <motion.button
              key={player.id}
              whileTap={canVote ? { scale: 0.95 } : {}}
              onClick={() => canVote && setSelectedTarget(player.id)}
              disabled={!canVote}
              className={`glass p-3 flex flex-col items-center gap-1 transition-all relative
                ${isSelected ? 'border-neon-red glow-red' : canVote ? 'glass-hover' : ''}
                ${isFaded ? 'opacity-40 grayscale' : ''}
                ${canVote ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <PlayerAvatar avatarIndex={player.avatarIndex} size="sm" showDead={false} />
              <p className="text-xs font-medium truncate w-full text-center mt-1">{player.displayName}</p>
              
              {voters.length > 0 && (
                <p className="text-[10px] text-neon-red font-bold">{voters.length} {voters.length === 1 ? 'vote' : 'votes'}</p>
              )}
              
              {/* Live Votes */}
              {voters.length > 0 && (
                <div className="absolute bottom-2 right-2 flex flex-wrap-reverse gap-1 justify-end max-w-[60px]">
                  {voters.map(voter => (
                    <div key={voter.id} className="w-5 h-5 rounded-full bg-surface border border-deep overflow-hidden shadow-md" title={voter.isAnonymous ? 'Anonymous' : `Voted by ${voter.displayName}`}>
                      {voter.isAnonymous ? (
                         <div className="w-full h-full bg-gray-500 rounded-full" />
                      ) : (
                         <PlayerAvatar avatarIndex={voter.avatarIndex} size="xs" showDead={false} isConnected={voter.isConnected} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Action Buttons & Skip Info */}
      {(() => {
        const skipVoters = getVotersFor(null);
        
        return (
          <div className="mt-6 space-y-3">
            
            {/* Active voting controls */}
            {!isGod && !hasVoted && (
              <>
                <button onClick={handleVote} disabled={!selectedTarget} className="btn-danger w-full">
                  🗳️ Lock Vote
                </button>
                <button onClick={handleSkipVote} className="btn-ghost w-full text-sm py-3 relative flex items-center justify-center transition-transform active:scale-95">
                  <span>Skip Vote</span>
                  {/* Show skipped avatars directly on the button */}
                  {skipVoters.length > 0 && (
                    <div className="absolute right-4 flex gap-1 items-center">
                      {skipVoters.map(voter => (
                        <div key={voter.id} className="w-5 h-5 rounded-full bg-surface border border-deep overflow-hidden shadow-md" title={voter.isAnonymous ? 'Anonymous' : `Skipped by ${voter.displayName}`}>
                          {voter.isAnonymous ? (
                             <div className="w-full h-full bg-gray-500 rounded-full" />
                          ) : (
                             <PlayerAvatar avatarIndex={voter.avatarIndex} size="xs" showDead={false} isConnected={voter.isConnected} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              </>
            )}

            {/* Waiting state */}
            {!isGod && hasVoted && (
              <div className="text-center text-text-muted mb-2">
                ✅ Vote Locked. Waiting for others...
              </div>
            )}

            {/* Display skipped voters for God or players who already voted */}
            {(isGod || hasVoted) && skipVoters.length > 0 && (
              <div className="glass p-3 flex items-center justify-between text-sm">
                <span className="text-text-muted">Skipped:</span>
                <div className="flex gap-1 items-center">
                  {skipVoters.map(voter => (
                    <div key={voter.id} className="w-5 h-5 rounded-full bg-surface border border-deep overflow-hidden shadow-md" title={voter.isAnonymous ? 'Anonymous' : `Skipped by ${voter.displayName}`}>
                      {voter.isAnonymous ? (
                         <div className="w-full h-full bg-gray-500 rounded-full" />
                      ) : (
                         <PlayerAvatar avatarIndex={voter.avatarIndex} size="xs" showDead={false} isConnected={voter.isConnected} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Host force-resolve */}
            {state.isHost && (
              <button onClick={() => emit('game:resolve-voting')} className="btn-ghost w-full text-sm mt-2">
                ⚡ Force End Voting
              </button>
            )}

          </div>
        );
      })()}
    </div>
  );
}
