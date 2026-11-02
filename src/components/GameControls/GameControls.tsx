interface GameControlsProps {
  onResign?: () => void;
  onOfferDraw?: () => void;
  onUndo?: () => void;
  onNewGame: () => void;
  canUndo?: boolean;
  gameOver: boolean;
}

function Btn({ onClick, children, disabled }: { onClick?: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded border border-border px-3 py-1.5 text-[13px] text-ink transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-40 dark:border-border-dark dark:text-ink-dark dark:hover:border-accent-dark"
    >
      {children}
    </button>
  );
}

export function GameControls({ onResign, onOfferDraw, onUndo, onNewGame, canUndo, gameOver }: GameControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {!gameOver && onUndo && (
        <Btn onClick={onUndo} disabled={!canUndo}>
          Undo
        </Btn>
      )}
      {!gameOver && onOfferDraw && <Btn onClick={onOfferDraw}>Offer Draw</Btn>}
      {!gameOver && onResign && <Btn onClick={onResign}>Resign</Btn>}
      <Btn onClick={onNewGame}>{gameOver ? "Rematch" : "New Game"}</Btn>
    </div>
  );
}
