# Chess

A full-stack chess web app with three play modes, a custom minimax/alpha-beta
AI opponent, and an LLM-powered move coach that explains moves in plain
English. Responsive for phone, tablet, laptop, and desktop, in portrait and
landscape.

## Play it now

**[thedev21.github.io/Chess](https://thedev21.github.io/Chess/)** - a free,
static build on GitHub Pages. Pass and Play and vs AI work fully (the AI
runs client-side in a Web Worker - see below); 1v1 Online and the Move
Coach need a live backend and are disabled on this build with an
explanation in the UI. Run the backend locally (below) for the full
feature set.

## Game Modes

- **Pass and Play** - two players, one device, board flips each turn.
- **vs AI** - play White against a custom chess engine (minimax + alpha-beta
  pruning) with Easy / Medium / Hard difficulty.
- **1v1 Online** - create a game, share the link, play live over WebSockets,
  with reconnect support if a player refreshes or drops.

Every mode has an optional **Move Coach** panel: after each move, the backend
asks an LLM for a one- or two-sentence, plain-English explanation of what the
move does.

## Tech Stack

- **Frontend**: React + TypeScript (Vite), `react-chessboard` for the board,
  `chess.js` for move generation/validation, React Router, Socket.io client.
- **Backend**: Node.js + Express + TypeScript, Socket.io for real-time
  multiplayer, a hand-written minimax/alpha-beta chess engine, Prisma +
  MySQL for optional persistence, JWT for optional auth.
- **AI opponent**: runs in both places. `backend/src/engine/` is the
  server-side copy used when a backend is available; `frontend/src/engine/`
  is an identical copy that runs in a Web Worker in the browser, so vs-AI
  works with zero backend at all (see GitHub Pages Deployment below). The
  two are plain TypeScript + `chess.js` with no server-only APIs, so they're
  kept as a deliberate duplicate rather than an awkward shared package for
  a two-app repo - see `frontend/src/hooks/useAiWorker.ts`.
- **LLM integration**: Anthropic API (`@anthropic-ai/sdk`), called
  server-side only - the API key never reaches the client.

### Why Node instead of .NET

The original spec suggested C#/.NET for resume consistency with a prior
project. This was built with a **Node/Express** backend instead: the
development sandbox this project was built in has Node but no .NET SDK
installed, and a backend the author can actually compile, run, and test
beats one that's merely plausible-looking. It also keeps the whole stack in
one language (TypeScript front and back). Swapping to ASP.NET Core +
SignalR later is a backend-only rewrite - the REST/WebSocket contracts in
this README define the surface the frontend expects, independent of which
runtime implements them.

## Project Layout

```
backend/    Express API + Socket.io + chess engine + Prisma schema
frontend/   React + Vite app
docker-compose.yml
```

## Chess Engine

`backend/src/engine/` - minimax search with alpha-beta pruning
(`chessEngine.ts`) and a material + piece-square-table evaluator
(`evaluation.ts`). Move ordering searches captures/promotions first to
improve pruning.

Difficulty maps to a target search depth: Easy = 2, Medium = 4, Hard = 6
ply. Because a fixed-depth search can blow up combinatorially in quiet
positions (the opening has no captures to help pruning), the engine uses
**iterative deepening** with a per-difficulty time budget (2s / 5s / 9s): it
searches depth 1, then 2, and so on, keeping the best move from the deepest
depth that finished in time. In the common case (midgame, endgame, or any
position alpha-beta prunes well) it reaches the target depth well within
budget; in the worst case it still returns a legal move from a shallower
completed depth instead of hanging.

Engine correctness is covered by tests in
`backend/src/__tests__/chessEngine.test.ts` (finds forced mate, captures
hanging material, never returns an illegal move, degrades gracefully under
a tight time budget).

**Stretch goal not implemented:** a Stockfish "Hard+" mode. The engine
architecture (`findBestMove(fen, depth, timeBudgetMs)`) is isolated behind
`routes/ai.ts`, so adding it later is a matter of shelling out to a
Stockfish binary/UCI process for that one difficulty tier.

## Real-Time Multiplayer

Needs a running backend - not available on the static GitHub Pages build
(the Home page and `/online` route show why instead of a broken UI).

`backend/src/realtime/gameHub.ts` - Socket.io. Creating a game
(`POST /api/rooms`) returns a room ID used to build a shareable link
(`/online/:roomId`). The server is authoritative: it validates every move
with `chess.js` and turn ownership before broadcasting it. A disconnected
player's seat is held for 5 minutes so a refresh or dropped connection
doesn't lose the game; if nobody reclaims it, the seat opens up again. A
third visitor to the same link, once both seats are taken, joins
automatically as a read-only spectator - covering the "spectator mode"
stretch goal from the spec without any separate spectator-specific code
path.

## LLM Move Coach

Needs a running backend (the key must never reach the client) - not
available on the static GitHub Pages build, which shows an explanation in
the coach panel instead of attempting a request.

`POST /api/coach/explain` takes the FEN before/after a move and the SAN,
and returns a short explanation from Claude. It's rate-limited separately
from the rest of the API (10 requests/minute per IP) since it's the only
endpoint that costs real money per call. Without `ANTHROPIC_API_KEY` set,
it responds with a friendly "not configured" message instead of an error -
the rest of the app works normally either way. The coach can be toggled off
per-session in the UI.

## Saved Games / Accounts (optional)

Gameplay itself never touches a database - room state lives in memory via
Socket.io. `Game`/`Move`/`User` models exist in `backend/prisma/schema.prisma`
for saved game history and simple JWT accounts, but neither
`/api/auth/register` nor `/api/auth/login` do anything without both
`DATABASE_URL` and `JWT_SECRET` set (they return `503` otherwise). Wiring
saved-game history into the game hub (persisting each move via Prisma) is
the natural next step but wasn't required for the app to function end to
end, so it wasn't built out further here.

## Running Locally

### Backend

```bash
cd backend
cp .env.example .env   # edit as needed - all values are optional for basic play
npm install
npm run dev             # http://localhost:4000
```

### Frontend

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173, proxies /api and /socket.io to :4000
```

Open two browser tabs pointed at an online game link to test multiplayer
locally.

### Tests

```bash
cd backend
npm test
```

## Running with Docker

```bash
cp backend/.env.example .env   # optional: set ANTHROPIC_API_KEY, JWT_SECRET, etc.
docker compose up --build
```

This starts MySQL, the backend (`:4000`), and the frontend behind nginx
(`:8080`, which proxies `/api` and `/socket.io` to the backend container).
Environment variables in `.env` at the repo root (`ANTHROPIC_API_KEY`,
`ANTHROPIC_MODEL`, `JWT_SECRET`, `MYSQL_ROOT_PASSWORD`, `CORS_ORIGIN`) are
picked up by `docker-compose.yml`.

## Deployment

### GitHub Pages (current, static, no backend)

`.github/workflows/deploy-pages.yml` builds `frontend/` with
`VITE_GITHUB_PAGES=true` and `VITE_HAS_BACKEND=false` and publishes it via
`actions/deploy-pages`. Two things make this build backend-free:

- **Base path**: `vite.config.ts` sets `base: "/Chess/"` under
  `VITE_GITHUB_PAGES` (a GitHub Pages project site is served under
  `/<repo>/`, not the domain root).
- **Router**: `main.tsx` swaps `BrowserRouter` for `HashRouter` under the
  same flag, since GitHub Pages has no server-side rewrite for
  client-side routes - a refresh on `/Chess/vs-ai` would 404 under
  history-based routing, but `/Chess/#/vs-ai` always resolves to the one
  static `index.html`.

`VITE_HAS_BACKEND=false` is read in `src/api/client.ts` and threaded
through `useCoach`, `useSocket`, `Home`, `OnlineLobby`, and `OnlineGame` to
gate off the Move Coach and 1v1 Online instead of letting them fail against
a backend that doesn't exist.

**One-time setup**: in the repo's Settings -> Pages, set Source to "GitHub
Actions". After that, every push to `main` redeploys automatically.

### Full-featured (frontend + backend + MySQL)

For 1v1 Online and the Move Coach, the backend needs to actually run
somewhere. The suggested split from the original spec is Vercel (frontend)
+ Railway (backend + MySQL):

- **Backend on Railway**: deploy `backend/` (it has its own `Dockerfile`),
  attach a MySQL plugin, set `DATABASE_URL`, `ANTHROPIC_API_KEY`,
  `JWT_SECRET`, and `CORS_ORIGIN` (your frontend's domain).
- **Frontend on Vercel** (or any static host): deploy `frontend/`, set
  `VITE_API_BASE` and `VITE_SOCKET_URL` at build time to your backend's
  public URL (e.g. `https://your-app.up.railway.app`), and leave
  `VITE_GITHUB_PAGES`/`VITE_HAS_BACKEND` unset so routing and feature
  gating both default back to normal.

## CI

`.github/workflows/ci.yml` runs backend typecheck + tests + build and
frontend typecheck + build on every push to `main` and every pull request.
`.github/workflows/deploy-pages.yml` builds and publishes the static
GitHub Pages build (see Deployment above) on every push to `main`.

## Security / Input Validation

- All request bodies are validated with `zod` (`routes/ai.ts`,
  `routes/coach.ts`, `routes/auth.ts`).
- A general rate limiter (120 req/min/IP) applies to the whole API; the LLM
  coach endpoint has its own tighter limiter (10 req/min/IP).
- Passwords are hashed with `bcryptjs` before storage; JWTs are only issued
  when `JWT_SECRET` is configured.
- The Anthropic API key is read from a server-side environment variable
  only - it's never sent to or referenced by the frontend bundle.

## Stretch Goals Not Implemented

Given the scope of the full spec, these were left out to keep the delivered
app fully working end to end rather than partially covering every item:

- Stockfish "Hard+" mode (see Chess Engine section above for the seam to
  add it).
- Post-game LLM recap ("key turning points").
- ELO-style rating tracker (the `User.rating` field exists in the Prisma
  schema but nothing updates it yet).

Implemented stretch goals: move-history sidebar in algebraic notation
(`MoveHistory.tsx`) and spectator mode (see Real-Time Multiplayer above).
