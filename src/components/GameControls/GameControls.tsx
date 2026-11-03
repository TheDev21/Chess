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
      className="rounded-full border border-border bg-surface px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:border-accent hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-border-dark dark:bg-surface-dark dark:text-ink-dark dark:hover:border-accent-dark"
    >
      {children}
    </button>
  );
}

function PrimaryBtn({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent/90 dark:bg-accent-dark dark:text-ink dark:hover:bg-accent-dark/90"
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
      <PrimaryBtn onClick={onNewGame}>{gameOver ? "Rematch" : "New Game"}</PrimaryBtn>
    </div>
  );
}
