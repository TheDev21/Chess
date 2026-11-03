interface GameResultProps {
  result: string; // "1-0" | "0-1" | "1/2-1/2"
  reason: string;
  playerColor?: "white" | "black";
}

export function GameResult({ result, reason, playerColor }: GameResultProps) {
  let headline: string;
  if (result === "1/2-1/2") {
    headline = "Draw";
  } else if (playerColor) {
    const won = (result === "1-0" && playerColor === "white") || (result === "0-1" && playerColor === "black");
    headline = won ? "You won" : "You lost";
  } else {
    headline = result === "1-0" ? "White wins" : "Black wins";
  }

  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-4 text-center dark:border-border-dark dark:bg-surface-dark">
      <div className="text-[16px] font-semibold text-ink dark:text-ink-dark">{headline}</div>
      <div className="mt-0.5 text-[13px] text-muted dark:text-muted-dark">{reason}</div>
    </div>
  );
}
