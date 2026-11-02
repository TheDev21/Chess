import type { DifficultyConfig, EngineEvaluation } from "../../types/chess";
import { Chess } from "chess.js";

interface PendingGo {
  resolve: (evaluation: EngineEvaluation) => void;
  reject: (err: Error) => void;
  fen: string;
  bestInfo: { cp: number | null; mate: number | null; pvUci: string[]; depth: number } | null;
}

/**
 * Thin UCI wrapper around the Stockfish Web Worker. One instance drives one
 * conversation with the engine at a time - callers (useStockfish) are
 * responsible for not overlapping requests, or for creating a second client
 * when two independent analyses are genuinely needed (e.g. Move Coach
 * running alongside a live opponent search).
 */
export class StockfishClient {
  private worker: Worker | null = null;
  readonly ready: Promise<void>;
  private pending: PendingGo | null = null;

  constructor() {
    this.ready = this.init();
  }

  private init(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const base = import.meta.env.BASE_URL || "/";
        this.worker = new Worker(`${base}engines/stockfish-19-lite-single.js`);
      } catch (err) {
        reject(new Error(`Failed to start Stockfish worker: ${(err as Error).message}`));
        return;
      }

      const onUciOk = (event: MessageEvent<string>) => {
        if (event.data === "uciok") {
          this.worker!.removeEventListener("message", onUciOk);
          this.worker!.postMessage("isready");
          const onReady = (e2: MessageEvent<string>) => {
            if (e2.data === "readyok") {
              this.worker!.removeEventListener("message", onReady);
              this.worker!.addEventListener("message", this.handleMessage);
              resolve();
            }
          };
          this.worker!.addEventListener("message", onReady);
        }
      };
      this.worker.addEventListener("message", onUciOk);
      this.worker.addEventListener("error", (e) => reject(new Error(`Stockfish worker error: ${e.message}`)));
      this.worker.postMessage("uci");
    });
  }

  private handleMessage = (event: MessageEvent<string>) => {
    const line: string = event.data;
    if (!this.pending) return;

    if (line.startsWith("info") && line.includes(" pv ")) {
      const cpMatch = line.match(/score cp (-?\d+)/);
      const mateMatch = line.match(/score mate (-?\d+)/);
      const depthMatch = line.match(/depth (\d+)/);
      const pvMatch = line.match(/ pv (.+)$/);
      if (pvMatch) {
        this.pending.bestInfo = {
          cp: cpMatch ? Number(cpMatch[1]) : null,
          mate: mateMatch ? Number(mateMatch[1]) : null,
          pvUci: pvMatch[1].trim().split(/\s+/),
          depth: depthMatch ? Number(depthMatch[1]) : 0,
        };
      }
    } else if (line.startsWith("bestmove")) {
      const parts = line.split(" ");
      const bestMoveUci = parts[1];
      const info = this.pending.bestInfo;
      const game = new Chess(this.pending.fen);
      const pvSan: string[] = [];
      if (info) {
        for (const uci of info.pvUci) {
          const move = applyUciMove(game, uci);
          if (!move) break;
          pvSan.push(move.san);
        }
      }
      const bestMoveSan = pvSan[0] ?? bestMoveUci;

      // Scores from Stockfish are always from the side-to-move's perspective;
      // normalize to White's perspective so downstream comparisons (Move
      // Coach, evaluation bar) don't have to track whose turn it was.
      const sideToMove = new Chess(this.pending.fen).turn();
      const sign = sideToMove === "w" ? 1 : -1;

      const resolved: EngineEvaluation = {
        cp: info?.cp != null ? info.cp * sign : null,
        mate: info?.mate != null ? info.mate * sign : null,
        bestMoveUci,
        bestMoveSan,
        pvSan,
        depth: info?.depth ?? 0,
      };
      const { resolve } = this.pending;
      this.pending = null;
      resolve(resolved);
    }
  };

  async evaluate(fen: string, config: Pick<DifficultyConfig, "depth" | "skillLevel" | "limitStrength" | "elo">): Promise<EngineEvaluation> {
    await this.ready;
    if (!this.worker) throw new Error("Stockfish worker is not available");
    if (this.pending) throw new Error("A Stockfish request is already in progress on this client");

    this.worker.postMessage("setoption name Skill Level value " + config.skillLevel);
    this.worker.postMessage("setoption name UCI_LimitStrength value " + (config.limitStrength ? "true" : "false"));
    if (config.limitStrength && config.elo) {
      this.worker.postMessage("setoption name UCI_Elo value " + config.elo);
    }
    this.worker.postMessage("position fen " + fen);

    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject, fen, bestInfo: null };
      this.worker!.postMessage("go depth " + config.depth);
    });
  }

  /** Cancels any in-flight search so a new request can start immediately (used when a newer position supersedes an old one). */
  stop() {
    if (this.worker && this.pending) {
      this.worker.postMessage("stop");
    }
  }

  terminate() {
    this.worker?.postMessage("quit");
    this.worker?.terminate();
    this.worker = null;
    this.pending = null;
  }
}

function applyUciMove(game: Chess, uci: string) {
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
  try {
    return game.move({ from, to, promotion: promotion as "q" | "r" | "b" | "n" | undefined });
  } catch {
    return null;
  }
}
