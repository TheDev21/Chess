# Chess

A chess platform: play a friend locally, play Stockfish in your browser, play
online with a shareable link, get move-by-move feedback from Move Coach,
solve tactics puzzles, and review completed games.

## Play it now

**[thedev21.github.io/Chess](https://thedev21.github.io/Chess/)** - free,
static, no account. Every mode works on this build, including Play Online:
Stockfish runs client-side in a Web Worker, and online multiplayer runs on
Supabase (Postgres + Realtime + Edge Functions) - see "Multiplayer backend"
below. There is nothing to self-host.

## What's here

- **Play a Friend** - pass-and-play on one device, with captured pieces,
  check/checkmate/stalemate detection, castling, en passant, promotion
  (with a real piece-choice picker, not a silent queen default),
  resignation, draw offers, undo, and auto board-flip.
- **Play Computer** - Stockfish 19 (WASM, single-threaded lite build) runs
  directly in a Web Worker. Five difficulty tiers (Beginner through Expert)
  via Stockfish's `UCI_LimitStrength`/`UCI_Elo` options, not just a label on
  the same strength. Color choice and six time controls with a real,
  ticking clock.
- **Play Online** - Supabase-backed multiplayer. Every move, seat
  assignment, resignation, and draw offer goes through a Supabase Edge
  Function that validates it with `chess.js` server-side (the browser never
  writes to the database directly); the room's row in Postgres is the only
  source of truth, and Supabase Realtime pushes updates to both players. A
  shareable link with a copy button; live connection indicators via Realtime
  Presence; resign and draw-offer flows.
- **Move Coach** - classifies every move (Best / Excellent / Good /
  Inaccuracy / Mistake / Blunder) by running Stockfish on the position
  *before* your move (what it would have played) and *after* (what you
  actually got), so it can tell a genuine blunder from an already-bad
  position. Explanations are generated deterministically from the engine's
  own output and the move's actual flags (captures, checks, castling,
  development) - never invented. "Show Best Move" previews the engine's
  suggestion on the board.
- **Puzzles** - a small, hand-verified starter set (`public/puzzles/starter-set.json`),
  not the full ~4M-puzzle Lichess database (loading that into a browser
  would be a bad idea - see "About the puzzle set" below). Daily puzzle,
  random puzzle, hints, reveal solution, streak tracking.
- **Analysis** - paste or select a saved game's PGN and get a full
  move-by-move review: evaluation bar, classification per move, best
  alternative, game summary (counts by classification, estimated accuracy,
  biggest missed opportunity), keyboard navigation (arrow keys, Home, End),
  click any move to jump to it.
- **History** - completed games are saved to `localStorage` automatically;
  review, delete, export to `.pgn`, or import a `.pgn` file. No account
  needed.
- **Settings** - theme (light/dark/system), legal-move highlights,
  coordinates, sound toggle, Move Coach on/off and detail level,
  resignation/draw confirmation - all persisted locally.

## Tech stack

- **Frontend**: React + TypeScript (Vite), Tailwind CSS, `lucide-react`,
  `chess.js` for rules, `react-chessboard` for the board, React Router.
- **Chess engine**: Stockfish 19, compiled to WASM, single-threaded build
  (`stockfish` npm package) - no SharedArrayBuffer / cross-origin-isolation
  headers required, so it works on plain static hosting like GitHub Pages.
  Runs in a Web Worker; the main thread/UI never blocks on it (verified:
  the UI stays responsive while Stockfish searches).
- **Multiplayer backend**: Supabase. A `rooms` table (Postgres, Row Level
  Security) holds each game's FEN, move history, seats, and draw/resign
  state; five Edge Functions (`rooms-create`/`-join`/`-move`/`-resign`/
  `-draw`, in `supabase/functions/`) are the only things allowed to write to
  it, each re-validating the move or seat claim with `chess.js` before
  touching the row. Supabase Realtime (`postgres_changes` + Presence) pushes
  state and connection status to both players - no server process to run or
  host.
- **Storage**: `localStorage` for settings, game history, and puzzle streak.
  No account needed for any feature, including Play Online (a random
  per-browser player ID stands in for login).

## Running locally

```bash
npm install
npm run dev
```

Open the printed `localhost` URL. Everything works immediately, including
Play Online - `.env` ships with this project's public Supabase URL and
anon key (safe to commit; see "Multiplayer backend" above and
`src/services/multiplayer/supabaseClient.ts`). Open two browser tabs on a
created game's link to test multiplayer.

To point this app at your own Supabase project instead, create one, run the
SQL in `supabase/migrations/`, deploy the functions in
`supabase/functions/`, and put your own project's URL/anon key in `.env`.

### Tests

```bash
npm test # Move Coach classification logic
```

## About the puzzle set

The spec calls for the Lichess puzzle database (CC0-licensed, ~4 million
puzzles) with a sensible loading strategy rather than shipping the whole
thing to the browser. This build ships a small, hand-constructed and
programmatically verified starter set instead of a full ingestion pipeline,
which needs bulk-downloading and filtering a multi-gigabyte CSV - outside
what this build includes. `src/services/puzzles/puzzleService.ts` documents
the intended extension point: a build step that filters the real Lichess
CSV into themed, rating-banded static JSON shards, loaded the same way the
starter set is now. Swapping it in doesn't require any other code changes.

## Deployment

### GitHub Pages (current - fully featured, including Play Online)

`.github/workflows/deploy-pages.yml` builds with `VITE_GITHUB_PAGES=true`
and publishes via `actions/deploy-pages`. `vite.config.ts` sets the base
path to `/Chess/` and `main.tsx` uses `HashRouter` under that flag, since
GitHub Pages has no server-side rewrite for client-side routes. The
Supabase URL/anon key come from the committed `.env` (public values - see
"Multiplayer backend" above), so there's no separate backend to deploy or
host for any feature.

**One-time setup**: repo Settings → Pages → Source → "GitHub Actions".

## Project structure

```
src/
  components/   ChessBoard, MoveCoach, GameControls, MoveHistory,
                EvaluationBar, GameResult, Navigation, Settings
  pages/        Play (Home, PassAndPlay, VsComputer, OnlineLobby, OnlineGame),
                Puzzles, Analysis, History
  hooks/        useChessGame, useStockfish, useMoveCoach, useMoveViewer, useSettings
  services/
    chess/      chess.js helpers (captured pieces, game result)
    engine/     Stockfish Web Worker client + Move Coach classification/explanation
    multiplayer/ Supabase client + Edge Function calls for Play Online
    puzzles/    puzzle loading, daily/random selection, streak
    storage/    localStorage-backed settings and game history
  types/
supabase/
  migrations/   SQL schema for the rooms table (Postgres + RLS)
  functions/    rooms-create/-join/-move/-resign/-draw Edge Functions
                (chess.js-validated, service-role-only writes)
public/
  engines/      (generated at build time) Stockfish WASM + worker JS
  puzzles/      starter-set.json
```

## Notes on scope

Built and verified in a single focused pass, prioritized as: Play (all three
modes) and Move Coach first, Analysis second, Puzzles/History/Settings
after - per the product brief's own stated priority. Verified directly in a
real browser (not just `tsc`/build passing): Stockfish loads and replies
within a few seconds, Move Coach classifies moves against genuine engine
output on both sides of a position, puzzles load/hint/reveal/solve
correctly, Analysis correctly flags a real blunder and names the right
"biggest missed opportunity" move, dark mode applies, and Pass-and-Play's
board-flip and move recording work. Not independently re-verified here:
exhaustive accessibility audit, the full device/browser matrix, and
multiplayer reconnect under real network loss (the room logic mirrors a
previously-shipped, manually-tested version of the same reconnect design).
