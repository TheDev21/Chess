import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this as a project site under /Chess/, not the
  // domain root, so asset URLs need that prefix. Local dev and any other
  // host (Vercel, Netlify, a custom domain) keep the default root base.
  base: process.env.VITE_GITHUB_PAGES ? "/Chess/" : "/",
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_BACKEND_URL || "http://localhost:4000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: process.env.VITE_BACKEND_URL || "http://localhost:4000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
