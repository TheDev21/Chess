import { Suspense, lazy, useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { Navigation } from "./components/Navigation/Navigation";
import { SettingsPanel } from "./components/Settings/SettingsPanel";
import { Spotlight, type SpotlightStep } from "./components/Tutorial/Spotlight";
import { UpdatePrompt } from "./components/UpdatePrompt/UpdatePrompt";
import { ConnectionStatus } from "./components/ConnectionStatus/ConnectionStatus";
import { isTutorialSeen } from "./services/storage/tutorialProgress";
import { useSettings } from "./hooks/useSettings";
import bgPremiumTexture from "./assets/bg-premium-texture.webp";

const Home = lazy(() => import("./pages/Home/Home").then((m) => ({ default: m.Home })));
const Learn = lazy(() => import("./pages/Learn/Learn").then((m) => ({ default: m.Learn })));
const Lesson = lazy(() => import("./pages/Learn/Lesson").then((m) => ({ default: m.Lesson })));
const PlayHub = lazy(() => import("./pages/Play/PlayHub").then((m) => ({ default: m.PlayHub })));
const PassAndPlay = lazy(() => import("./pages/Play/PassAndPlay").then((m) => ({ default: m.PassAndPlay })));
const VsComputer = lazy(() => import("./pages/Play/VsComputer").then((m) => ({ default: m.VsComputer })));
const OnlineLobby = lazy(() => import("./pages/Play/OnlineLobby").then((m) => ({ default: m.OnlineLobby })));
const OnlineGame = lazy(() => import("./pages/Play/OnlineGame").then((m) => ({ default: m.OnlineGame })));
const Puzzles = lazy(() => import("./pages/Puzzles/Puzzles").then((m) => ({ default: m.Puzzles })));
const Analysis = lazy(() => import("./pages/Analysis/Analysis").then((m) => ({ default: m.Analysis })));
const Progress = lazy(() => import("./pages/Progress/Progress").then((m) => ({ default: m.Progress })));

export const SITE_TOUR_ID = "site-tour";
const SITE_TOUR_STEPS: SpotlightStep[] = [
  { targetId: "nav-home", title: "Home", body: "Your dashboard. Jump back into your current lesson, today's puzzle, and see your progress." },
  { targetId: "nav-learn", title: "Learn", body: "Watch how a piece moves, try it yourself on a real board, then take on a mini challenge." },
  { targetId: "nav-play", title: "Play", body: "Play a friend or Stockfish. Move Coach explains the ideas behind every move." },
  { targetId: "nav-puzzles", title: "Puzzles", body: "A daily puzzle, the full set, or practice by theme. Your pick." },
  { targetId: "nav-progress", title: "Progress", body: "Lessons completed, puzzles solved, games played, your streak. All in one place." },
];

// A minimal, on-brand fallback for the brief gap while a route's chunk
// downloads - a single pulsing gold ring, nothing that competes with the
// page about to replace it.
function RouteLoading() {
  return (
    <div className="flex h-full min-h-[240px] w-full items-center justify-center" role="status" aria-label="Loading">
      <div className="h-10 w-10 animate-pulse rounded-full border-2 border-accent/30 border-t-accent" />
    </div>
  );
}

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings, update } = useSettings();
  const [showSiteTour, setShowSiteTour] = useState(false);

  useEffect(() => {
    if (!isTutorialSeen(SITE_TOUR_ID)) setShowSiteTour(true);
  }, []);

  return (
    <div
      className="flex h-[100dvh] flex-col overflow-hidden bg-bg lg:flex-row"
      style={{
        backgroundImage: `linear-gradient(rgba(10,23,16,0.78), rgba(10,23,16,0.88)), url(${bgPremiumTexture})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <Navigation onOpenSettings={() => setSettingsOpen(true)} />
      <main className="mx-auto w-full flex-1 overflow-y-auto px-5 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-6 sm:py-6 lg:max-w-6xl lg:pb-6 short:pt-0 short:pb-2">
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/learn/:chapterId/:lessonId" element={<Lesson />} />
            <Route path="/play" element={<PlayHub />} />
            <Route path="/play/friend" element={<PassAndPlay settings={settings} />} />
            <Route path="/play/computer" element={<VsComputer settings={settings} />} />
            <Route path="/play/online" element={<OnlineLobby />} />
            <Route path="/play/online/:roomId" element={<OnlineGame settings={settings} />} />
            <Route path="/puzzles" element={<Puzzles />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/progress" element={<Progress />} />
          </Routes>
        </Suspense>
      </main>
      <SettingsPanel open={settingsOpen} settings={settings} onChange={update} onClose={() => setSettingsOpen(false)} />
      {showSiteTour && <Spotlight tutorialId={SITE_TOUR_ID} steps={SITE_TOUR_STEPS} onDone={() => setShowSiteTour(false)} />}
      <ConnectionStatus />
      <UpdatePrompt />
    </div>
  );
}
