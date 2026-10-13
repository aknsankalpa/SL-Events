"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CalendarDays, CheckCheck, ChevronDown, Download, FileText, Grid2x2, Plus, Users } from "lucide-react";
import { EventThumb } from "@/components/ui/Card";
import { Badge } from "@/components/ui/StatusBadge";
import { Button, LinkButton } from "@/components/ui/Button";
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
import { useOrganizer } from "./OrganizerContext";
import { useRefundRequests } from "./useRefundRequests";
import { EventCalendar } from "./dashboard/EventCalendar";
import { RecentOrders } from "./dashboard/RecentOrders";
import { SalesChart } from "./dashboard/SalesChart";
import { StatCards } from "./dashboard/StatCards";
import { TicketMix } from "./dashboard/TicketMix";
import { UpcomingEvents } from "./dashboard/UpcomingEvents";
import { downloadCsv } from "./ui";

const periods = [
  { days: 7, label: "Last 7 days" },
  { days: 14, label: "Last 14 days" },
  { days: 30, label: "Last 30 days" },
];

const reportIcons = { sales: FileText, bookings: FileText, attendees: Users, verification: CheckCheck } as const;

export function Dashboard() {
  const { events, pending } = useOrganizer();
  const { pending: requestsPending } = useRefundRequests();
  const [days, setDays] = useState(14);
  const [eventFilter, setEventFilter] = useState("all");

  const series = useMemo(() => dailySales.slice(-days), [days]);
  const shownEvents = events.filter((e) => eventFilter === "all" || e.id === eventFilter);
  const byTicket = salesByTicket.filter((t) => eventFilter === "all" || t.event === eventFilter);
  const periodLabel = periods.find((p) => p.days === days)!.label.toLowerCase();
  const oldest = verifyQueue[0]?.waited.replace(" ago", "");

  return (
    <div className="mx-auto max-w-[96rem]">
      <header className="relative mb-6 overflow-hidden rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_140%_at_0%_0%,rgb(150_20_20/0.35),transparent_70%),radial-gradient(40%_120%_at_100%_0%,rgb(110_80_20/0.35),transparent_70%)]"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-amber">{organizer.org}</p>
            <h1 className="mt-2 font-display text-[28px] font-bold leading-tight text-text sm:text-[34px]">
              Welcome back, {organizer.name.split(" ")[0]}
            </h1>
            <p className="mt-2 text-sm text-muted">
              Here&apos;s how your events are doing. {dashboardStats.soldThisWeek} tickets sold this week.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SelectPill label="Period" icon={<CalendarDays size={14} />} value={String(days)} onChange={(v) => setDays(Number(v))}>
              {periods.map((p) => (
                <option key={p.days} value={p.days}>
                  {p.label}
                </option>
              ))}
            </SelectPill>
            <SelectPill label="Event" icon={<Grid2x2 size={14} />} value={eventFilter} onChange={setEventFilter}>
              <option value="all">All events</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </SelectPill>
            <ReportMenu periodLabel={periodLabel} />
            <LinkButton href="/organizer/events/new" variant="outline" className="h-11">
              <Plus size={16} aria-hidden /> Create event
            </LinkButton>
          </div>
        </div>
      </header>

      {pending > 0 && (
        <div
          role="status"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber/40 bg-amber/10 px-5 py-4"
        >
          <p className="text-[13px] text-text">
            <strong className="font-bold">{pending} payments</strong> are waiting for verification
            {oldest ? ` · oldest ${oldest}` : ""}. Buyers get their tickets as soon as you approve.
          </p>
          <Link href="/organizer/verify-payments" className="flex items-center gap-1.5 text-xs font-bold text-amber hover:text-gold">
            Review payments <ArrowRight size={13} aria-hidden />
          </Link>
        </div>
      )}

      {requestsPending > 0 && (
        <div
          role="status"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-5 py-4"
        >
          <p className="text-[13px] text-text">
            <strong className="font-bold">
              {requestsPending} refund or cancellation request{requestsPending === 1 ? " is" : "s are"}
            </strong>{" "}
            waiting for your decision.
          </p>
          <Link href="/organizer/requests" className="flex items-center gap-1.5 text-xs font-bold text-amber hover:text-gold">
            Review requests <ArrowRight size={13} aria-hidden />
          </Link>
        </div>
      )}

      <StatCards pending={pending} />

      {/* On phones the upcoming events come straight after the numbers; on wide screens they sit in the side column. */}
      <div className="mt-6 xl:hidden">
        <UpcomingEvents events={shownEvents} />
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_23.5rem]">
        <div className="min-w-0 space-y-6">
          <SalesChart series={series} avgPrice={dashboardStats.avgTicketPrice} periodLabel={periodLabel} />
          <RecentOrders />

          <section className="overflow-hidden rounded-2xl border border-line bg-surface" aria-label="Event performance">
            <div className="p-5 pb-4 sm:p-6 sm:pb-4">
              <h2 className="text-base font-bold text-text">Event performance</h2>
              <p className="mt-1 text-[11px] text-dim">Sales and payments to check, per event</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-[13px]">
                <thead className="bg-surface-2 text-[10px] uppercase tracking-wider text-dim">
                  <tr>
                    {["Event", "Date", "Sold", "Revenue", "To verify"].map((h) => (
                      <th key={h} scope="col" className="whitespace-nowrap px-5 py-3 font-bold">
                        {h}
                      </th>
                    ))}
                    <th scope="col" className="px-5">
                      <span className="sr-only">Report</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shownEvents.map((e) => (
                    <tr key={e.id} className="border-t border-line">
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-3 font-bold text-text">
                          <EventThumb category={e.category} size={30} />
                          <span className="whitespace-nowrap">{e.title}</span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-muted">{e.shortDate}</td>
                      <td className="px-5 py-4">
                        <div className="w-32">
                          <p className="mb-1.5 text-[11px] text-muted">
                            {e.sold} / {e.capacity}
                          </p>
                          <div className="h-1.5 overflow-hidden rounded-full bg-line">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber to-gold"
                              style={{ width: `${e.capacity ? (e.sold / e.capacity) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-bold text-text">{formatKrw(e.revenue)}</td>
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
                  {shownEvents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted">
                        No events to show.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="min-w-0 space-y-6">
          <div className="hidden xl:block">
            <UpcomingEvents events={shownEvents} />
          </div>
          <EventCalendar events={events} />
          <TicketMix slices={byTicket.map((t) => ({ label: t.label, sold: t.sold }))} />
        </div>
      </div>
    </div>
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
    <label className="relative flex h-11 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 text-[13px] font-bold text-text focus-within:border-gold">
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
