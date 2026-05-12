/**
 * AdminPage — Room management dashboard
 * Accessible at /adgxyz05
 */
import { useState, useEffect, useCallback } from 'react';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';
const API_BASE = `${SERVER_URL}/api/admin/adgxyz05`;

const PHASE_LABELS = {
  lobby: { label: 'Lobby', color: 'text-cyan-400', dot: 'bg-cyan-400' },
  role_assignment: { label: 'Roles', color: 'text-purple-400', dot: 'bg-purple-400' },
  night: { label: 'Night', color: 'text-indigo-400', dot: 'bg-indigo-400' },
  day_discussion: { label: 'Day', color: 'text-amber-400', dot: 'bg-amber-400' },
  voting: { label: 'Voting', color: 'text-red-400', dot: 'bg-red-400' },
  game_over: { label: 'Game Over', color: 'text-gray-400', dot: 'bg-gray-400' }
};

function formatTime(ms) {
  if (!ms || ms <= 0) return '—';
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return min > 0 ? `${min}m ${s}s` : `${s}s`;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

export default function AdminPage() {
  const [rooms, setRooms] = useState([]);
  const [dbOnlyRooms, setDbOnlyRooms] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchRooms = useCallback(async () => {
    try {
      setError('');
      const res = await fetch(`${API_BASE}/rooms`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setRooms(data.activeRooms || []);
        setDbOnlyRooms(data.dbOnlyRooms || []);
        setLastRefresh(new Date());
      } else {
        setError(data.error || 'Failed to fetch');
      }
    } catch (err) {
      setError(`Connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000); // Auto-refresh every 5s
    return () => clearInterval(interval);
  }, [fetchRooms]);

  const allRooms = [...rooms, ...dbOnlyRooms];

  const toggleSelect = (roomId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === allRooms.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allRooms.map(r => r.roomId)));
    }
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/rooms`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roomIds: Array.from(selected) })
      });
      const data = await res.json();
      if (data.success) {
        setSelected(new Set());
        setConfirmDelete(false);
        fetchRooms();
      } else {
        setError(data.error || 'Delete failed');
      }
    } catch (err) {
      setError(`Delete error: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05050f] text-white p-4 md:p-8 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            🎭 Admin Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {lastRefresh ? `Last refresh: ${lastRefresh.toLocaleTimeString()}` : 'Loading...'}
            {' · '}Auto-refreshes every 5s
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchRooms}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm transition-colors"
          >
            🔄 Refresh
          </button>
          <a href="/" className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm transition-colors">
            ← Back to Game
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider">Active Rooms</p>
          <p className="text-2xl font-bold text-cyan-400">{rooms.length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider">DB-Only Rooms</p>
          <p className="text-2xl font-bold text-amber-400">{dbOnlyRooms.length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider">Total Players</p>
          <p className="text-2xl font-bold text-purple-400">
            {rooms.reduce((sum, r) => sum + r.connectedCount, 0)}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider">Selected</p>
          <p className="text-2xl font-bold text-red-400">{selected.size}</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex items-center gap-3 mb-4">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-400 hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={allRooms.length > 0 && selected.size === allRooms.length}
            onChange={toggleSelectAll}
            className="w-4 h-4 rounded bg-white/10 border-white/20 accent-purple-500"
          />
          Select All
        </label>
        <div className="flex-1" />
        {selected.size > 0 && !confirmDelete && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors"
          >
            🗑️ Delete ({selected.size})
          </button>
        )}
        {confirmDelete && (
          <div className="flex items-center gap-2">
            <span className="text-red-400 text-sm">Delete {selected.size} room(s)?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-bold transition-colors disabled:opacity-50"
            >
              {deleting ? '⏳ Deleting...' : '✓ Confirm Delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-4 py-2 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Room List */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading rooms...</div>
      ) : allRooms.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🏚️</p>
          <p className="text-gray-500">No rooms found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Active rooms first */}
          {rooms.length > 0 && (
            <p className="text-xs text-gray-500 uppercase tracking-wider px-1">Active Rooms (In Memory)</p>
          )}
          {rooms.map(room => (
            <RoomCard
              key={room.roomId}
              room={room}
              isSelected={selected.has(room.roomId)}
              onToggle={() => toggleSelect(room.roomId)}
            />
          ))}

          {/* DB-only rooms */}
          {dbOnlyRooms.length > 0 && (
            <p className="text-xs text-gray-500 uppercase tracking-wider px-1 mt-6">Database-Only Rooms (Stale)</p>
          )}
          {dbOnlyRooms.map(room => (
            <RoomCard
              key={room.roomId}
              room={room}
              isSelected={selected.has(room.roomId)}
              onToggle={() => toggleSelect(room.roomId)}
              isStale
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RoomCard({ room, isSelected, onToggle, isStale = false }) {
  const [expanded, setExpanded] = useState(false);
  const phaseInfo = PHASE_LABELS[room.phase] || { label: room.phase, color: 'text-gray-400', dot: 'bg-gray-400' };

  return (
    <div
      className={`rounded-xl border transition-all ${
        isSelected
          ? 'bg-red-500/10 border-red-500/40'
          : isStale
            ? 'bg-amber-500/5 border-amber-500/20'
            : 'bg-white/5 border-white/10 hover:border-white/20'
      }`}
    >
      <div className="flex items-center gap-4 p-4">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="w-4 h-4 rounded bg-white/10 border-white/20 accent-purple-500 flex-shrink-0"
        />

        {/* Room Code */}
        <div className="w-20">
          <span className="font-mono font-bold text-lg tracking-wider text-purple-400">
            {room.roomCode}
          </span>
        </div>

        {/* Phase badge */}
        <div className="flex items-center gap-1.5 w-28">
          <div className={`w-2 h-2 rounded-full ${phaseInfo.dot} ${!isStale ? 'animate-pulse' : ''}`} />
          <span className={`text-sm font-medium ${phaseInfo.color}`}>{phaseInfo.label}</span>
          {room.round > 0 && <span className="text-xs text-gray-500">R{room.round}</span>}
        </div>

        {/* Players */}
        <div className="flex items-center gap-1.5 w-32">
          <span className="text-green-400 font-medium">{room.connectedCount}</span>
          <span className="text-gray-600">/</span>
          <span className="text-gray-400">{room.totalPlayers}</span>
          <span className="text-xs text-gray-600">players</span>
        </div>

        {/* Cleanup timer */}
        <div className="flex-1 text-right">
          {room.isCleanupScheduled ? (
            <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">
              ⏱️ Purge in {formatTime(room.cleanupRemainingMs)}
            </span>
          ) : isStale ? (
            <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-full">
              {room.dbStatus || 'stale'}
            </span>
          ) : (
            <span className="text-xs text-green-400/60">active</span>
          )}
        </div>

        {/* Expand button */}
        {room.players && room.players.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 hover:text-white text-sm transition-colors px-2"
          >
            {expanded ? '▲' : '▼'}
          </button>
        )}
      </div>

      {/* Expanded player list */}
      {expanded && room.players && room.players.length > 0 && (
        <div className="border-t border-white/5 px-4 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {room.players.map(p => (
              <div
                key={p.id}
                className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
                  p.isConnected ? 'bg-green-500/10' : 'bg-red-500/10'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${p.isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="font-medium truncate">{p.displayName}</span>
                {p.isHost && <span className="text-amber-400">👁</span>}
                {p.role && <span className="text-gray-500 ml-auto">{p.role}</span>}
                {!p.isAlive && <span className="text-gray-600">💀</span>}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-600 mt-2">ID: {room.roomId}</p>
          {room.createdAt && <p className="text-[10px] text-gray-600">Created: {formatDate(room.createdAt)}</p>}
        </div>
      )}
    </div>
  );
}
