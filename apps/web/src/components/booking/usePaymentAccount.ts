"use client";

import { useSyncExternalStore } from "react";
import { configStore } from "@/lib/adminStore";
import { paymentAccountOf } from "@/lib/siteConfig";

/** The bank account customers pay into, as the admins set it on the server. */
export function usePaymentAccount() {
  const config = useSyncExternalStore(configStore.subscribe, configStore.getSnapshot, configStore.getServerSnapshot);
  return paymentAccountOf(config);
}
