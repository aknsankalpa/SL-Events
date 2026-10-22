"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Building2, CalendarDays, CheckCheck, CheckCircle2, Flag, Hourglass, Landmark, Search, Settings, ShieldAlert, Ticket, TrendingUp, UserPlus, Users, Wallet } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { dashboardStats, platformActivity, services, ticketsPerDay, topEvents } from "@/lib/admin";
import { formatKrw } from "@/lib/format";
import { AdminHeader, BarChart, Meter, Panel } from "./ui";
import { useAdminCounts, useAdminEvents, useApplications } from "./useAdmin";

const periods = [
  { days: 7, label: "Last 7 days" },
  { days: 14, label: "Last 14 days" },
  { days: 30, label: "Last 30 days" },
];

const activityIcons = { payments: CheckCheck, users: UserPlus, event: CalendarDays, organizer: Building2, settings: Settings } as const;

/** Where the header search sends someone: booking numbers to the audit trail, emails to users, anything else to events. */
export function routeForSearch(q: string) {
  const s = q.trim();
  if (/^SL-\d+/i.test(s)) return `/admin/audit?q=${encodeURIComponent(s)}`;
  if (s.includes("@")) return `/admin/users?q=${encodeURIComponent(s)}`;
  return `/admin/events?q=${encodeURIComponent(s)}`;
}

export function DashboardPage() {
  const router = useRouter();
  const [days, setDays] = useState(30);
  const [query, setQuery] = useState("");
  const counts = useAdminCounts();
  const { events, dismissed } = useAdminEvents();
  const { applications } = useApplications();

  const series = useMemo(() => ticketsPerDay.slice(-days).map((value, i, a) => ({ value, label: dayLabel(a.length - 1 - i) })), [days]);
  const slow = services.filter((s) => s.state === "slow");
  const waitingOrgs = applications.filter((a) => a.status === "new" || a.status === "info_asked");
  const review = events.filter((e) => e.status === "review");
  const reported = events.filter((e) => e.reports && !dismissed[e.id]);

  const attention = [
    counts.payments > 0 && {
      Icon: Landmark,
      title: `${counts.payments} bank transfers to confirm`,
      sub: "Oldest: Malith Ekanayake, ₩60,000, waiting 5 h",
      href: "/admin/payments",
      cta: "Review",
      tone: "gold",
    },
    waitingOrgs.length > 0 && {
      Icon: Building2,
      title: `${waitingOrgs.length} organizer application${waitingOrgs.length === 1 ? "" : "s"}`,
      sub: `${waitingOrgs[waitingOrgs.length - 1]!.name} applied ${waitingOrgs[waitingOrgs.length - 1]!.ago}`,
      href: "/admin/organizers",
      cta: "Review",
      tone: "gold",
    },
    review.length > 0 && {
      Icon: CalendarDays,
      title: `${review.length} event${review.length === 1 ? "" : "s"} waiting for review`,
      sub: review.map((e) => e.title).join(", "),
      href: "/admin/events?tab=review",
      cta: "Review",
      tone: "gold",
    },
    reported.length > 0 && {
      Icon: Flag,
      title: `${reported.length} event${reported.length === 1 ? "" : "s"} reported by buyers`,
      sub: `${reported[0]!.title}: "price on poster is different"`,
      href: `/admin/events?event=${reported[0]!.id}`,
      cta: "Open",
      tone: "red",
    },
  ].filter(Boolean) as { Icon: typeof Landmark; title: string; sub: string; href: string; cta: string; tone: string }[];

  const s = dashboardStats;
  const cards = [
    { label: "Total users", value: s.totalUsers.toLocaleString("en-US"), Icon: Users, note: `+${s.newUsers} this month`, up: true },
    { label: "Active organizers", value: String(s.activeOrganizers), Icon: Building2, note: `${waitingOrgs.length} waiting for approval` },
    { label: "Upcoming events", value: String(s.upcomingEvents), Icon: CalendarDays, note: `${review.length} waiting for review` },
    { label: "Tickets sold", value: s.ticketsSold.toLocaleString("en-US"), Icon: Ticket, note: "last 30 days", up: true },
    { label: "Payments to confirm", value: String(counts.payments), Icon: Hourglass, note: `Oldest waiting ${s.oldestWaiting}`, warn: true },
    { label: "Ticket sales", value: formatKrw(s.ticketSales), Icon: Wallet, note: "last 30 days", up: true },
  ];

  return (
    <>
      <AdminHeader
        section="Good evening, Sanduni"
        title="Platform overview"
        actions={
          <>
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                if (query.trim()) router.push(routeForSearch(query));
              }}
              className="flex h-11 w-full items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 focus-within:border-gold sm:w-72"
            >
              <Search size={14} aria-hidden className="text-muted" />
              <label className="sr-only" htmlFor="admin-search">
                Search users, events or bookings
              </label>
              <input
                id="admin-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users, events or bookings"
                className="h-full w-full bg-transparent text-[13px] text-text placeholder:text-dim focus:outline-none"
              />
            </form>
            <Select
              aria-label="Period"
              value={String(days)}
              onChange={(e) => setDays(Number(e.target.value))}
              className="h-11 rounded-xl border border-line bg-surface-2 px-3 text-[13px] text-text focus:border-gold focus:outline-none"
            >
              {periods.map((p) => (
                <option key={p.days} value={p.days}>
                  {p.label}
                </option>
              ))}
            </Select>
          </>
        }
      />

      <div
        role="status"
        className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-[13px] ${
          slow.length ? "border-amber/40 bg-amber/10 text-text" : "border-success/40 bg-success/10 text-text"
        }`}
      >
        <p className="flex items-center gap-2.5">
          {slow.length ? <ShieldAlert size={16} aria-hidden className="text-amber" /> : <CheckCircle2 size={16} aria-hidden className="text-success" />}
          {slow.length
            ? `${slow.map((x) => x.name).join(", ")} ${slow.length === 1 ? "is" : "are"} running slowly. Last backup finished today at 3:00 AM.`
            : "All systems are working normally. Last backup finished today at 3:00 AM."}
        </p>
        <Link href="/admin/system" className="text-xs font-bold text-success hover:brightness-110">
          View system
        </Link>
      </div>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map(({ label, value, Icon, note, up, warn }) => (
          <li key={label} className="min-w-0 rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-bold leading-tight text-muted">{label}</p>
              <Icon size={14} aria-hidden className="shrink-0 text-dim" />
            </div>
            <p className="mt-3 truncate text-[22px] font-bold leading-none text-text xl:text-[20px] 2xl:text-[24px]">{value}</p>
            <p className={`mt-2.5 flex items-center gap-1 text-[11px] ${warn ? "text-amber" : up ? "text-success" : "text-dim"}`}>
              {up && <TrendingUp size={11} aria-hidden />}
              {warn && <Hourglass size={11} aria-hidden />}
              {note}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Panel className="p-5 sm:p-6" aria-label="Needs your attention">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-text">Needs your attention</h2>
              <p className="mt-1 text-[11px] text-dim">Work through these from top to bottom.</p>
            </div>
            <span className="rounded-full border border-amber/40 bg-amber/10 px-2.5 py-1 text-[10px] font-bold text-amber">{attention.length} OPEN</span>
          </div>
          {attention.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">Nothing is waiting for you. Nice.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {attention.map(({ Icon, title, sub, href, cta, tone }) => (
                <li key={title} className="flex items-center gap-3 py-3.5">
                  <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${tone === "red" ? "bg-danger/15 text-danger" : "bg-gold/15 text-gold"}`}>
                    <Icon size={16} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[13px] font-bold text-text">{title}</span>
                    <span className="mt-1 block truncate text-[11px] text-dim">{sub}</span>
                  </span>
                  <LinkButton
                    href={href}
                    size="sm"
                    variant={cta === "Review" ? "primary" : "outline"}
                    className={cta === "Review" ? "" : "border-line text-text hover:bg-surface-2"}
                  >
                    {cta}
                  </LinkButton>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="p-5 sm:p-6" aria-label="Tickets sold per day">
          <h2 className="text-base font-bold text-text">Tickets sold per day</h2>
          <p className="mt-1 text-[11px] text-dim">All events · confirmed payments · {periods.find((p) => p.days === days)!.label.toLowerCase()}</p>
          <BarChart data={series} height={170} labelEvery={days <= 7 ? 1 : days <= 14 ? 2 : 5} />
        </Panel>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel className="overflow-hidden" aria-label="Top events this month">
          <h2 className="p-5 pb-4 text-base font-bold text-text sm:p-6 sm:pb-4">Top events this month</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-[13px]">
              <thead className="bg-surface-2 text-[10px] uppercase tracking-wider text-dim">
                <tr>
                  {["Event", "Organizer", "Sold", "Sales"].map((h) => (
                    <th key={h} scope="col" className="px-5 py-3 font-bold first:pl-6">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topEvents.map((e) => (
                  <tr key={e.name} className="border-t border-line">
                    <td className="px-5 py-4 pl-6 font-bold text-text">{e.name}</td>
                    <td className="px-5 py-4 text-muted">{e.organizer}</td>
                    <td className="px-5 py-4">
                      <p className="mb-1.5 text-[11px] text-muted">
                        {e.sold} / {e.capacity}
                      </p>
                      <Meter value={e.sold} max={e.capacity} className="w-28" />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-bold text-text">{formatKrw(e.sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6" aria-label="Platform activity">
          <h2 className="text-base font-bold text-text">Platform activity</h2>
          <ul className="mt-4 divide-y divide-line">
            {platformActivity.map((a) => {
              const Icon = activityIcons[a.icon];
              return (
                <li key={a.text} className="flex items-start gap-3 py-3">
                  <Icon size={14} aria-hidden className="mt-1 shrink-0 text-gold" />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block text-[13px] text-text">{a.text}</span>
                    <span className="mt-1 block text-[11px] text-dim">{a.sub}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-dim">{a.time}</span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </>
  );
}

/** "Oct 15" style label for a day this many days before today (the portal's mock "today" is 19 Oct). */
function dayLabel(daysAgo: number) {
  const d = new Date(Date.UTC(2026, 9, 19 - daysAgo));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
