"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Download, Hourglass, ScanLine, Search, Star, TriangleAlert, UserCheck, Users } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/StatusBadge";
import { attendees as seed, attendeeStats, type Attendee } from "@/lib/organizer";
import { useOrganizer } from "./OrganizerContext";
import { downloadCsv, EventPicker, OrgPageHeader, Panel, StatCard } from "./ui";

const PAGE_SIZE = 7;

export function AttendeesPage() {
  const { event } = useOrganizer();
  const [rows, setRows] = useState<Attendee[]>(seed);
  const [query, setQuery] = useState("");
  const [ticket, setTicket] = useState("all");
  const [state, setState] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (a) =>
        (!q || `${a.name} ${a.email} ${a.code}`.toLowerCase().includes(q)) &&
        (ticket === "all" || a.ticket === ticket) &&
        (state === "all" || a.state === state),
    );
  }, [rows, query, ticket, state]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const checkedIn = rows.filter((a) => a.state === "checked_in").length;

  const checkIn = (code: string) =>
    // TODO: record the check-in server-side; this must be atomic so a ticket cannot be used twice.
    setRows((prev) => prev.map((a) => (a.code === code && a.state === "not_yet" ? { ...a, state: "checked_in" } : a)));

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Attendees" value={attendeeStats.total} Icon={Users} sub={`From ${attendeeStats.paidBookings} paid bookings`} />
        <StatCard
          label="Checked in"
          value={`${checkedIn} / ${attendeeStats.total}`}
          Icon={UserCheck}
          sub="Doors open 5:30 PM, 14 Nov"
        />
        <StatCard label="VIP guests" value={attendeeStats.vip} Icon={Star} sub="Meet-and-greet list ready" />
        <StatCard
          label="Not yet paid"
          value={`${attendeeStats.unpaidTickets} tickets`}
          Icon={Hourglass}
          subTone="warn"
          sub={
            <>
              <TriangleAlert size={12} aria-hidden /> Not on this list until approved
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
          {["General", "VIP", "Student"].map((t) => (
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

        {visible.length === 0 && <p className="p-8 text-center text-sm text-muted">No attendees match your filters.</p>}
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
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-line bg-surface px-4 pr-10 text-[13px] text-text focus:border-gold focus:outline-none"
      >
        {children}
      </select>
      <ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-4 top-4 text-muted" />
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
