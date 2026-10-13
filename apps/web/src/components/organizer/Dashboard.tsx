"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CheckCheck, ChevronDown, Download, FileText, Grid2x2, Hourglass, Ticket, TrendingUp, TriangleAlert, Users } from "lucide-react";
import { EventThumb } from "@/components/ui/Card";
import { Badge } from "@/components/ui/StatusBadge";
import { formatKrw } from "@/lib/format";
import {
  dailySales,
  dashboardStats,
  organizer,
  organizerEvents,
  orgBookings,
  reportOptions,
  salesByTicket,
  verifyQueue,
} from "@/lib/organizer";
import { Button } from "@/components/ui/Button";
import { downloadCsv, OrgPageHeader, Panel, StatCard } from "./ui";

const periods = [
  { days: 7, label: "Last 7 days" },
  { days: 14, label: "Last 14 days" },
  { days: 30, label: "Last 30 days" },
];

const reportIcons = { sales: FileText, bookings: FileText, attendees: Users, verification: CheckCheck } as const;

export function Dashboard() {
  const [days, setDays] = useState(14);
  const [eventFilter, setEventFilter] = useState("all");

  const series = useMemo(() => dailySales.slice(-days), [days]);
  const max = Math.max(...series.map((d) => d.value));
  const axisMax = Math.ceil(max / 20) * 20;

  const events = organizerEvents.filter((e) => eventFilter === "all" || e.id === eventFilter);
  const byTicket = salesByTicket.filter((t) => eventFilter === "all" || t.event === eventFilter);
  const periodLabel = periods.find((p) => p.days === days)!.label.toLowerCase();

  return (
    <>
      <OrgPageHeader
        crumbs={[{ label: organizer.org }]}
        title="Sales dashboard"
        actions={
          <>
            <SelectPill label="Period" icon={<CalendarDays size={14} />} value={String(days)} onChange={(v) => setDays(Number(v))}>
              {periods.map((p) => (
                <option key={p.days} value={p.days}>
                  {p.label}
                </option>
              ))}
            </SelectPill>
            <SelectPill label="Event" icon={<Grid2x2 size={14} />} value={eventFilter} onChange={setEventFilter}>
              <option value="all">All events</option>
              {organizerEvents.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </SelectPill>
            <ReportMenu periodLabel={periodLabel} />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tickets sold"
          value={dashboardStats.ticketsSold}
          Icon={Ticket}
          subTone="up"
          sub={
            <>
              <TrendingUp size={12} aria-hidden /> +{dashboardStats.soldThisWeek} this week
            </>
          }
        />
        <StatCard
          label="Revenue confirmed"
          value={formatKrw(dashboardStats.revenue)}
          subTone="up"
          sub={
            <>
              <TrendingUp size={12} aria-hidden /> +{formatKrw(dashboardStats.revenueThisWeek)} this week
            </>
          }
        />
        <StatCard
          label="Waiting for verification"
          value={dashboardStats.waiting}
          Icon={Hourglass}
          subTone="warn"
          sub={
            <>
              <TriangleAlert size={12} aria-hidden /> {formatKrw(dashboardStats.waitingAmount)} not yet confirmed
            </>
          }
        />
        <StatCard
          label="Tickets left"
          value={dashboardStats.ticketsLeft}
          Icon={Grid2x2}
          sub={`of ${dashboardStats.ticketsTotal} across live events`}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Panel className="p-6">
          <h2 className="text-base font-bold text-text">Tickets sold per day</h2>
          <p className="mt-1 text-[11px] text-dim">Confirmed payments only · {periodLabel}</p>

          <figure className="mt-5" aria-label={`Tickets sold per day, ${periodLabel}`}>
            <div className="flex gap-3">
              <div aria-hidden className="flex h-48 flex-col justify-between pb-6 text-[10px] text-dim">
                {[axisMax, axisMax * 0.75, axisMax * 0.5, axisMax * 0.25, 0].map((t) => (
                  <span key={t}>{Math.round(t)}</span>
                ))}
              </div>
              <ol className="flex h-48 flex-1 items-end gap-1 sm:gap-1.5">
                {series.map((d, i) => {
                  const last = i === series.length - 1;
                  const showLabel = days <= 14 ? i % 2 === 0 : i % 5 === 0;
                  return (
                    <li key={d.date} className="relative flex h-full min-w-0 flex-1 flex-col justify-end">
                      {last && <span className="mb-1 text-center text-[11px] font-bold text-text">{d.value}</span>}
                      <span
                        title={`${d.label}: ${d.value} tickets`}
                        style={{ height: `${(d.value / axisMax) * 100 * 0.875}%` }}
                        className={`block w-full rounded-t ${last ? "bg-gradient-to-t from-amber to-gold" : "bg-amber/70"}`}
                      />
                      <span className="relative mt-2 block h-4 text-[10px] leading-4 text-dim">
                        <span
                          className={
                            showLabel ? "absolute left-1/2 -translate-x-1/2 whitespace-nowrap" : "sr-only"
                          }
                        >
                          {d.label}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </figure>
        </Panel>

        <Panel className="p-6">
          <h2 className="text-base font-bold text-text">Sales by ticket type</h2>
          <p className="mt-1 text-[11px] text-dim">{eventFilter === "all" ? "All events" : events[0]?.title} · tickets sold of quantity</p>
          <ul className="mt-5 space-y-5">
            {byTicket.map((t) => (
              <li key={t.label}>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-text">{t.label}</span>
                  <span className="text-muted">
                    {t.sold} / {t.of}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber to-gold" style={{ width: `${(t.sold / t.of) * 100}%` }} />
                </div>
              </li>
            ))}
            {byTicket.length === 0 && <li className="text-sm text-muted">No sales yet.</li>}
          </ul>
        </Panel>
      </div>

      <h2 className="mb-3 mt-8 font-display text-xl font-bold text-text">By event</h2>
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-[13px]">
            <thead className="border-b border-line text-[10px] uppercase tracking-wider text-dim">
              <tr>
                {["Event", "Date", "Sold", "Revenue", "To verify"].map((h) => (
                  <th key={h} scope="col" className="px-5 py-3.5 font-bold">
                    {h}
                  </th>
                ))}
                <th scope="col" className="px-5">
                  <span className="sr-only">Report</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-3 font-bold text-text">
                      <EventThumb category={e.category} size={28} />
                      {e.title}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted">{e.shortDate}</td>
                  <td className="px-5 py-4">
                    <div className="w-32">
                      <p className="mb-1.5 text-[11px] text-muted">
                        {e.sold} / {e.capacity}
                      </p>
                      <div className="h-1.5 overflow-hidden rounded-full bg-line">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber to-gold" style={{ width: `${(e.sold / e.capacity) * 100}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-bold text-text">{formatKrw(e.revenue)}</td>
                  <td className="px-5 py-4">
                    {e.pending > 0 ? <Badge tone="warning">{e.pending} pending</Badge> : <span className="text-dim">—</span>}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-line text-text hover:bg-surface-2"
                      onClick={() =>
                        downloadCsv(`${e.id}-report.csv`, [
                          ["Event", "Date", "Sold", "Capacity", "Revenue (KRW)", "Payments to verify"],
                          [e.title, e.shortDate, e.sold, e.capacity, e.revenue, e.pending],
                        ])
                      }
                    >
                      <Download size={14} aria-hidden /> Report
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function SelectPill({
  label,
  icon,
  value,
  onChange,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="relative flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-[13px] font-bold text-text focus-within:border-gold">
      <span className="text-muted">{icon}</span>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full max-w-[11rem] cursor-pointer appearance-none bg-transparent pr-6 focus:outline-none"
      >
        {children}
      </select>
      <ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-3 text-muted" />
    </label>
  );
}

function ReportMenu({ periodLabel }: { periodLabel: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function download(id: (typeof reportOptions)[number]["id"]) {
    // Every report is exported as CSV for now; real PDF/Excel generation needs the backend.
    if (id === "sales") {
      downloadCsv("sales-summary.csv", [
        ["Event", "Date", "Sold", "Capacity", "Revenue (KRW)"],
        ...organizerEvents.map((e) => [e.title, e.shortDate, e.sold, e.capacity, e.revenue]),
      ]);
    } else if (id === "bookings") {
      downloadCsv("all-bookings.csv", [
        ["Booking", "Buyer", "Email", "Tickets", "Amount (KRW)", "Status", "Booked"],
        ...orgBookings.map((b) => [b.id, b.buyer, b.email, b.tickets, b.amount, b.status, b.booked]),
      ]);
    } else if (id === "attendees") {
      downloadCsv("attendees.csv", [
        ["Ticket holder", "Ticket", "Booking"],
        ...orgBookings.flatMap((b) => b.holders.map((h) => [h.name, h.ticket, b.id])),
      ]);
    } else {
      downloadCsv("payment-verification-log.csv", [
        ["Booking", "Buyer", "Amount (KRW)", "Waiting"],
        ...verifyQueue.map((q) => [q.booking, q.buyer, q.amount, q.waited]),
      ]);
    }
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <Button aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Download size={16} aria-hidden /> Download report <ChevronDown size={14} aria-hidden />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface-2 p-2 shadow-2xl shadow-black/60"
        >
          {reportOptions.map((r) => {
            const Icon = reportIcons[r.id];
            return (
              <button
                key={r.id}
                role="menuitem"
                type="button"
                onClick={() => download(r.id)}
                className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-gold/10 focus-visible:focus-ring"
              >
                <Icon size={16} aria-hidden className="mt-0.5 shrink-0 text-gold" />
                <span className="leading-tight">
                  <span className="block text-[13px] font-bold text-text">{r.title}</span>
                  <span className="mt-1 block text-[11px] text-dim">{r.hint}</span>
                </span>
              </button>
            );
          })}
          <div className="mt-1 flex items-center justify-between border-t border-line px-3 pb-1 pt-3 text-[11px] text-dim">
            <span>Period: {periodLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
}
