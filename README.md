# Chess

A full-stack chess web app with three play modes, a custom minimax/alpha-beta
AI opponent, and an LLM-powered move coach that explains moves in plain
English. Responsive for phone, tablet, laptop, and desktop, in portrait and
landscape.

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

The suggested production split from the spec is Vercel (frontend) +
Railway (backend + MySQL):

- **Backend on Railway**: deploy `backend/` (it has its own `Dockerfile`),
  attach a MySQL plugin, set `DATABASE_URL`, `ANTHROPIC_API_KEY`,
  `JWT_SECRET`, and `CORS_ORIGIN` (your Vercel domain).
- **Frontend on Vercel**: deploy `frontend/`, set `VITE_API_BASE` and
  `VITE_SOCKET_URL` at build time to your Railway backend's public URL
  (e.g. `https://your-app.up.railway.app`).

## CI

`.github/workflows/ci.yml` runs backend typecheck + tests + build and
frontend typecheck + build on every push to `main` and every pull request.

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
