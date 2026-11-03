import { NavLink } from "react-router-dom";
import { Settings as SettingsIcon, Crown } from "lucide-react";
import clsx from "clsx";

interface NavigationProps {
  onOpenSettings: () => void;
}

const links = [
  { to: "/", label: "Play", end: true },
  { to: "/puzzles", label: "Puzzles" },
  { to: "/analysis", label: "Analysis" },
  { to: "/history", label: "History" },
];

export function Navigation({ onOpenSettings }: NavigationProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md dark:border-border-dark dark:bg-bg-dark/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3.5 sm:px-6">
        <NavLink to="/" className="flex shrink-0 items-center gap-2 text-ink dark:text-ink-dark" end>
          <Crown className="h-5 w-5 text-accent dark:text-accent-dark" strokeWidth={1.75} />
          <span className="text-[15px] font-semibold tracking-tight">Chess</span>
        </NavLink>

        <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto sm:gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                clsx(
                  "shrink-0 rounded-full px-2.5 py-1.5 text-[13px] font-medium transition-colors sm:px-3.5",
                  isActive
                    ? "bg-ink/[0.06] text-ink dark:bg-white/[0.08] dark:text-ink-dark"
                    : "text-muted hover:text-ink dark:text-muted-dark dark:hover:text-ink-dark"
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Settings"
            className="ml-0.5 flex shrink-0 items-center gap-1.5 rounded-full p-2 text-muted transition-colors hover:text-ink sm:px-3 sm:py-1.5 sm:ml-1 dark:text-muted-dark dark:hover:text-ink-dark"
          >
            <SettingsIcon className="h-[15px] w-[15px]" strokeWidth={1.75} />
            <span className="hidden sm:inline text-[13px] font-medium">Settings</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
