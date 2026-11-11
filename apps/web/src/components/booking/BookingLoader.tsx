"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Loader2, SearchX } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { eventForBooking, type Booking } from "@/lib/bookings";
import type { EventItem } from "@/lib/data";
import { useEvents } from "@/components/events/EventsCatalog";
import { useBooking } from "./useBookings";

/**
 * Finds one of the signed-in customer's bookings and renders `children` with it, or a loading or "not found" state.
 * A booking that belongs to someone else is reported as not found, exactly like one that doesn't exist.
 */
export function BookingLoader({ id, children }: { id: string; children: (booking: Booking, event: EventItem) => ReactNode }) {
  const { booking, ready, user } = useBooking(id);
  const events = useEvents();

  if (!ready || !user) {
    return (
      <div role="status" className="mx-auto flex max-w-site items-center justify-center gap-3 px-5 py-24 text-sm text-muted">
        <Loader2 size={16} aria-hidden className="animate-spin text-gold" /> Loading your booking…
      </div>
    );
  }
  if (!booking) {
    return (
      <div className="mx-auto max-w-site px-5 py-20 text-center">
        <SearchX size={28} aria-hidden className="mx-auto text-dim" />
        <h1 className="mt-4 text-xl font-bold text-text">We can&apos;t find that booking</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          It may belong to a different account, or the link may be wrong. Your bookings are listed under{" "}
          <Link href="/my-tickets" className="font-bold text-amber hover:text-gold">
            My tickets
          </Link>
          .
        </p>
        <LinkButton href="/my-tickets" className="mt-6">
          Go to My tickets
        </LinkButton>
      </div>
    );
  }
  // The event as it is listed now (from the database); past events that are no longer listed get a stand-in.
  const event = (booking.eventSlug && events.find((e) => e.slug === booking.eventSlug)) || eventForBooking(booking);
  return <>{children(booking, event)}</>;
}
