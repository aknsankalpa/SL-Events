"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Ticket } from "lucide-react";
import { useCustomerSettings } from "@/components/account/useCustomerSettings";
import { useBookings, useNow } from "@/components/booking/useBookings";
import { EventCard } from "@/components/events/EventCard";
import { LinkButton } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { bookingEvent, ticketSummary } from "@/lib/bookings";
import { recommend } from "@/lib/recommendations";

/** Only for signed-in customers: their next events and recommendations. Visitors see nothing from this. */
export function CustomerHome() {
  const { bookings, ready, user } = useBookings();
  const { settings } = useCustomerSettings();
  const now = useNow();
  if (!ready || !user) return null;

  const upcoming = bookings
    .filter((b) => ["confirmed", "under_review", "awaiting_payment", "proof_rejected"].includes(b.status))
    .filter((b) => {
      const start = bookingEvent(b)?.startsAt;
      return !start || now === 0 || new Date(start).getTime() >= now;
    })
    .sort((a, b) => (bookingEvent(a)?.startsAt ?? "").localeCompare(bookingEvent(b)?.startsAt ?? ""))
    .slice(0, 3);
  const picks = recommend(bookings, settings.city, 3);

  return (
    <>
      <section aria-label="Your upcoming tickets" className="mx-auto max-w-site px-5 pt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber">
              <Ticket size={13} aria-hidden /> For you
            </p>
            <h2 className="font-display text-[30px] font-bold leading-tight text-text">Your upcoming tickets</h2>
          </div>
          <Link href="/my-tickets" className="flex items-center gap-1.5 text-xs font-bold text-amber hover:text-gold">
            All my tickets <ArrowRight size={12} aria-hidden />
          </Link>
        </div>

        {upcoming.length > 0 ? (
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {upcoming.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/bookings/${b.id}`}
                  className="flex h-full flex-col rounded-xl border border-line bg-surface p-5 transition-colors hover:border-gold/50 focus-visible:focus-ring"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber">{bookingEvent(b)?.badgeDate ?? b.eventDate}</p>
                    <StatusBadge status={b.status} />
                  </div>
                  <h3 className="mt-3 text-lg font-bold leading-snug text-text">{b.eventTitle}</h3>
                  <p className="mt-1 text-xs text-dim">{ticketSummary(b)}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-dashed border-line p-6">
            <p className="text-sm text-muted">You don&apos;t have any upcoming tickets yet. Find something to go to.</p>
            <LinkButton href="/events" size="sm">
              Explore events
            </LinkButton>
          </div>
        )}
      </section>

      <section aria-label="Recommended events" className="mx-auto max-w-site px-5 pt-14">
        <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber">
          <Sparkles size={13} aria-hidden /> Recommended
        </p>
        <h2 className="font-display text-[30px] font-bold leading-tight text-text">Recommended for you</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {picks.map(({ event, reason }) => (
            <div key={event.slug} className="flex flex-col gap-2">
              <p className="text-xs font-bold text-muted">{reason}</p>
              <div className="flex-1 [&>a]:h-full">
                <EventCard event={event} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
