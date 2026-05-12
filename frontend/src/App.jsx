/**
 * App — Main router component
 * Routes between landing, lobby, game, and admin screens
 */
import { useGame } from './context/GameContext';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import AdminPage from './pages/AdminPage';
import Notification from './components/ui/Notification';

function GameApp() {
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

export default function App() {
  return (
    <Routes>
      <Route path="/adgxyz05" element={<AdminPage />} />
      <Route path="*" element={<GameApp />} />
    </Routes>
  );
}
