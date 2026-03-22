import { HashRouter, Routes, Route } from 'react-router-dom';
import { Welcome } from './pages/Welcome';
import { Game } from './pages/Game';
import { GamePlayer } from './pages/GamePlayer';
import { LobbyAdmin } from './pages/LobbyAdmin';
import { LobbyPlayer } from './pages/LobbyPlayer';
import { Settings } from './pages/Settings';
import { Tutorial } from './pages/Tutorial';
import './App.css';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/lobby-admin" element={<LobbyAdmin />} />
        <Route path="/lobby-player" element={<LobbyPlayer />} />
        <Route path="/game-admin" element={<Game />} />
        <Route path="/game-player" element={<GamePlayer />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/tutorial" element={<Tutorial />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
