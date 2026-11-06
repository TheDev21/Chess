# Third-Party Licenses

ChessGuru's own source code does not currently declare a license (see the
repository's `LICENSE` status — none is set). This document exists
specifically to cover the one bundled third-party component whose license
imposes distribution obligations on anyone who ships it: the Stockfish
chess engine.

## Stockfish (chess engine, GPL-3.0)

**What is bundled:** ChessGuru ships a prebuilt WebAssembly build of the
Stockfish chess engine to every user's browser, where it runs inside a Web
Worker to power "Play vs Computer," Move Coach, and Game Analysis.

**Exact version distributed:** `stockfish-19-lite-single.js` and
`stockfish-19-lite-single.wasm`, from the
[`stockfish`](https://www.npmjs.com/package/stockfish) npm package,
version **19.0.1** (`node_modules/stockfish/package.json`). These are the
unmodified, prebuilt "lite, single-threaded" release artifacts published
at:

- https://github.com/nmrugg/stockfish.js/releases/tag/v19.0.1
- Direct files: `stockfish-19-lite-single.js` and `stockfish-19-lite-single.wasm`

ChessGuru's build (`vite.config.ts`, via `vite-plugin-static-copy`) copies
these two files verbatim from `node_modules/stockfish/bin/` into
`dist/engines/` at build time. **No modification of any kind is made to
the engine's source, build process, or compiled output** — ChessGuru does
not compile Stockfish itself and carries no local patches.

**What this build is:** `stockfish.js` (https://github.com/nmrugg/stockfish.js)
is a WebAssembly port, maintained by Nathan Rugg, of the official
Stockfish chess engine (https://github.com/official-stockfish/Stockfish).
The npm package's own `README.md` states: "Stockfish.js engine code is
GPL v3 ... The published npm package is licensed under GPL-3.0 because it
contains the engine." The "lite" neural network used in this build is
credited by the same README to sscg13's Stockfish 19 lite nets
(https://github.com/sscg13/Stockfish/tree/sf19-1mb).

**Attribution:**
- Stockfish engine: [The Stockfish team](https://github.com/official-stockfish/Stockfish)
  and contributors (see Stockfish's own `AUTHORS` file for the full list).
- WebAssembly port (`stockfish.js`): Nathan Rugg
  (https://github.com/nmrugg/stockfish.js), with contributions credited to
  Chess.com and others listed in that project's
  [`AUTHORS`](https://raw.githubusercontent.com/nmrugg/stockfish.js/master/AUTHORS) file.

**License:** GPL-3.0-only. The full, unmodified license text is included
in this repository at [`licenses/stockfish-GPL-3.0.txt`](licenses/stockfish-GPL-3.0.txt)
(copied verbatim from `node_modules/stockfish/Copying.txt`).

**Corresponding Source:** Because ChessGuru conveys this compiled
WebAssembly binary to every user's browser, GPL-3.0 §6 requires that the
Corresponding Source be made available by one of several means (accompany
the binary with the source, a written offer, or — the option used here —
a durable pointer to a public network location that already serves the
source for free). ChessGuru satisfies this via a designated network
location, since the exact source for this exact distributed version is
already published, free of charge, at:

- Full source tree for this exact release (tag `v19.0.1`):
  https://github.com/nmrugg/stockfish.js/tree/v19.0.1 — verified live on
  2026-11-05 to contain `build.js` (the script that controls compilation of
  every published flavor, including the `lite-single` build ChessGuru
  uses), `src/` (holding the Stockfish C++ engine source as ~60 `.cpp`/`.h`
  files plus a `Makefile`), and `src/emscripten/` (the Emscripten/WASM
  build glue). Together these are the Corresponding Source and the scripts
  needed to reproduce the exact binaries ChessGuru distributes — not just
  the binaries' origin project in the abstract.
- The underlying Stockfish engine project it is built from:
  https://github.com/official-stockfish/Stockfish

**A note on scope and certainty:** This document describes what has been
verified by inspecting the actual installed package, its bundled license
file, and its published README and release artifacts. It is not legal
advice, and it does not certify that every possible GPL-3.0 obligation
(for example, obligations that could depend on exactly how this app is
further redistributed by others) has been satisfied in every scenario —
only that the standard, documented method for satisfying §6 ("Conveying
Non-Source Forms") via a designated, freely-accessible source location
has been followed for the distribution method ChessGuru itself uses
(serving the compiled engine to browsers over the web). If you need a
legal compliance determination, consult counsel.

## Cburnett chess piece artwork (GPLv2+)

**What is bundled:** The 12 Staunton chess-piece SVGs ChessGuru renders on
every chessboard (`src/assets/pieces/cburnett/*.svg`).

**Origin:** Created by [Colin M.L. Burnett](https://en.wikipedia.org/wiki/User:Cburnett),
originally published on Wikimedia Commons as the "Standard Staunton"
piece set (the same artwork Lichess ships as its default "cburnett" piece
set). Downloaded unmodified from Lichess's open-source repository:
https://github.com/lichess-org/lila/tree/master/public/piece/cburnett
(per that repository's own `COPYING.md`, which licenses this specific
directory as GPLv2+).

**License:** GPL-2.0-or-later. The full, unmodified license text is
included in this repository at
[`licenses/cburnett-GPL-2.0.txt`](licenses/cburnett-GPL-2.0.txt).

**Corresponding Source:** SVG is itself a plain-text, directly-editable
source format - the files ChessGuru bundles *are* the preferred form for
modification, so no separate source disclosure is needed beyond the files
already present at `src/assets/pieces/cburnett/`. The origin project
(linked above) remains available as the canonical upstream.

**Modifications:** None. The 12 SVG files are used exactly as downloaded.

## Everything else

All other third-party dependencies in this project (React, chess.js,
react-chessboard, Supabase client libraries, Vite, Tailwind CSS, and the
rest of `package.json`) use standard permissive licenses (MIT/BSD-style or
similar) that do not impose source-distribution obligations the way
GPL-3.0 does. A line-by-line audit of every dependency's exact license
text was not performed as part of this document; Stockfish was singled
out because it is the one dependency whose license was already confirmed
to require this kind of notice.
