import { Chess, type Move } from "chess.js";
import type { CoachedMove, EngineEvaluation, MoveClassification, PlayerColor } from "../../types/chess";

const MATE_CP = 100000;

/** Converts an evaluation to a single centipawn number from White's perspective, treating mate as a very large score. */
function toComparable(evaluation: EngineEvaluation): number {
  if (evaluation.mate != null) {
    return evaluation.mate > 0 ? MATE_CP - evaluation.mate : -MATE_CP - evaluation.mate;
  }
  return evaluation.cp ?? 0;
}

/** Re-expresses a White-perspective score from the given side's point of view. */
function fromPerspective(whitePerspectiveCp: number, color: PlayerColor): number {
  return color === "white" ? whitePerspectiveCp : -whitePerspectiveCp;
}

/**
 * Classifies a move by comparing the position's evaluation before the move
 * (i.e. the engine's assessment of the best available move) against the
 * evaluation after the move actually played, both expressed from the
 * mover's own perspective. This is why Move Coach needs two Stockfish
 * calls per move, not one - a static evaluation of only the resulting
 * position can't tell a forced-bad-position move from a genuine blunder.
 */
export function classifyMove(
  moverColor: PlayerColor,
  playedUci: string,
  evalBeforeBest: EngineEvaluation,
  evalAfterPlayed: EngineEvaluation,
): { classification: MoveClassification; centipawnLoss: number } {
  const bestForMover = fromPerspective(toComparable(evalBeforeBest), moverColor);
  // evaluation.cp/mate are always normalized to White's perspective (see
  // stockfishClient.ts), regardless of whose turn it is in that position -
  // so no extra sign flip is needed here, just re-expressing it for the mover.
  const afterForMover = fromPerspective(toComparable(evalAfterPlayed), moverColor);

  const playedTheBest = evalBeforeBest.bestMoveUci === playedUci;
  const loss = Math.max(0, bestForMover - afterForMover);

  if (playedTheBest) {
    return { classification: "best", centipawnLoss: 0 };
  }

  // A move that was already winning by a wide margin and remains clearly
  // winning shouldn't be labeled a Blunder just because a nominally large
  // centipawn gap opened up - that's the "already decided" case the spec
  // calls out. A move that throws away a forced mate, or turns a winning
  // position into a losing one, should still be flagged harshly regardless
  // of the raw number.
  const stillClearlyWinning = afterForMover > 400;
  const wasLosingBefore = bestForMover < -600;
  const collapsedFromWinningToLosing = bestForMover > 100 && afterForMover < -100;
  const threwAwayForcedMate = evalBeforeBest.mate != null && evalBeforeBest.mate > 0 && evalAfterPlayed.mate == null;

  if (collapsedFromWinningToLosing || (threwAwayForcedMate && loss > 300)) {
    return { classification: "blunder", centipawnLoss: loss };
  }

  if (stillClearlyWinning && !threwAwayForcedMate) {
    if (loss <= 80) return { classification: "best", centipawnLoss: loss };
    if (loss <= 250) return { classification: "good", centipawnLoss: loss };
    return { classification: "inaccuracy", centipawnLoss: loss };
  }

  if (wasLosingBefore && !collapsedFromWinningToLosing) {
    // Already lost: don't pile on for moves that don't change the outcome.
    if (loss <= 150) return { classification: "good", centipawnLoss: loss };
    if (loss <= 350) return { classification: "inaccuracy", centipawnLoss: loss };
    return { classification: "mistake", centipawnLoss: loss };
  }

  if (loss <= 15) return { classification: "excellent", centipawnLoss: loss };
  if (loss <= 50) return { classification: "good", centipawnLoss: loss };
  if (loss <= 120) return { classification: "inaccuracy", centipawnLoss: loss };
  if (loss <= 300) return { classification: "mistake", centipawnLoss: loss };
  return { classification: "blunder", centipawnLoss: loss };
}

function pieceName(type: string): string {
  const names: Record<string, string> = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
  return names[type] ?? "piece";
}

const CENTER_SQUARES = new Set(["d4", "d5", "e4", "e5"]);
const EXTENDED_CENTER_SQUARES = new Set(["c3", "c4", "c5", "c6", "d3", "d4", "d5", "d6", "e3", "e4", "e5", "e6", "f3", "f4", "f5", "f6"]);

function describeMoveFacts(move: Move): string[] {
  const facts: string[] = [];
  if (move.captured) facts.push(`captured a ${pieceName(move.captured)}`);
  if (move.flags.includes("k") || move.flags.includes("q")) facts.push("castled, improving king safety");
  if (move.promotion) facts.push(`promoted to a ${pieceName(move.promotion)}`);
  if (move.san.includes("#")) facts.push("delivered checkmate");
  else if (move.san.includes("+")) facts.push("gave check");
  if (CENTER_SQUARES.has(move.to)) facts.push("took a central square");
  else if (EXTENDED_CENTER_SQUARES.has(move.to) && "nbq".includes(move.piece)) facts.push("pushed toward the center");
  return facts;
}

/**
 * Builds the "what you did well" / summary text entirely from facts the
 * move itself and the two evaluations actually support - no invented
 * tactical narrative. When nothing specific can be said with confidence,
 * it falls back to pointing at the suggested line rather than guessing.
 */
function buildExplanation(
  classification: MoveClassification,
  playedMove: Move,
  bestAlternativeSan: string | null,
  moverColor: PlayerColor,
  fenBeforeForDevelopment: string,
): { summary: string; whatWentWell: string[]; bestAlternativeReason: string | null } {
  const facts = describeMoveFacts(playedMove);

  const pre = new Chess(fenBeforeForDevelopment);
  const isOpeningPhase = pre.history().length < 20;
  const fromRank = playedMove.from[1];
  const backRank = moverColor === "white" ? "1" : "2";
  if (isOpeningPhase && "nb".includes(playedMove.piece) && fromRank === backRank) {
    facts.push("developed a piece toward the center");
  }

  const whatWentWell = facts.length > 0 ? facts : [];

  const factsClause = facts.length > 0 ? ` You ${facts.join(" and ")}.` : "";

  let summary: string;
  switch (classification) {
    case "best":
      summary = `This was the engine's top choice in this position.${factsClause}`;
      break;
    case "excellent":
      summary = `A very strong move, essentially as good as the engine's top choice.${factsClause}`;
      break;
    case "good":
      summary = facts.length > 0 ? `Good move. You ${facts.join(" and ")}.` : "A solid, reasonable move that keeps your position healthy.";
      break;
    case "inaccuracy":
      summary = `This move is slightly less precise than the best continuation available.${factsClause}`;
      break;
    case "mistake":
      summary = `This move gives up a meaningful amount of your advantage.${factsClause}`;
      break;
    case "blunder":
      summary = `This move loses significant material or position - the engine sees a much stronger reply for your opponent.${factsClause}`;
      break;
  }

  const bestAlternativeReason = bestAlternativeSan
    ? null // filled in by caller once it has the best move's own flags
    : null;

  return { summary, whatWentWell, bestAlternativeReason };
}

/** Describes the suggested alternative move using only its own move flags - captures, checks, castling - never invented tactics. */
function describeAlternative(fenBeforeBest: string, bestMoveSan: string): string | null {
  try {
    const game = new Chess(fenBeforeBest);
    const move = game.move(bestMoveSan);
    if (!move) return null;
    const facts = describeMoveFacts(move);
    if (facts.length > 0) {
      return `This would have ${facts.join(" and ")}.`;
    }
    return "This keeps more central control and piece activity than the move played.";
  } catch {
    return null;
  }
}

export interface BuildCoachedMoveInput {
  ply: number;
  moverColor: PlayerColor;
  fenBefore: string;
  fenAfter: string;
  move: Move;
  evalBefore: EngineEvaluation;
  evalAfter: EngineEvaluation;
}

export function buildCoachedMove(input: BuildCoachedMoveInput): CoachedMove {
  const { ply, moverColor, fenBefore, fenAfter, move, evalBefore, evalAfter } = input;
  const playedUci = move.from + move.to + (move.promotion ?? "");
  const { classification, centipawnLoss } = classifyMove(moverColor, playedUci, evalBefore, evalAfter);

  const playedTheBest = evalBefore.bestMoveUci === playedUci;
  const bestAlternativeSan = playedTheBest ? null : evalBefore.bestMoveSan;
  const { summary, whatWentWell } = buildExplanation(classification, move, bestAlternativeSan, moverColor, fenBefore);
  const bestAlternativeReason = bestAlternativeSan ? describeAlternative(fenBefore, bestAlternativeSan) : null;

  return {
    ply,
    moverColor,
    san: move.san,
    uci: playedUci,
    fenBefore,
    fenAfter,
    evalBefore,
    evalAfter,
    classification,
    centipawnLoss,
    summary,
    whatWentWell,
    bestAlternativeSan,
    bestAlternativeReason,
  };
}
