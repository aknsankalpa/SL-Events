import { useMemo, useSyncExternalStore } from "react";
import { effectiveStatus } from "@core/bookings";
import { bookingStore } from "@core/bookingStore";
import { takenSeatIds } from "@core/seating";
import { useNow } from "@/lib/hooks";

/**
 * Seat ids that anyone's booking holds for an event. Only ids are kept, never whose booking they are. An unpaid
 * booking past its deadline or a cancelled one no longer counts, so those seats come back on their own.
 */
export function useTakenSeats(eventSlug: string): ReadonlySet<string> {
  const all = useSyncExternalStore(bookingStore.subscribe, bookingStore.getSnapshot, bookingStore.getServerSnapshot);
  const now = useNow();
  return useMemo(() => takenSeatIds(all, eventSlug, (b) => effectiveStatus(b, now)), [all, eventSlug, now]);
}
