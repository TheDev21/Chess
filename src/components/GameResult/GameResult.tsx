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
    <div className="rounded border border-border bg-surface px-4 py-3 text-center dark:border-border-dark dark:bg-surface-dark">
      <div className="text-[15px] font-medium text-ink dark:text-ink-dark">{headline}</div>
      <div className="text-[12px] text-muted dark:text-muted-dark">{reason}</div>
    </div>
  );
}
