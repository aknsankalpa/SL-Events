"use client";

import { useSyncExternalStore } from "react";
import { useSession } from "@/components/auth/useSession";
import { settingsFor, settingsStore, updateSettings, type CustomerSettings } from "@/lib/customerSettings";

/** The signed-in customer's settings, plus a function to change them. */
export function useCustomerSettings() {
  const all = useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot, settingsStore.getServerSnapshot);
  const { user } = useSession();
  const settings = settingsFor(all, user?.email ?? "");
  const update = (change: (s: CustomerSettings) => CustomerSettings) => {
    if (user) updateSettings(user.email, change);
  };
  return { settings, update, user };
}
