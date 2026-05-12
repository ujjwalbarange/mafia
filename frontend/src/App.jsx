/**
 * App — Main router component
 * Routes between landing, lobby, and game screens based on game state
 */
import { useGame } from './context/GameContext';
import LandingPage from './pages/LandingPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import Notification from './components/ui/Notification';

export default function App() {
  const { state } = useGame();

  // If we have a roomId, we're in a game
  const inRoom = !!state.roomId;
  const inGame = inRoom && state.phase !== 'lobby';

  return (
    <>
      {/* Animated background layers */}
      <div className="bg-nebula" />
      <div className="bg-stars" />

      {/* Notification toast */}
      {state.notification && <Notification message={state.notification} />}

      {/* Page routing based on game state */}
      <div className="relative z-10 min-h-screen">
        {!inRoom && <LandingPage />}
        {inRoom && !inGame && <LobbyPage />}
        {inRoom && inGame && <GamePage />}
      </div>
    </>
  );
}
