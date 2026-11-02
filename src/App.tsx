import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import { Navigation } from "./components/Navigation/Navigation";
import { SettingsPanel } from "./components/Settings/SettingsPanel";
import { useSettings } from "./hooks/useSettings";
import { Home } from "./pages/Play/Home";
import { PassAndPlay } from "./pages/Play/PassAndPlay";
import { VsComputer } from "./pages/Play/VsComputer";
import { OnlineLobby } from "./pages/Play/OnlineLobby";
import { OnlineGame } from "./pages/Play/OnlineGame";
import { Puzzles } from "./pages/Puzzles/Puzzles";
import { Analysis } from "./pages/Analysis/Analysis";
import { History } from "./pages/History/History";

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings, update } = useSettings();

  return (
    <div className="min-h-screen bg-bg dark:bg-bg-dark">
      <Navigation onOpenSettings={() => setSettingsOpen(true)} />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/play/friend" element={<PassAndPlay settings={settings} />} />
          <Route path="/play/computer" element={<VsComputer settings={settings} />} />
          <Route path="/play/online" element={<OnlineLobby />} />
          <Route path="/play/online/:roomId" element={<OnlineGame settings={settings} />} />
          <Route path="/puzzles" element={<Puzzles />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </main>
      <SettingsPanel open={settingsOpen} settings={settings} onChange={update} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
