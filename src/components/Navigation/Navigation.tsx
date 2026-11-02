import { NavLink } from "react-router-dom";
import { Settings as SettingsIcon, Swords } from "lucide-react";
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
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur dark:border-border-dark dark:bg-bg-dark/90">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <NavLink to="/" className="flex items-center gap-2 text-ink dark:text-ink-dark" end>
          <Swords className="h-5 w-5 text-accent dark:text-accent-dark" strokeWidth={1.75} />
          <span className="text-[15px] font-medium tracking-tight">Chess</span>
        </NavLink>

        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                clsx(
                  "rounded px-2.5 py-1.5 text-[13px] font-medium transition-colors sm:px-3",
                  isActive
                    ? "bg-surface text-ink shadow-card dark:bg-surface-dark dark:text-ink-dark"
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
            className="ml-1 rounded p-2 text-muted transition-colors hover:text-ink dark:text-muted-dark dark:hover:text-ink-dark"
          >
            <SettingsIcon className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </nav>
      </div>
    </header>
  );
}
