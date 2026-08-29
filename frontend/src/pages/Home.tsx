import { Link } from "react-router-dom";
import { HAS_BACKEND } from "../api/client";

export function Home() {
  return (
    <div className="page home-page">
      <h1>Chess</h1>
      <p className="muted">Play chess three ways, with a plain-English move coach along the way.</p>
      <div className="mode-grid">
        <Link className="mode-card" to="/pass-and-play">
          <h2>Pass and Play</h2>
          <p>Two players, one device. The board flips each turn.</p>
        </Link>
        <Link className="mode-card" to="/vs-ai">
          <h2>vs AI</h2>
          <p>Play against a minimax + alpha-beta engine with adjustable difficulty.</p>
        </Link>
        {HAS_BACKEND ? (
          <Link className="mode-card" to="/online">
            <h2>1v1 Online</h2>
            <p>Create a game, share the link, play live with a friend.</p>
          </Link>
        ) : (
          <div className="mode-card mode-card-disabled" aria-disabled="true">
            <h2>1v1 Online</h2>
            <p>Needs a running backend server - not available on this static build. Run it locally to try it.</p>
          </div>
        )}
      </div>
    </div>
  );
}
