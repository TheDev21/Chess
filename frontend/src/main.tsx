import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// GitHub Pages has no server-side rewrite for client-side routes, so a
// refresh or direct link to e.g. /Chess/vs-ai 404s under history-based
// routing. HashRouter (/Chess/#/vs-ai) sidesteps that entirely - every
// URL resolves to the same static index.html. Any other host (local dev,
// a future server-backed deploy) keeps normal clean URLs.
const Router = import.meta.env.VITE_GITHUB_PAGES ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);
