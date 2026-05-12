/**
 * LobbyPage — room waiting area with settings, player list, and role assignment
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';
import PlayerAvatar from '../components/ui/PlayerAvatar';

const ROLE_LABELS = {
  god: { label: 'God', emoji: '👁', color: 'text-neon-amber' },
  civilian: { label: 'Civilian', emoji: '👤', color: 'text-text-secondary' },
  impostor: { label: 'Impostor', emoji: '🐺', color: 'text-neon-red' },
  doctor: { label: 'Doctor', emoji: '🏥', color: 'text-neon-green' },
  police: { label: 'Police', emoji: '🔍', color: 'text-neon-blue' }
};

export default function LobbyPage() {
  const { emit } = useSocket();
  const { state, leaveRoom } = useGame();
  const [showSettings, setShowSettings] = useState(false);
  const [showRoleAssign, setShowRoleAssign] = useState(false);
  const [roleAssignments, setRoleAssignments] = useState({});
  const [settings, setSettings] = useState(state.settings || {
    discussionTimer: 120, votingTimer: 30, anonymousVoting: false,
    confirmEjects: true, numImpostors: 1, enableDoctor: true, enablePolice: true, maxPlayers: 10
  });
  const [error, setError] = useState('');

  const shareLink = `${window.location.origin}?room=${state.roomCode}`;

  const copyCode = () => {
    navigator.clipboard?.writeText(state.roomCode);
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(shareLink);
  };

  const toggleReady = async () => {
    await emit('player:ready');
  };

  const saveSettings = async () => {
    const res = await emit('game:settings', { settings });
    if (res?.success) setShowSettings(false);
  };

  const assignRole = (playerId, role) => {
    setRoleAssignments(prev => ({ ...prev, [playerId]: role }));
  };

  // Non-host players only (host is God, not a player)
  const nonHostPlayers = state.players.filter(p => !p.isHost);

  const startGame = async () => {
    setError('');
    // Ensure all non-host players have roles assigned
    const unassigned = nonHostPlayers.filter(p => !roleAssignments[p.id]);
    const updated = { ...roleAssignments };
    if (unassigned.length > 0) {
      // Auto-assign remaining as civilian
      unassigned.forEach(p => { updated[p.id] = 'civilian'; });
      setRoleAssignments(updated);
    }
    const res = await emit('game:assign-roles', { assignments: updated });
    if (!res?.success) return setError(res?.error || 'Failed to assign roles');
  };

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={leaveRoom} className="text-text-muted hover:text-text-primary text-sm transition-colors">
          ← Leave
        </button>
        <div className="text-center">
          <p className="text-xs text-text-muted uppercase tracking-wider">Room Code</p>
          <button onClick={copyCode} className="font-display text-2xl font-bold tracking-[0.2em] text-neon-purple hover:text-glow-purple transition-all">
            {state.roomCode}
          </button>
        </div>
        {state.isHost && (
          <button onClick={() => setShowSettings(!showSettings)} className="text-text-muted hover:text-text-primary text-sm">
            ⚙️
          </button>
        )}
      </div>

      {/* Share Link */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-3 mb-6 flex items-center gap-3">
        <span className="text-xs text-text-muted truncate flex-1">{shareLink}</span>
        <button onClick={copyLink} className="text-xs text-neon-cyan hover:underline whitespace-nowrap">Copy Link</button>
      </motion.div>

      {/* Settings Panel (host only) */}
      {showSettings && state.isHost && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass p-5 mb-6">
          <h3 className="font-display font-semibold mb-4 text-neon-cyan">⚙️ Game Settings</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm text-text-secondary">Discussion Timer (sec)</label>
              <input type="number" value={settings.discussionTimer} onChange={e => setSettings(s => ({...s, discussionTimer: +e.target.value}))}
                className="input-field w-20 text-center text-sm" min={30} max={600} />
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm text-text-secondary">Voting Timer (sec)</label>
              <input type="number" value={settings.votingTimer} onChange={e => setSettings(s => ({...s, votingTimer: +e.target.value}))}
                className="input-field w-20 text-center text-sm" min={10} max={120} />
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm text-text-secondary">Impostors</label>
              <input type="number" value={settings.numImpostors} onChange={e => setSettings(s => ({...s, numImpostors: +e.target.value}))}
                className="input-field w-20 text-center text-sm" min={1} max={4} />
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm text-text-secondary">Anonymous Voting</label>
              <button onClick={() => setSettings(s => ({...s, anonymousVoting: !s.anonymousVoting}))}
                className={`w-12 h-6 rounded-full transition-colors ${settings.anonymousVoting ? 'bg-neon-purple' : 'bg-surface'}`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.anonymousVoting ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm text-text-secondary">Confirm Ejects</label>
              <button onClick={() => setSettings(s => ({...s, confirmEjects: !s.confirmEjects}))}
                className={`w-12 h-6 rounded-full transition-colors ${settings.confirmEjects ? 'bg-neon-purple' : 'bg-surface'}`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.confirmEjects ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm text-text-secondary">Enable Doctor</label>
              <button onClick={() => setSettings(s => ({...s, enableDoctor: !s.enableDoctor}))}
                className={`w-12 h-6 rounded-full transition-colors ${settings.enableDoctor ? 'bg-neon-green' : 'bg-surface'}`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.enableDoctor ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm text-text-secondary">Enable Police</label>
              <button onClick={() => setSettings(s => ({...s, enablePolice: !s.enablePolice}))}
                className={`w-12 h-6 rounded-full transition-colors ${settings.enablePolice ? 'bg-neon-blue' : 'bg-surface'}`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.enablePolice ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm text-text-secondary">Max Players</label>
              <input type="number" value={settings.maxPlayers} onChange={e => setSettings(s => ({...s, maxPlayers: +e.target.value}))}
                className="input-field w-20 text-center text-sm" min={4} max={15} />
            </div>
            <button onClick={saveSettings} className="btn-primary w-full">Save Settings</button>
          </div>
        </motion.div>
      )}

      {/* Player List */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-lg">
            Players ({nonHostPlayers.length}{settings.maxPlayers ? `/${settings.maxPlayers}` : ''})
          </h3>
          {state.isHost && nonHostPlayers.length >= 3 && (
            <button onClick={() => setShowRoleAssign(!showRoleAssign)} className="text-xs text-neon-purple hover:underline">
              {showRoleAssign ? 'Hide Roles' : 'Assign Roles'}
            </button>
          )}
        </div>

        <div className="space-y-3">
          {state.players.map((player, i) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass glass-hover p-4 flex items-center gap-4"
            >
              <PlayerAvatar avatarIndex={player.avatarIndex} isConnected={player.isConnected} showDead={false} />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {player.displayName}
                  {player.isHost && <span className="ml-2 text-xs text-neon-amber">👁 God</span>}
                  {player.id === state.playerId && <span className="ml-2 text-xs text-neon-cyan">(You)</span>}
                </p>
                <p className="text-xs text-text-muted">
                  {player.isHost
                    ? '🎭 Moderator'
                    : !player.isConnected ? '⚠️ Disconnected' : player.isReady ? '✅ Ready' : '⏳ Not ready'}
                </p>
              </div>
              {/* Role assignment dropdown (host only, not for God) */}
              {showRoleAssign && state.isHost && !player.isHost && (
                <select
                  value={roleAssignments[player.id] || 'civilian'}
                  onChange={(e) => assignRole(player.id, e.target.value)}
                  className="input-field w-28 text-xs py-2"
                >
                  <option value="civilian">👤 Civilian</option>
                  <option value="impostor">🐺 Impostor</option>
                  {settings.enableDoctor && <option value="doctor">🏥 Doctor</option>}
                  {settings.enablePolice && <option value="police">🔍 Police</option>}
                </select>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && <p className="text-neon-red text-sm text-center mt-4">{error}</p>}

      {/* Bottom Actions */}
      <div className="mt-6 space-y-3">
        {!state.isHost && (
          <button onClick={toggleReady} className="btn-ghost w-full">
            {state.players.find(p => p.id === state.playerId)?.isReady ? '✅ Ready — Tap to Unready' : '⏳ Tap to Ready Up'}
          </button>
        )}
        {state.isHost && showRoleAssign && (
          <button onClick={startGame} className="btn-primary w-full text-lg py-4 glow-purple" disabled={nonHostPlayers.length < 3}>
            🎮 Start Game
          </button>
        )}
        {state.isHost && !showRoleAssign && nonHostPlayers.length >= 3 && (
          <button onClick={() => setShowRoleAssign(true)} className="btn-primary w-full">
            Assign Roles to Start
          </button>
        )}
        {nonHostPlayers.length < 3 && (
          <p className="text-center text-text-muted text-sm">Need at least 3 players (+ God) to start</p>
        )}
      </div>
    </div>
  );
}
