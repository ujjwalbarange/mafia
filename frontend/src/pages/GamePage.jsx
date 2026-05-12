/**
 * GamePage — renders the correct phase component
 */
import { useGame } from '../context/GameContext';
import RoleRevealPhase from '../components/game/RoleRevealPhase';
import NightPhase from '../components/game/NightPhase';
import DayPhase from '../components/game/DayPhase';
import VotingPhase from '../components/game/VotingPhase';
import GameOverPhase from '../components/game/GameOverPhase';

export default function GamePage() {
  const { state } = useGame();

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
}
