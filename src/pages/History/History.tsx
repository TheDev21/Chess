import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Trash2, Upload } from "lucide-react";
import { deleteGame, listGames, saveGame } from "../../services/storage/gameHistory";
import { Chess } from "chess.js";

export function History() {
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
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-[20px] font-medium text-ink dark:text-ink-dark">Game History</h1>
        <label className="flex cursor-pointer items-center gap-1 rounded border border-border px-3 py-1.5 text-[12px] text-ink dark:border-border-dark dark:text-ink-dark">
          <Upload className="h-3.5 w-3.5" /> Import PGN
          <input type="file" accept=".pgn,text/plain" className="hidden" onChange={handleImport} />
        </label>
      </div>
      {importError && <p className="mb-3 text-[13px] text-blunder">{importError}</p>}

      {games.length === 0 ? (
        <p className="text-[13px] text-muted dark:text-muted-dark">No games saved yet. Finish a game or import a PGN to see it here.</p>
      ) : (
        <div className="divide-y divide-border rounded border border-border dark:divide-border-dark dark:border-border-dark">
          {games.map((g) => (
            <div key={g.id} className="flex items-center justify-between gap-3 p-3">
              <div>
                <div className="text-[13px] font-medium text-ink dark:text-ink-dark">
                  {g.opponent} · {g.result}
                </div>
                <div className="text-[12px] text-muted dark:text-muted-dark">
                  {new Date(g.playedAt).toLocaleString()} · {g.playerColor} · {g.mode} · {g.moveCount} moves
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => navigate("/analysis", { state: { pgn: g.pgn } })}
                  className="rounded border border-border px-2 py-1 text-[12px] text-ink dark:border-border-dark dark:text-ink-dark"
                >
                  Review
                </button>
                <button onClick={() => handleExport(g.pgn, g.id)} aria-label="Export PGN" className="rounded border border-border p-1.5 text-ink dark:border-border-dark dark:text-ink-dark">
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(g.id)} aria-label="Delete game" className="rounded border border-border p-1.5 text-blunder dark:border-border-dark">
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
