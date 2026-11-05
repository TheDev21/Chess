import { Component, type ErrorInfo, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// React error boundaries only catch errors thrown during rendering, in
// lifecycle methods, and in constructors of the component tree below them.
// They do NOT catch errors in event handlers, in async code (promises,
// setTimeout), or inside Web Workers (e.g. the Stockfish engine worker) -
// those are handled separately where they occur (see useStockfish.ts's
// own error state) and never reach this boundary.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-6">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-xl border border-border bg-surface p-8 text-center shadow-panel">
          <h1 className="text-[18px] font-semibold text-ink">Something went wrong</h1>
          <p className="text-[13px] leading-relaxed text-muted">
            ChessGuru ran into an unexpected error. Reloading usually fixes it, and nothing you've saved is affected.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-[13px] font-medium text-bg shadow-card transition-all duration-200 hover:brightness-110 hover:shadow-panel"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reload ChessGuru
          </button>
        </div>
      </div>
    );
  }
}
