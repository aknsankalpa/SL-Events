"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, Clock, Hourglass, Loader2, QrCode, Ticket, Upload } from "lucide-react";
import { useBookings, useNow } from "@/components/booking/useBookings";
import { CategoryIcon, coverGradients, coverIconClass } from "@/components/events/CategoryIcon";
import { LinkButton } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { bookingEvent, canIssueTickets, ticketSummary, ticketsFor, type Booking } from "@/lib/bookings";
import { formatPrice } from "@/lib/format";

/** Past = attended, or paid for an event whose start time has gone by. */
function isPast(b: Booking, nowMs: number) {
  if (b.status === "attended") return true;
  const e = bookingEvent(b);
  return b.status === "confirmed" && !!e?.startsAt && nowMs > 0 && new Date(e.startsAt).getTime() < nowMs;
}

const tabs = [
  {
    id: "upcoming",
    label: "Upcoming",
    empty: "No upcoming tickets yet.",
    match: (b: Booking, now: number) => ["confirmed", "under_review", "awaiting_payment", "proof_rejected"].includes(b.status) && !isPast(b, now),
  },
  { id: "past", label: "Past", empty: "Events you've been to will show up here.", match: (b: Booking, now: number) => isPast(b, now) },
  {
    id: "cancelled",
    label: "Cancelled & expired",
    empty: "Nothing cancelled or expired.",
    match: (b: Booking) => b.status === "cancelled" || b.status === "expired",
  },
] as const;

type TabId = (typeof tabs)[number]["id"];

const categoryFor = (b: Booking) => bookingEvent(b)?.category ?? "culture";
const dateLine = (b: Booking) => {
  const e = bookingEvent(b);
  return e ? `${e.badgeDate} · ${e.time}` : b.eventDate.toUpperCase();
};

export function MyTicketsList() {
  const { bookings, ready } = useBookings();
  const now = useNow();
  const [tab, setTab] = useState<TabId>("upcoming");
  const current = tabs.find((t) => t.id === tab)!;
  const list = bookings.filter((b) => current.match(b, now));

  if (!ready) {
    return (
      <div role="status" className="mx-auto flex max-w-site items-center justify-center gap-3 px-5 py-24 text-sm text-muted">
        <Loader2 size={16} aria-hidden className="animate-spin text-gold" /> Loading your tickets…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-site px-5 py-8">
      <div role="tablist" aria-label="Ticket groups" className="flex gap-7 overflow-x-auto border-b border-line">
        {tabs.map((t) => {
          const count = bookings.filter((b) => t.match(b, now)).length;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={active}
              aria-controls="ticket-panel"
              onClick={() => setTab(t.id)}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 pb-3 text-[13px] font-bold transition-colors focus-visible:focus-ring ${
                active ? "border-amber text-gold" : "border-transparent text-muted hover:text-text"
              }`}
            >
              {t.label}
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">{count}</span>
            </button>
          );
        })}
      </div>

      <ul id="ticket-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-6 space-y-4">
        {list.map((b) => (
          <li key={b.id}>
            <TicketRow booking={b} />
          </li>
        ))}
        {list.length === 0 && (
          <li className="rounded-xl border border-line bg-surface p-10 text-center">
            <Ticket size={28} aria-hidden className="mx-auto text-dim" />
            <p className="mt-3 text-sm font-bold text-text">{current.empty}</p>
            {tab === "upcoming" && (
              <>
                <p className="mx-auto mt-1 max-w-sm text-xs text-muted">Find something on and book it. Your bookings and QR tickets will be kept here.</p>
                <LinkButton href="/events" size="sm" className="mt-5">
                  Explore events
                </LinkButton>
              </>
            )}
          </li>
        )}
      </ul>
    </div>
  );
}

function TicketRow({ booking: b }: { booking: Booking }) {
  const category = categoryFor(b);
  const meta = `${b.id} · ${ticketSummary(b)} · ${formatPrice(b.total)}`;
  const e = bookingEvent(b);
  const issued = canIssueTickets(b) ? ticketsFor(b) : [];

  return (
    <article className={`flex overflow-hidden rounded-xl border bg-surface ${b.status === "proof_rejected" ? "border-danger/30" : "border-line"}`}>
      <div aria-hidden className={`hidden w-44 shrink-0 items-center justify-center bg-gradient-to-br sm:flex ${coverGradients[category]}`}>
        <CategoryIcon id={category} size={36} strokeWidth={1.75} className={coverIconClass(category)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber">{dateLine(b)}</p>
            <h2 className="mt-1.5 text-xl font-bold text-text">{b.eventTitle}</h2>
            {e && (
              <p className="mt-1 text-xs text-dim">
                {e.venue}, {e.city}
              </p>
            )}
          </div>
          <StatusBadge status={b.status} />
        </div>

        {issued.length > 0 && (
          <div className="space-y-1.5 text-xs text-muted">
            <p className="flex items-center gap-2">
              <QrCode size={14} aria-hidden className="text-gold" />
              {issued.length} QR ticket{issued.length === 1 ? "" : "s"} · {b.attendees.join(", ")}
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 pl-6 font-mono text-[11px] text-dim">
              {issued.slice(0, 3).map((t) => (
                <li key={t.code}>
                  {t.code} · {t.scanned ? "Used" : "Valid"}
                </li>
              ))}
              {issued.length > 3 && <li>+{issued.length - 3} more</li>}
            </ul>
          </div>
        )}
        {b.status === "under_review" && (
          <p className="flex items-center gap-2 text-xs text-muted">
            <Hourglass size={14} aria-hidden className="text-amber" />
            {b.statusNote ?? "We're checking your payment. This usually takes 2–6 hours."}
          </p>
        )}
        {b.status === "awaiting_payment" && (
          <p className="flex items-center gap-2 text-xs text-muted">
            <Clock size={14} aria-hidden className="text-amber" />
            Pay {formatPrice(b.total)} and upload proof by {b.payBy}
          </p>
        )}
        {b.status === "proof_rejected" && (
          <p role="alert" className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs text-danger">
            <AlertCircle size={14} aria-hidden className="mt-0.5 shrink-0" />
            {b.rejectionNote}
          </p>
        )}
        {b.status === "expired" && (
          <p className="flex items-center gap-2 text-xs text-muted">
            <AlertCircle size={14} aria-hidden className="text-dim" />
            The payment time ran out, so the tickets were released.
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-dim">{meta}</p>
          <div className="flex flex-wrap gap-2">
            {issued.length > 0 && (
              <LinkButton href={`/my-tickets/${b.id}`} size="sm">
                <QrCode size={14} aria-hidden /> {b.status === "attended" ? "View tickets" : "View QR tickets"}
              </LinkButton>
            )}
            {b.status === "awaiting_payment" && (
              <>
                <LinkButton href={`/bookings/${b.id}/payment`} variant="outline" size="sm" className="border-line text-text hover:bg-surface-2">
                  Payment details
                </LinkButton>
                <LinkButton href={`/bookings/${b.id}/proof`} size="sm">
                  <Upload size={14} aria-hidden /> Upload proof
                </LinkButton>
              </>
            )}
            {b.status === "proof_rejected" && (
              <LinkButton href={`/bookings/${b.id}/proof`} size="sm" variant="danger">
                <Upload size={14} aria-hidden /> Upload new proof
              </LinkButton>
            )}
            <Link
              href={`/bookings/${b.id}`}
              className="inline-flex h-9 items-center rounded-lg px-3 text-[13px] font-bold text-muted transition-colors hover:text-gold"
            >
              {b.status === "confirmed" || b.status === "attended" || b.status === "cancelled" ? "Details" : "Payment status"}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
