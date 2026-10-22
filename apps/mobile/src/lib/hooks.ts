import { useMemo, useSyncExternalStore } from "react";
import { effectiveStatus, type Booking } from "@core/bookings";
import { bookingStore } from "@core/bookingStore";
import { readStore } from "@core/notifications";
import { sessionServerSnapshot, sessionSnapshot, sessionSubscribe, type SessionUser } from "@core/session";
import { settingsFor, settingsStore } from "@core/customerSettings";

/** The signed-in customer, or null for a visitor. */
export function useSession(): SessionUser | null {
  return useSyncExternalStore(sessionSubscribe, sessionSnapshot, sessionServerSnapshot);
}

/** The current time, refreshed every 30 seconds, so unpaid bookings expire on screen without a reload. */
const clock = { now: Date.now() };
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
    () => clock.now,
  );

/** The signed-in customer's own bookings, with expiry applied. Never anyone else's. */
export function useBookings(): Booking[] {
  const all = useSyncExternalStore(bookingStore.subscribe, bookingStore.getSnapshot, bookingStore.getServerSnapshot);
  const user = useSession();
  const now = useNow();
  return useMemo(
    () => (user ? all.filter((b) => b.ownerEmail === user.email).map((b) => ({ ...b, status: effectiveStatus(b, now) })) : []),
    [all, user, now],
  );
}

export function useBooking(id: string): Booking | undefined {
  return useBookings().find((b) => b.id === id);
}

export function useReadNotifications(): string[] {
  return useSyncExternalStore(readStore.subscribe, readStore.getSnapshot, readStore.getServerSnapshot);
}

export function useCustomerSettings(email: string) {
  const all = useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot, settingsStore.getServerSnapshot);
  return settingsFor(all, email);
}
