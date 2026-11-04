import { Link } from "react-router-dom";
import { Users, Cpu, Globe, ChevronRight } from "lucide-react";

const options = [
  { to: "/play/friend", icon: Users, title: "Play a Friend", desc: "Play locally on the same device." },
  { to: "/play/computer", icon: Cpu, title: "Play Computer", desc: "Challenge Stockfish at your level." },
  { to: "/play/online", icon: Globe, title: "Play Online", desc: "Invite someone using a shareable link." },
];

export function PlayHub() {
  return (
    <div className="relative -mx-5 -mt-4 px-5 pt-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6">
      {/* Same shared king photo as every other page (rendered once in App.tsx). Non-interactive
 text sits directly on the photo; the option list gets the same translucent boxed-card
 treatment as Learn's lesson list, so it reads as tappable. */}
      <div className="mx-auto flex max-w-xl flex-col items-center py-12 text-center sm:py-20">
        <h1 className="text-[30px] font-semibold tracking-tight text-ink sm:text-[36px]">Ready to play?</h1>
        <p className="mt-2.5 text-[15px] text-[#4a3728]">No account needed. Pick a way to play.</p>

        <div className="mt-10 flex w-full flex-col divide-y divide-ink/15 rounded-xl border border-ink/15 bg-[#f6f3e8]/50 backdrop-blur-[2px]">
          {options.map(({ to, icon: Icon, title, desc }) => (
            <Link key={to} to={to} className="group flex items-center gap-4 p-4 text-left transition-colors hover:bg-ink/[0.06]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/[0.18] text-accent transition-colors group-hover:bg-accent/[0.28]">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </span>
              <span className="flex-1">
                <span className="block text-[15px] font-medium text-ink">{title}</span>
                <span className="block text-[13px] text-[#4a3728]">{desc}</span>
              </span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-[#4a3728]/70 transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                strokeWidth={1.75}
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
