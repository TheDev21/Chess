import { Link } from "react-router-dom";
import { Users, Cpu, Globe } from "lucide-react";

const options = [
  { to: "/play/friend", icon: Users, title: "Play a Friend", desc: "Pass and play on one device." },
  { to: "/play/computer", icon: Cpu, title: "Play Computer", desc: "Choose a difficulty and start instantly." },
  { to: "/play/online", icon: Globe, title: "Play Online", desc: "Share a link and play live." },
];

export function Home() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center py-10 text-center sm:py-16">
      <h1 className="text-[28px] font-medium tracking-tight text-ink dark:text-ink-dark sm:text-[34px]">Ready to play?</h1>
      <p className="mt-2 text-[14px] text-muted dark:text-muted-dark">No account needed. Pick a way to play.</p>

      <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
        {options.map(({ to, icon: Icon, title, desc }) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-col items-start gap-2 rounded border border-border bg-surface p-5 text-left transition-colors hover:border-accent dark:border-border-dark dark:bg-surface-dark dark:hover:border-accent-dark"
          >
            <Icon className="h-5 w-5 text-accent dark:text-accent-dark" strokeWidth={1.75} />
            <div className="text-[14px] font-medium text-ink dark:text-ink-dark">{title}</div>
            <div className="text-[12px] text-muted dark:text-muted-dark">{desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
