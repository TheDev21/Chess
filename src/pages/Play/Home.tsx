import { Link } from "react-router-dom";
import { Users, Cpu, Globe, ChevronRight } from "lucide-react";

const options = [
  { to: "/play/friend", icon: Users, title: "Play a Friend", desc: "Play locally on the same device." },
  { to: "/play/computer", icon: Cpu, title: "Play Computer", desc: "Challenge Stockfish at your level." },
  { to: "/play/online", icon: Globe, title: "Play Online", desc: "Invite someone using a shareable link." },
];

export function Home() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-12 text-center sm:py-20">
      <h1 className="text-[30px] font-semibold tracking-tight text-ink dark:text-ink-dark sm:text-[36px]">Ready to play?</h1>
      <p className="mt-2.5 text-[15px] text-muted dark:text-muted-dark">No account needed. Pick a way to play.</p>

      <div className="mt-10 flex w-full flex-col divide-y divide-border dark:divide-border-dark">
        {options.map(({ to, icon: Icon, title, desc }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-center gap-4 py-4 text-left transition-colors first:pt-0 last:pb-0"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/[0.08] text-accent transition-colors group-hover:bg-accent/[0.14] dark:bg-accent-dark/[0.12] dark:text-accent-dark">
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
            <span className="flex-1">
              <span className="block text-[15px] font-medium text-ink dark:text-ink-dark">{title}</span>
              <span className="block text-[13px] text-muted dark:text-muted-dark">{desc}</span>
            </span>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-muted/60 transition-transform group-hover:translate-x-0.5 group-hover:text-muted dark:text-muted-dark/60 dark:group-hover:text-muted-dark"
              strokeWidth={1.75}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
