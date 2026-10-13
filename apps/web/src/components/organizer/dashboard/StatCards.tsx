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
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {cards.map(({ label, value, Icon, tone, chip, note }) => (
        <li key={label} className="min-w-0 rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <span className={`flex size-10 items-center justify-center rounded-xl sm:size-11 ${tones[tone]}`}>
              <Icon size={20} aria-hidden />
            </span>
            {chip && (
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold sm:px-2.5 sm:text-[11px] ${
                  chip.warn ? "bg-amber/15 text-amber" : "bg-success/15 text-success"
                }`}
              >
                {chip.up && <ArrowUpRight size={12} aria-hidden />}
                {chip.text}
              </span>
            )}
          </div>
          <p className="mt-4 text-xs font-bold text-muted sm:mt-5">{label}</p>
          <p className="mt-1.5 text-[20px] font-bold leading-tight text-text sm:text-[28px] sm:leading-none">{value}</p>
          <p className="mt-2.5 text-[11px] leading-snug text-dim sm:mt-3">{note}</p>
        </li>
      ))}
    </ul>
  );
}
