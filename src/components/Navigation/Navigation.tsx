import { NavLink } from "react-router-dom";
import { Settings as SettingsIcon, Home, BookOpen, Swords, Puzzle, LineChart } from "lucide-react";
import clsx from "clsx";
import logoKingImg from "../../assets/logo-king.png";
import { kingNavStyle } from "../../lib/panoramaBackground";

/** The nav bars show the exact same fixed king photo as the rest of the app (not a translucent
 * peek at whatever happens to be scrolled underneath - that's what caused the earlier
 * text-ghosting bug), so the background reads as one unbroken image behind the whole app, nav
 * included. */

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
      <img src={logoKingImg} alt="" className="h-6 w-auto" />
      <span className="text-[15px] font-semibold tracking-tight">ChessGuru</span>
    </NavLink>
  );
}

export function Navigation({ onOpenSettings }: NavigationProps) {
  return (
    <>
      {/* Desktop / tablet: a left navigation rail. */}
      <aside className="relative z-10 hidden w-56 shrink-0 flex-col gap-1 border-r border-ink/10 bg-bg px-4 py-6 lg:flex" style={kingNavStyle()}>
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
                  "flex items-center gap-2.5 rounded-full px-3 py-2 text-[13px] font-medium transition-colors",
                  isActive ? "bg-ink/10 text-ink" : "text-[#4a3728] hover:text-ink",
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
            className="flex items-center gap-2.5 rounded-full px-3 py-2 text-[13px] font-medium text-[#4a3728] transition-colors hover:text-ink"
          >
            <SettingsIcon className="h-[17px] w-[17px]" strokeWidth={1.75} />
            Settings
          </button>
        </div>
      </aside>

      {/* Mobile: compact top header + bottom tab bar. */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-ink/10 bg-bg px-4 py-3 lg:hidden" style={kingNavStyle()}>
        <Logo />
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#4a3728] transition-colors hover:text-ink"
        >
          <SettingsIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-ink/10 bg-surface px-1 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)", ...kingNavStyle() }}
      >
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            data-tutorial={`nav-${link.label.toLowerCase()}`}
            className={({ isActive }) =>
              clsx(
                "flex min-w-[56px] flex-1 flex-col items-center gap-0.5 py-2.5 text-[10.5px] font-medium transition-colors",
                isActive ? "text-accent" : "text-[#4a3728]",
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
