import { NavLink } from "react-router-dom";
import { Settings as SettingsIcon, Home, BookOpen, Swords, Puzzle, LineChart } from "lucide-react";
import clsx from "clsx";
import logoKingImg from "../../assets/logo-king-grad.png";

interface NavigationProps {
  onOpenSettings: () => void;
}

const links = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/learn", label: "Learn", icon: BookOpen },
  { to: "/play", label: "Play", icon: Swords },
  { to: "/puzzles", label: "Puzzles", icon: Puzzle },
  { to: "/progress", label: "Progress", icon: LineChart },
];

function Logo() {
  return (
    <NavLink to="/" className="flex items-center gap-2 text-ink" end>
      <img src={logoKingImg} alt="" className="h-8 w-auto" />
      <span className="text-[18px] font-semibold tracking-tight text-accent">ChessGuru</span>
    </NavLink>
  );
}

export function Navigation({ onOpenSettings }: NavigationProps) {
  return (
    <>
      {/* Desktop / tablet: a left navigation rail. */}
      <aside className="relative z-10 hidden w-56 shrink-0 flex-col gap-1 border-r border-border bg-surface px-4 py-6 lg:flex">
        <div className="mb-6 px-2">
          <Logo />
        </div>
        <nav className="flex flex-col gap-0.5">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              data-tutorial={`nav-${link.label.toLowerCase()}`}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-2.5 rounded-full px-3 py-2 text-[13px] font-medium transition-colors duration-200",
                  isActive ? "bg-accent text-bg shadow-card" : "text-muted hover:bg-accent/[0.08] hover:text-ink",
                )
              }
            >
              <link.icon className="h-[17px] w-[17px]" strokeWidth={1.75} />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-2.5 rounded-full px-3 py-2 text-[13px] font-medium text-muted transition-colors duration-200 hover:bg-accent/[0.08] hover:text-ink"
          >
            <SettingsIcon className="h-[17px] w-[17px]" strokeWidth={1.75} />
            Settings
          </button>
        </div>
      </aside>

      {/* Mobile: compact top header + bottom tab bar. */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
        <Logo />
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-accent/[0.08] hover:text-ink"
        >
          <SettingsIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border bg-surface px-1 shadow-panel lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            data-tutorial={`nav-${link.label.toLowerCase()}`}
            className={({ isActive }) =>
              clsx(
                "flex min-w-[56px] flex-col items-center gap-0.5 rounded-full px-2 py-2.5 text-[10.5px] font-medium transition-colors duration-200",
                isActive ? "text-accent" : "text-muted",
              )
            }
          >
            <link.icon className="h-5 w-5" strokeWidth={1.75} />
            {link.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
