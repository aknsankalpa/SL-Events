import { useSyncExternalStore } from "react";
import type { Booking } from "@core/bookings";
import { readStore } from "@core/notifications";
import { settingsFor, settingsStore } from "@core/customerSettings";
import { useAccount, type Account } from "./account";
import { useBookingList } from "./bookings";

export { useNow } from "./bookings";

/** The signed-in account (with its roles, from the website), or null for a visitor. */
export function useSession(): Account | null {
  return useAccount().user;
}

/** The signed-in customer's own bookings from the website, with expiry applied. Never anyone else's. */
export function useBookings(): Booking[] {
  return useBookingList().bookings;
}

export function useBooking(id: string): Booking | undefined {
  return useBookings().find((b) => b.id === id);
}

export function useReadNotifications(): string[] {
  return useSyncExternalStore(readStore.subscribe, readStore.getSnapshot, readStore.getServerSnapshot);
}

/** Per-phone display preferences (city, notifications). */
export function useCustomerSettings(email: string) {
  const all = useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot, settingsStore.getServerSnapshot);
  return settingsFor(all, email);
}
