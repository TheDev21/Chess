import { Link, Route, Routes } from "react-router-dom";
import { Home } from "./pages/Home";
import { PassAndPlay } from "./pages/PassAndPlay";
import { VsAI } from "./pages/VsAI";
import { OnlineLobby } from "./pages/OnlineLobby";
import { OnlineGame } from "./pages/OnlineGame";

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          ♟ Chess
        </Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pass-and-play" element={<PassAndPlay />} />
          <Route path="/vs-ai" element={<VsAI />} />
          <Route path="/online" element={<OnlineLobby />} />
          <Route path="/online/:roomId" element={<OnlineGame />} />
        </Routes>
      </main>
    </div>
  );
}
