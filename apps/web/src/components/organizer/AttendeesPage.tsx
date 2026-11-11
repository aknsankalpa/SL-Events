"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Hourglass, ScanLine, Search, Star, TriangleAlert, UserCheck, Users } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/StatusBadge";
import type { Attendee } from "@/lib/organizer";
import { useEventData } from "./useEventData";
import { useOrganizer } from "./OrganizerContext";
import { downloadCsv, EventPicker, OrgPageHeader, Panel, StatCard } from "./ui";
import { Select } from "@/components/ui/Select";

const PAGE_SIZE = 7;

export function AttendeesPage() {
  const { event } = useOrganizer();
  type Stats = { total: number; paidBookings: number; checkedIn: number; vip: number; unpaidTickets: number; ticketsListed: number };
  const { data, error, reload } = useEventData<{ attendees: Attendee[]; stats: Stats }>(event.id ? `/api/organizer/events/${encodeURIComponent(event.id)}/attendees` : null);
  const rows = useMemo(() => data?.attendees ?? [], [data]);
  const attendeeStats: Stats = data?.stats ?? { total: 0, paidBookings: 0, checkedIn: 0, vip: 0, unpaidTickets: 0, ticketsListed: 0 };
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [query, setQuery] = useState("");
  const [ticket, setTicket] = useState("all");
  const [state, setState] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (a) =>
        (!q || `${a.name} ${a.email} ${a.code}`.toLowerCase().includes(q)) &&
        (ticket === "all" || a.ticket.split(" · ")[0] === ticket) &&
        (state === "all" || a.state === state),
    );
  }, [rows, query, ticket, state]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const checkedIn = rows.filter((a) => a.state === "checked_in").length;

  /** Checks a ticket in on the server, which admits each code once, even with several scanners at the door. */
  async function checkIn(code: string) {
    try {
      const res = await fetch("/api/staff/checkin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId: event.id, code, gate: "Attendee list" }),
        credentials: "same-origin",
        cache: "no-store",
      });
      const r = (await res.json().catch(() => ({}))) as { outcome?: string; holder?: string; scannedAt?: string; error?: string };
      const text: Record<string, string> = {
        admitted: `${r.holder} is checked in.`,
        already_used: `${r.holder} was already checked in${r.scannedAt ? ` (${r.scannedAt})` : ""}.`,
        not_paid: `${r.holder}'s booking isn't paid yet.`,
        cancelled: `${r.holder}'s booking was cancelled.`,
        wrong_event: "That ticket is for a different event.",
        not_found: "That ticket code doesn't exist.",
        too_early: "Check-in hasn't opened yet for this event.",
        too_late: "Entry has closed for this event (late cut-off).",
      };
      setMessage({ ok: r.outcome === "admitted", text: r.outcome ? text[r.outcome]! : (r.error ?? "Couldn't check in.") });
    } catch {
      setMessage({ ok: false, text: "We couldn't reach SL Events." });
    }
    await reload();
  }

  const resetPage = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <>
      <OrgPageHeader
        crumbs={[{ label: event.title }, { label: "Attendees" }]}
        title="Attendees"
        actions={
          <>
            <EventPicker />
            <Button
              variant="outline"
              className="border-line text-text hover:bg-surface-2"
              onClick={() =>
                downloadCsv("attendees.csv", [
                  ["Ticket holder", "Email", "Ticket", "Code", "Booking", "Check-in"],
                  ...filtered.map((a) => [a.name, a.email, a.ticket, a.code, a.booking, a.state]),
                ])
              }
            >
              <Download size={16} aria-hidden /> Export Excel
            </Button>
            <LinkButton href="/organizer/scanner">
              <ScanLine size={16} aria-hidden /> Open scanner
            </LinkButton>
          </>
        }
      />

      {message && (
        <p role="status" className={`mb-4 rounded-lg border px-4 py-3 text-sm text-text ${message.ok ? "border-success/40 bg-success/10" : "border-amber/40 bg-amber/10"}`}>
          {message.text}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Attendees" value={attendeeStats.total} Icon={Users} sub={`From ${attendeeStats.paidBookings} paid bookings`} />
        <StatCard
          label="Checked in"
          value={`${checkedIn} / ${attendeeStats.total}`}
          Icon={UserCheck}
          sub={event.dateLabel || "Ticket holders who have come in"}
        />
        <StatCard label="VIP guests" value={attendeeStats.vip} Icon={Star} sub="Paid tickets with VIP in their name" />
        <StatCard
          label="Not yet paid"
          value={`${attendeeStats.unpaidTickets} tickets`}
          Icon={Hourglass}
          subTone="warn"
          sub={
            <>
              <TriangleAlert size={12} aria-hidden /> Can&apos;t be checked in until approved
            </>
          }
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="flex h-12 flex-1 items-center gap-3 rounded-xl border border-line bg-surface px-4 focus-within:border-gold">
          <Search size={16} aria-hidden className="text-muted" />
          <span className="sr-only">Search name, email or ticket code</span>
          <input
            type="search"
            value={query}
            onChange={(e) => resetPage(setQuery)(e.target.value)}
            placeholder="Search name, email or ticket code"
            className="w-full bg-transparent text-sm text-text placeholder:text-dim focus:outline-none"
          />
        </label>
        <FilterSelect label="Ticket type" value={ticket} onChange={resetPage(setTicket)}>
          <option value="all">All ticket types</option>
          {[...new Set(rows.map((a) => a.ticket.split(" · ")[0]!))].sort().map((t) => (
            <option key={t}>{t}</option>
          ))}
        </FilterSelect>
        <FilterSelect label="Check-in state" value={state} onChange={resetPage(setState)}>
          <option value="all">All check-in states</option>
          <option value="not_yet">Not yet</option>
          <option value="checked_in">Checked in</option>
          <option value="cancelled">Cancelled</option>
        </FilterSelect>
      </div>

      <Panel className="mt-5 overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[44rem] text-left text-[13px]">
            <thead className="border-b border-line text-[10px] uppercase tracking-wider text-dim">
              <tr>
                {["Ticket holder", "Ticket", "Code", "Booking", "Check-in"].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3.5 font-bold first:pl-5">
                    {h}
                  </th>
                ))}
                <th scope="col" className="px-4">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((a) => (
                <tr key={a.code} className="border-b border-line last:border-b-0">
                  <td className="py-4 pl-5 pr-4">
                    <p className="font-bold text-text">{a.name}</p>
                    <p className="mt-0.5 text-[11px] text-dim">{a.email || a.via}</p>
                  </td>
                  <td className="px-4 py-4 text-muted">{a.ticket}</td>
                  <td className="px-4 py-4 font-mono text-[11px] text-muted">{a.code}</td>
                  <td className="px-4 py-4 text-muted">{a.booking}</td>
                  <td className="px-4 py-4">
                    <CheckInBadge state={a.state} />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <RowAction a={a} onCheckIn={() => checkIn(a.code)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-line md:hidden">
          {visible.map((a) => (
            <li key={a.code} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-text">{a.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-dim">{a.email || a.via}</p>
                </div>
                <CheckInBadge state={a.state} />
              </div>
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <span>{a.ticket}</span>
                <span className="font-mono text-[11px]">{a.code}</span>
                <span>{a.booking}</span>
              </p>
              <div className="mt-3">
                <RowAction a={a} onCheckIn={() => checkIn(a.code)} />
              </div>
            </li>
          ))}
        </ul>

        {visible.length === 0 && (
          <p className="p-8 text-center text-sm text-muted">
            {!event.id ? "Create an event to see its ticket holders." : !data ? (error ?? "Loading ticket holders…") : rows.length ? "No attendees match your filters." : "No tickets booked yet."}
          </p>
        )}
      </Panel>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-dim">
          Showing {visible.length} of {filtered.length === rows.length ? attendeeStats.ticketsListed : filtered.length} tickets
        </p>
        <nav aria-label="Pagination" className="flex items-center gap-2">
          <PagerButton label="Previous page" disabled={current === 1} onClick={() => setPage(current - 1)}>
            <ChevronLeft size={14} />
          </PagerButton>
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <PagerButton key={n} label={`Page ${n}`} active={n === current} onClick={() => setPage(n)}>
              {n}
            </PagerButton>
          ))}
          <PagerButton label="Next page" disabled={current === pages} onClick={() => setPage(current + 1)}>
            <ChevronRight size={14} />
          </PagerButton>
        </nav>
      </div>
    </>
  );
}

function CheckInBadge({ state }: { state: Attendee["state"] }) {
  if (state === "checked_in") return <Badge tone="success" dot>Checked in</Badge>;
  if (state === "cancelled") return <Badge tone="danger">Cancelled</Badge>;
  return <Badge>Not yet</Badge>;
}

function RowAction({ a, onCheckIn }: { a: Attendee; onCheckIn: () => void }) {
  if (a.state === "cancelled") return <span className="text-xs text-dim">{a.note}</span>;
  if (a.state === "checked_in") return <span className="text-xs text-dim">Entered</span>;
  if (a.code === "—") return <span className="text-xs text-dim">{a.note ?? "Not paid yet"}</span>;
  return (
    <Button variant="outline" size="sm" className="border-line text-text hover:bg-surface-2" onClick={onCheckIn}>
      Check in
    </Button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="relative block sm:w-48">
      <span className="sr-only">{label}</span>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-xl border border-line bg-surface px-4 text-[13px] text-text focus:border-gold focus:outline-none"
      >
        {children}
      </Select>
    </label>
  );
}

function PagerButton({
  children,
  label,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-8 items-center justify-center rounded-full border text-xs font-bold focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "border-transparent bg-gradient-to-b from-gold to-amber text-ink" : "border-line text-text hover:border-gold/50"
      }`}
    >
      {children}
    </button>
  );
}
