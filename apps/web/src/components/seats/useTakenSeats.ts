"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useNow } from "@/components/booking/useBookings";
import { effectiveStatus } from "@/lib/bookings";
import { bookingStore } from "@/lib/bookingStore";
import { takenSeatIds } from "@/lib/seating";

/**
 * Seat ids that anyone's booking currently holds for an event. It reads every booking in the store but only keeps seat
 * ids, never who they belong to. An unpaid booking past its deadline, or a cancelled one, no longer counts, so those
 * seats come back on their own.
 */
export function useTakenSeats(eventSlug: string): ReadonlySet<string> {
  const all = useSyncExternalStore(bookingStore.subscribe, bookingStore.getSnapshot, bookingStore.getServerSnapshot);
  const now = useNow();
  return useMemo(() => takenSeatIds(all, eventSlug, (b) => effectiveStatus(b, now)), [all, eventSlug, now]);
}
