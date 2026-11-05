import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Trash2, Upload } from "lucide-react";
import { deleteGame, listGames, saveGame } from "../../services/storage/gameHistory";
import { Chess } from "chess.js";

/** The saved-games list + PGN import/export, reused inside the Progress page. */
export function GameHistoryList({ showHeading = true }: { showHeading?: boolean }) {
  const navigate = useNavigate();
  const [games, setGames] = useState(() => listGames());
  const [importError, setImportError] = useState<string | null>(null);

  const refresh = () => setGames(listGames());

  const handleDelete = (id: string) => {
    deleteGame(id);
    refresh();
  };

  const handleExport = (pgn: string, id: string) => {
    const blob = new Blob([pgn], { type: "application/x-chess-pgn" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `game-${id.slice(0, 8)}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setImportError(null);
    try {
      const test = new Chess();
      test.loadPgn(text);
      if (test.history().length === 0) throw new Error("empty");
      saveGame({
        id: crypto.randomUUID(),
        playedAt: new Date().toISOString(),
        mode: "friend",
        opponent: "Imported",
        playerColor: "white",
        result: test.header().Result || "*",
        moveCount: test.history().length,
        pgn: text,
      });
      refresh();
    } catch {
      setImportError("That file doesn't look like a valid PGN.");
    }
    e.target.value = "";
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        {showHeading ? <h2 className="text-[16px] font-semibold text-ink">Recent games</h2> : <span />}
        <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-[12px] font-medium text-ink shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-panel">
          <Upload className="h-3.5 w-3.5" /> Import PGN
          <input type="file" accept=".pgn,text/plain" className="hidden" onChange={handleImport} />
        </label>
      </div>
      {importError && <p className="mb-3 text-[13px] text-blunder">{importError}</p>}

      {games.length === 0 ? (
        <p className="text-[14px] text-muted">No games saved yet. Finish a game or import a PGN to see it here.</p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-surface shadow-card">
          {games.map((g) => (
            <div key={g.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <div className="text-[14px] font-medium text-ink">
                  {g.opponent} · {g.result}
                </div>
                <div className="mt-0.5 text-[12px] text-muted">
                  {new Date(g.playedAt).toLocaleString()} · {g.playerColor} · {g.mode} · {g.moveCount} moves
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  onClick={() => navigate("/analysis", { state: { pgn: g.pgn } })}
                  className="rounded-full border border-border px-3 py-1.5 text-[12px] font-medium text-ink transition-colors duration-200 hover:bg-accent/[0.05]"
                >
                  Review
                </button>
                <button
                  onClick={() => handleExport(g.pgn, g.id)}
                  aria-label="Export PGN"
                  className="rounded-full border border-border p-2 text-ink transition-colors duration-200 hover:bg-accent/[0.05]"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(g.id)}
                  aria-label="Delete game"
                  className="rounded-full border border-border p-2 text-blunder transition-colors duration-200 hover:border-blunder/40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
