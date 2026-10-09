"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileText, Search, Ticket, UserCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { bookingHref, bookings, historyStats, ticketCount, type Booking } from "@/lib/bookings";
import { formatKrw, formatPrice } from "@/lib/format";

const filters = [
  { id: "all", label: "All", match: () => true },
  { id: "confirmed", label: "Confirmed", match: (b: Booking) => b.status === "confirmed" },
  { id: "progress", label: "In progress", match: (b: Booking) => ["under_review", "awaiting_payment", "proof_rejected"].includes(b.status) },
  { id: "past", label: "Past", match: (b: Booking) => b.status === "attended" },
  { id: "cancelled", label: "Cancelled & refunded", match: (b: Booking) => b.status === "refunded" },
] as const;

type FilterId = (typeof filters)[number]["id"];

const PAGE_SIZE = 10;

function downloadCsv() {
  const rows = [
    ["Booking", "Event", "Event date", "Tickets", "Amount (KRW)", "Payment", "Status"],
    ...bookings.map((b) => [b.id, b.eventTitle, b.eventDate, String(ticketCount(b)), String(b.total), b.paymentMethod, b.status]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "sl-events-bookings.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function BookingHistoryTable() {
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const f = filters.find((x) => x.id === filter)!;
    const q = query.trim().toLowerCase();
    return bookings.filter((b) => f.match(b) && (!q || `${b.id} ${b.eventTitle}`.toLowerCase().includes(q)));
  }, [filter, query]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[34px] font-bold leading-tight text-text">Booking history</h1>
          <p className="mt-2 text-sm text-muted">Every booking you&apos;ve made, including cancelled and refunded ones.</p>
        </div>
        <Button variant="outline" className="border-line text-text hover:bg-surface-2" onClick={downloadCsv}>
          <Download size={16} aria-hidden /> Download receipts
        </Button>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Bookings" value={String(historyStats.bookings)} sub={`Since ${historyStats.since}`} Icon={FileText} />
        <Stat label="Events attended" value={String(historyStats.eventsAttended)} sub={historyStats.attendedNames} Icon={UserCheck} />
        <Stat label="Total paid" value={formatKrw(historyStats.totalPaid)} sub="Refunds not included" Icon={Wallet} />
      </dl>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filter bookings" className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => {
                setFilter(f.id);
                setPage(1);
              }}
              className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors focus-visible:focus-ring ${
                filter === f.id ? "border-transparent bg-gradient-to-b from-gold to-amber text-ink" : "border-line text-text hover:border-gold/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="flex w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 focus-within:border-gold sm:w-56">
          <Search size={14} className="text-muted" aria-hidden />
          <span className="sr-only">Search bookings</span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search bookings"
            className="h-10 w-full bg-transparent text-xs text-text placeholder:text-dim focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[46rem] text-left text-[13px]">
          <thead className="border-b border-line text-[10px] uppercase tracking-wider text-dim">
            <tr>
              {["Booking", "Event", "Event date", "Tickets", "Amount", "Payment", "Status"].map((h) => (
                <th key={h} scope="col" className="px-4 py-3.5 font-bold first:pl-5">
                  {h}
                </th>
              ))}
              <th scope="col" className="w-10">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((b) => {
              const href = bookingHref(b);
              return (
                <tr key={b.id} className="border-b border-line last:border-b-0 hover:bg-surface-2/50">
                  <td className="py-4 pl-5 pr-4 font-mono text-[11px] text-muted">{b.id}</td>
                  <td className="px-4 py-4 font-bold text-text">{b.eventTitle}</td>
                  <td className="px-4 py-4 text-muted">{b.eventDate}</td>
                  <td className="px-4 py-4 text-muted">{ticketCount(b)}</td>
                  <td className="px-4 py-4 font-bold text-text">{formatPrice(b.total)}</td>
                  <td className="px-4 py-4 text-muted">{b.paymentMethod}</td>
                  <td className="px-4 py-4">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="pr-4 text-right">
                    {href && (
                      <Link href={href} aria-label={`Open booking ${b.id}`} className="inline-flex text-muted hover:text-gold">
                        <ChevronRight size={16} />
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted">
                  No bookings match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-dim">
          Showing {visible.length} of {rows.length} booking{rows.length === 1 ? "" : "s"}
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

function Stat({ label, value, sub, Icon }: { label: string; value: string; sub: string; Icon: typeof Ticket }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <dt className="text-xs font-bold text-muted">{label}</dt>
        <Icon size={14} aria-hidden className="text-dim" />
      </div>
      <dd className="mt-2 text-[28px] font-bold leading-none text-text">{value}</dd>
      <p className="mt-2 text-[11px] text-dim">{sub}</p>
    </div>
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
