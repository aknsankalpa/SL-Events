"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useSession } from "@/components/auth/useSession";
import { effectiveStatus, type Booking } from "@/lib/bookings";
import { bookingStore } from "@/lib/bookingStore";

/** The current time, refreshed every 30 seconds. It is 0 on the server and before the first tick, so nothing expires early. */
const clock = { now: 0 };
const clockSubscribe = (listener: () => void) => {
  clock.now = Date.now();
  const id = setInterval(() => {
    clock.now = Date.now();
    listener();
  }, 30_000);
  return () => clearInterval(id);
};
export const useNow = () =>
  useSyncExternalStore(
    clockSubscribe,
    () => clock.now,
    () => 0,
  );

/**
 * The signed-in customer's own bookings, with expiry applied. A customer never sees anyone else's booking:
 * the list is filtered to their email here and again when a single booking is opened.
 */
export function useBookings() {
  const all = useSyncExternalStore(bookingStore.subscribe, bookingStore.getSnapshot, bookingStore.getServerSnapshot);
  const { user, ready } = useSession();
  const now = useNow();

  const bookings = useMemo<Booking[]>(
    () => (user ? all.filter((b) => b.ownerEmail === user.email).map((b) => ({ ...b, status: effectiveStatus(b, now) })) : []),
    [all, user, now],
  );
  return { bookings, ready, user };
}

/** One of the customer's bookings by id, or undefined when it doesn't exist or isn't theirs. */
export function useBooking(id: string) {
  const { bookings, ready, user } = useBookings();
  return { booking: bookings.find((b) => b.id === id), ready, user };
}
