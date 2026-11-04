import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "ChessGuru: Learn Chess, Understand Every Move.",
        short_name: "ChessGuru",
        description: "Interactive chess lessons, puzzles, a Stockfish opponent, and a Move Coach that explains every move in plain English.",
        theme_color: "#f6f3e8",
        background_color: "#f6f3e8",
        display: "standalone",
        start_url: ".",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
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
