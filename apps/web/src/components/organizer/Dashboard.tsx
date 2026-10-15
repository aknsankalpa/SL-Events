"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CalendarDays, CheckCheck, ChevronDown, Download, FileText, Grid2x2, Plus, Users } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
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
import { EventCalendar } from "./dashboard/EventCalendar";
import { ActivityTabs } from "./dashboard/ActivityTabs";
import { SalesChart } from "./dashboard/SalesChart";
import { StatCards } from "./dashboard/StatCards";
import { UpcomingEvents } from "./dashboard/UpcomingEvents";
import { downloadCsv } from "./ui";
import { Select } from "@/components/ui/Select";

const periods = [
  { days: 7, label: "Last 7 days" },
  { days: 14, label: "Last 14 days" },
  { days: 30, label: "Last 30 days" },
];

const reportIcons = { sales: FileText, bookings: FileText, attendees: Users, verification: CheckCheck } as const;

export function Dashboard() {
  const { events, pending } = useOrganizer();
  const [days, setDays] = useState(14);
  const [eventFilter, setEventFilter] = useState("all");

  const series = useMemo(() => dailySales.slice(-days), [days]);
  const shownEvents = events.filter((e) => eventFilter === "all" || e.id === eventFilter);
  const byTicket = salesByTicket.filter((t) => eventFilter === "all" || t.event === eventFilter);
  const periodLabel = periods.find((p) => p.days === days)!.label.toLowerCase();
  const oldest = verifyQueue[0]?.waited.replace(" ago", "");

  return (
    // On desktop the dashboard is exactly one screen tall (the page never scrolls) and the long lists scroll inside
    // their own panels. The floor keeps very short windows scrollable instead of crushing the panels. Phones stack.
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 lg:h-[max(calc(100dvh-3.5rem),32rem)]">
      <header className="relative rounded-2xl border border-line bg-surface px-4 py-3 sm:px-5">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(60%_160%_at_0%_0%,rgb(150_20_20/0.35),transparent_70%),radial-gradient(40%_140%_at_100%_0%,rgb(110_80_20/0.35),transparent_70%)]" />
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
          <div className="min-w-0">
            <h1 className="font-display text-[22px] font-bold leading-tight text-text sm:text-[26px] lg:text-[22px] xl:text-[26px]">
              Welcome back, {organizer.name.split(" ")[0]}
            </h1>
            <p className="mt-1 text-[13px] text-muted">
              <span className="font-bold text-amber">{organizer.org}</span> · {dashboardStats.soldThisWeek} tickets sold this week
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
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
            <LinkButton href="/organizer/events/new" variant="outline" size="sm">
              <Plus size={16} aria-hidden /> <span>Create<span className="lg:hidden xl:inline"> event</span></span>
            </LinkButton>
          </div>
        </div>
      </header>

      {pending > 0 && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-6 gap-y-1.5 rounded-2xl border border-amber/40 bg-amber/10 px-4 py-2 text-[13px] text-text sm:px-5"
        >
          {pending > 0 && (
            <p className="flex flex-wrap items-center gap-x-3">
              <span>
                <strong className="font-bold">{pending} payments</strong> to verify
                {oldest ? ` · oldest ${oldest}` : ""}
              </span>
              <Link href="/organizer/verify-payments" className="flex items-center gap-1 text-xs font-bold text-amber hover:text-gold">
                Review payments <ArrowRight size={13} aria-hidden />
              </Link>
            </p>
          )}
        </div>
      )}

      <StatCards pending={pending} />

      {/* "contents" keeps these wrappers out of the way on phones (one stacked column) and makes them the two
          desktop columns. Upcoming events come first on phones, straight after the numbers. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="contents lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,1fr)] lg:grid-rows-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-4">
          <SalesChart series={series} avgPrice={dashboardStats.avgTicketPrice} periodLabel={periodLabel} />
          <ActivityTabs events={shownEvents} slices={byTicket.map((t) => ({ label: t.label, sold: t.sold }))} />
        </div>

        <div className="contents lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,1fr)] lg:grid-rows-[minmax(7.5rem,1fr)_auto] lg:gap-4">
          <div className="order-first lg:order-none lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,1fr)]">
            <UpcomingEvents events={shownEvents} />
          </div>
          <EventCalendar events={events} />
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
    <label className="relative flex h-9 items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 text-[13px] font-bold text-text focus-within:border-gold">
      <span className="text-muted lg:hidden xl:block">{icon}</span>
      <span className="sr-only">{label}</span>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full max-w-[11rem] bg-transparent pr-3 focus:outline-none"
      >
        {children}
      </Select>
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
      <Button size="sm" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Download size={16} aria-hidden /> <span className="lg:hidden xl:inline">Download report</span>
        <span className="hidden lg:inline xl:hidden">Report</span>
        <ChevronDown size={14} aria-hidden />
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
