/**
 * GamePage — renders the correct phase component with a persistent leave button
 */
import { useGame } from '../context/GameContext';
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
      {/* Persistent leave button — visible on all game phases */}
      {state.phase !== 'game_over' && (
        <button
          onClick={leaveRoom}
          className="fixed top-4 right-4 z-40 glass px-3 py-2 text-xs text-neon-red hover:glow-red transition-all rounded-lg"
          title="Leave Room"
        >
          🚪 Leave
        </button>
      )}
      {renderPhase()}
    </div>
  );
}
