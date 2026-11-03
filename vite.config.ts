import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  plugins: [
    react(),
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
