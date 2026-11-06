import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // "prompt" (not "autoUpdate"): a new service worker installs and waits
      // rather than taking over immediately. The app is told via
      // onNeedRefresh (see UpdatePrompt.tsx) and only calls
      // updateServiceWorker() - which lets the waiting worker skip waiting -
      // when the user explicitly clicks "Update". This is what keeps a
      // deployment from silently swapping the app out from under an active
      // game.
      registerType: "prompt",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png", "favicon.ico"],
      manifest: {
        name: "ChessGuru: Learn Chess, Understand Every Move.",
        short_name: "ChessGuru",
        description: "Interactive chess lessons, puzzles, a Stockfish opponent, and a Move Coach that explains every move in plain English.",
        theme_color: "#f6f3e8",
        background_color: "#f6f3e8",
        display: "standalone",
        start_url: ".",
        icons: [
          // The existing artwork already has generous, centered padding
          // (confirmed by visual inspection), so it's safe within the
          // maskable safe zone without needing new art - "any maskable"
          // lets platforms that support adaptive icons use it either way.
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        // Lessons, puzzle data, and the app shell are small and safe to
        // precache for offline use. The Stockfish WASM engine (~1.8MB) is
        // runtime-cached on first use instead of precached, so the very
        // first page load isn't held up by it; after that, Play Computer
        // and Move Coach work offline too.
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        runtimeCaching: [
          {
            urlPattern: /\/engines\/.*\.(wasm|js)$/,
            handler: "CacheFirst",
            options: { cacheName: "stockfish-engine", expiration: { maxEntries: 4 } },
          },
          {
            urlPattern: /\/puzzles\/.*\.json$/,
            handler: "CacheFirst",
            options: { cacheName: "puzzle-data", expiration: { maxEntries: 10 } },
          },
        ],
      },
    }),
    // Stockfish ships as a prebuilt JS+WASM worker bundle, not something we
    // want to run through esbuild/Rollup - copy it verbatim into the build
    // output and load it at runtime as a plain Worker script (see
    // src/services/engine/stockfishClient.ts).
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/stockfish/bin/stockfish-19-lite-single.js",
          dest: "engines",
        },
        {
          src: "node_modules/stockfish/bin/stockfish-19-lite-single.wasm",
          dest: "engines",
        },
      ],
    }),
  ],
  base: process.env.VITE_GITHUB_PAGES ? "/Chess/" : "/",
  server: {
    port: 5173,
  },
  test: {
    environment: "node",
  },
});
