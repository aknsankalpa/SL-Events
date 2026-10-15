"use client";

import { useState } from "react";
import { AlertCircle, Clock, Hourglass, QrCode, Upload } from "lucide-react";
import { CategoryIcon, coverGradients, coverIconClass } from "@/components/events/CategoryIcon";
import { LinkButton } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { bookingEvent, bookings, ticketSummary, type Booking } from "@/lib/bookings";
import { formatPrice } from "@/lib/format";

const tabs = [
  { id: "upcoming", label: "Upcoming", match: (b: Booking) => ["confirmed", "under_review", "awaiting_payment", "proof_rejected"].includes(b.status) },
  { id: "past", label: "Past", match: (b: Booking) => b.status === "attended" },
  { id: "cancelled", label: "Cancelled", match: (b: Booking) => b.status === "cancelled" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const categoryFor = (b: Booking) => bookingEvent(b)?.category ?? "culture";
const dateLine = (b: Booking) => {
  const e = bookingEvent(b);
  return e ? `${e.badgeDate} · ${e.time}` : b.eventDate.toUpperCase();
};

export function MyTicketsList() {
  const [tab, setTab] = useState<TabId>("upcoming");
  const list = bookings.filter(tabs.find((t) => t.id === tab)!.match);

  return (
    <div className="mx-auto max-w-site px-5 py-8">
      <div role="tablist" aria-label="Ticket groups" className="flex gap-7 border-b border-line">
        {tabs.map((t) => {
          const count = bookings.filter(t.match).length;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={active}
              aria-controls="ticket-panel"
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-2 border-b-2 pb-3 text-[13px] font-bold transition-colors focus-visible:focus-ring ${
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
          <li className="rounded-xl border border-line bg-surface p-10 text-center text-sm text-muted">Nothing here yet.</li>
        )}
      </ul>
    </div>
  );
}

function TicketRow({ booking: b }: { booking: Booking }) {
  const category = categoryFor(b);
  const meta = `${b.id} · ${ticketSummary(b)} · ${formatPrice(b.total)}`;
  const e = bookingEvent(b);

  return (
    <article
      className={`flex overflow-hidden rounded-xl border bg-surface ${b.status === "proof_rejected" ? "border-danger/30" : "border-line"}`}
    >
      <div
        aria-hidden
        className={`hidden w-44 shrink-0 items-center justify-center bg-gradient-to-br sm:flex ${coverGradients[category]}`}
      >
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

        {b.status === "confirmed" && (
          <p className="flex items-center gap-2 text-xs text-muted">
            <QrCode size={14} aria-hidden className="text-gold" />
            {b.attendees.length} QR tickets ready · {b.attendees.join(", ")}
          </p>
        )}
        {b.status === "under_review" && (
          <p className="flex items-center gap-2 text-xs text-muted">
            <Hourglass size={14} aria-hidden className="text-amber" />
            {b.statusNote}
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

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-dim">{meta}</p>
          <div className="flex gap-2">
            {b.status === "confirmed" && (
              <LinkButton href={`/my-tickets/${b.id}`} size="sm">
                <QrCode size={14} aria-hidden /> View QR tickets
              </LinkButton>
            )}
            {b.status === "under_review" && (
              <LinkButton href={`/my-tickets/${b.id}/status`} variant="outline" size="sm" className="border-line text-text hover:bg-surface-2">
                View status
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
              <>
                <LinkButton href="/help" variant="outline" size="sm" className="border-line text-text hover:bg-surface-2">
                  Contact us
                </LinkButton>
                <LinkButton href={`/bookings/${b.id}/proof`} size="sm" variant="danger">
                  <Upload size={14} aria-hidden /> Upload new proof
                </LinkButton>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
