/**
 * DayPhase — discussion timer with alive/dead player list
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../../context/SocketContext';
import { useGame } from '../../context/GameContext';
import PlayerAvatar from '../ui/PlayerAvatar';
import Timer from '../ui/Timer';

export default function DayPhase() {
  const { emit } = useSocket();
  const { state } = useGame();
  const [killedInfo, setKilledInfo] = useState(null);
  const [showKilled, setShowKilled] = useState(true);

  // Capture killed player info from phase change data
  useEffect(() => {
    if (state.killedPlayerId) {
      setKilledInfo({
        id: state.killedPlayerId,
        name: state.killedPlayerName,
        wasSaved: false
      });
    } else if (state.wasSaved) {
      setKilledInfo({ wasSaved: true });
    }
    // Hide killed announcement after 5 seconds
    const t = setTimeout(() => setShowKilled(false), 5000);
    return () => clearTimeout(t);
  }, [state.killedPlayerId, state.wasSaved]);

  const handleStartVoting = async () => {
    await emit('game:start-voting');
  };

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <p className="text-xs text-text-muted uppercase tracking-wider">Day · Round {state.round}</p>
        <h2 className="font-display text-2xl font-bold mt-1">☀️ Discussion</h2>
      </div>

      {/* Night result announcement */}
      {showKilled && killedInfo && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 text-center mb-6"
        >
          {killedInfo.wasSaved ? (
            <h2 className="font-display text-2xl font-bold tracking-wide text-white">
              The Mafia failed to eliminate anyone.
            </h2>
          ) : killedInfo.id ? (
            <>
              <h2 className="font-display text-3xl font-bold tracking-wide text-white mb-2">
                {killedInfo.name} was found dead.
              </h2>
            </>
          ) : (
            <h2 className="font-display text-2xl font-bold tracking-wide text-white">
              No one died tonight.
            </h2>
          )}
        </motion.div>
      )}

      {/* Timer */}
      {state.discussionDeadline && (
        <div className="flex justify-center mb-6">
          <Timer deadline={state.discussionDeadline} label="Discussion" />
        </div>
      )}

      {/* Player status grid */}
      <div className="flex-1">
        <h3 className="font-display font-semibold text-sm text-text-muted uppercase tracking-wider mb-3">Players</h3>
        <div className="grid grid-cols-3 gap-3">
          {state.players.map(player => (
            <motion.div
              key={player.id}
              className={`glass p-3 flex flex-col items-center gap-2 ${!player.isAlive ? 'opacity-40' : ''}`}
            >
              <PlayerAvatar avatarIndex={player.avatarIndex} isAlive={player.isAlive} isConnected={player.isConnected} size="sm" />
              <p className="text-xs font-medium truncate w-full text-center">{player.displayName}</p>
              {!player.isAlive && <span className="text-xs text-neon-red">💀 Dead</span>}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Host voting control */}
      {state.isHost && (
        <div className="mt-6">
          <button onClick={handleStartVoting} className="btn-danger w-full text-lg py-4">
            🗳️ Start Official Voting
          </button>
        </div>
      )}

      {!state.isHost && (
        <div className="mt-6 text-center text-text-muted text-sm">
          <p>Discuss with your group. The host will start voting when ready.</p>
        </div>
      )}
    </div>
  );
}
