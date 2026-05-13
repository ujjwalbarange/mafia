/**
 * GamePage — renders the correct phase component with persistent role bar and leave button
 */
import { useGame } from '../context/GameContext';
import RoleBar from '../components/ui/RoleBar';
import RoleRevealPhase from '../components/game/RoleRevealPhase';
import NightPhase from '../components/game/NightPhase';
import DayPhase from '../components/game/DayPhase';
import VotingPhase from '../components/game/VotingPhase';
import GameOverPhase from '../components/game/GameOverPhase';

export default function GamePage() {
  const { state, leaveRoom } = useGame();

  const renderPhase = () => {
    switch (state.phase) {
      case 'role_assignment':
        return <RoleRevealPhase />;
      case 'night':
        return <NightPhase />;
      case 'day_discussion':
        return <DayPhase />;
      case 'voting':
        return <VotingPhase />;
      case 'game_over':
        return <GameOverPhase />;
      default:
        return (
          <div className="min-h-screen flex items-center justify-center">
            <p className="text-text-muted">Loading game...</p>
          </div>
        );
    }
  };

  return (
    <div className="relative">
      {/* Persistent role bar — like Scribbl's word bar */}
      {state.phase !== 'game_over' && <RoleBar />}

      {/* Persistent leave button — visible on all game phases */}
      {state.phase !== 'game_over' && (
        <button
          onClick={leaveRoom}
          className="fixed top-14 right-4 z-40 glass px-3 py-2 text-xs text-neon-red hover:glow-red transition-all rounded-lg"
          title="Leave Room"
        >
          🚪 Leave
        </button>
      )}
      {/* Pause Overlay if God disconnects */}
      {state.isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="glass p-8 w-full max-w-sm text-center flex flex-col items-center gap-6 animate-pulse-slow border-neon-amber/50">
            <div className="text-5xl animate-bounce">📡</div>
            <h2 className="font-display text-2xl font-bold text-neon-amber">Game Paused</h2>
            <p className="text-text-secondary">{state.pauseReason || 'Waiting for connection...'}</p>
            <div className="w-8 h-8 border-4 border-neon-amber/30 border-t-neon-amber rounded-full animate-spin mt-2" />
            <button onClick={leaveRoom} className="text-xs text-neon-red hover:text-red-400 mt-4 transition-colors">
              🚪 Leave Room Instead
            </button>
          </div>
        </div>
      )}

      {renderPhase()}
    </div>
  );
}
