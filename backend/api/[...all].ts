import { createApp } from "../src/app";

// Vercel serverless entry point: an Express app instance is itself a valid
// (req, res) request handler, so it can be exported directly here with no
// separate adapter. The `[...all]` catch-all file name makes Vercel route
// every request under /api/* to this one function - Express then does its
// own internal routing (see src/app.ts) exactly as it does when run as a
// long-lived server via src/server.ts.
//
// NOT included here: Socket.io (see src/server.ts / src/realtime/gameHub.ts).
// Real-time multiplayer needs a persistent process holding room state in
// memory and a live WebSocket connection - neither of which a stateless,
// per-request serverless function can provide. The REST endpoints (AI
// moves, the LLM coach) are stateless request/response and work fine here.
export default createApp();
