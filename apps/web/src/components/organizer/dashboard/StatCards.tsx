import { ArrowUpRight, Clock3, Ticket, Wallet, LayoutGrid, type LucideIcon } from "lucide-react";
import { formatKrw } from "@/lib/format";
import { dashboardStats } from "@/lib/organizer";

type Tone = "gold" | "green" | "red" | "cream";

const tones: Record<Tone, string> = {
  gold: "bg-gold/15 text-gold",
  green: "bg-success/15 text-success",
  red: "bg-danger/15 text-danger",
  cream: "bg-white/10 text-text",
};

type Card = {
  label: string;
  value: string;
  Icon: LucideIcon;
  tone: Tone;
  chip?: { text: string; up?: boolean; warn?: boolean };
  note: string;
};

export function StatCards({ pending }: { pending: number }) {
  const s = dashboardStats;
  const cards: Card[] = [
    {
      label: "Tickets sold",
      value: s.ticketsSold.toLocaleString("en-US"),
      Icon: Ticket,
      tone: "gold",
      chip: { text: `${s.soldChangePct}%`, up: true },
      note: `+${s.soldThisWeek} this week`,
    },
    {
      label: "Revenue confirmed",
      value: formatKrw(s.revenue),
      Icon: Wallet,
      tone: "green",
      chip: { text: `${s.revenueChangePct}%`, up: true },
      note: `+${formatKrw(s.revenueThisWeek)} this week`,
    },
    {
      label: "Waiting for verification",
      value: String(pending),
      Icon: Clock3,
      tone: "red",
      chip: pending > 0 ? { text: "Needs review", warn: true } : undefined,
      note: `${formatKrw(s.waitingAmount)} not yet confirmed`,
    },
    {
      label: "Tickets left",
      value: s.ticketsLeft.toLocaleString("en-US"),
      Icon: LayoutGrid,
      tone: "cream",
      note: `of ${s.ticketsTotal} across live events`,
    },
  ];

  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(({ label, value, Icon, tone, chip, note }) => (
        <li key={label} className="min-w-0 rounded-2xl border border-line bg-surface p-3.5 sm:p-4">
          <div className="flex items-center gap-3">
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl lg:hidden xl:flex ${tones[tone]}`}>
              <Icon size={18} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-muted">{label}</p>
              <p className="mt-1 truncate text-[19px] font-bold leading-none text-text sm:text-[22px] lg:text-[20px] 2xl:text-[22px]">{value}</p>
            </div>
          </div>
          <div className="mt-2.5 flex min-w-0 items-center gap-2 text-[11px] lg:hidden lg:[@media(min-height:820px)]:flex">
            {chip && (
              <span
                className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  chip.warn ? "bg-amber/15 text-amber" : "bg-success/15 text-success"
                }`}
              >
                {chip.up && <ArrowUpRight size={11} aria-hidden />}
                {chip.text}
              </span>
            )}
            <span className="truncate text-dim">{note}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
