"use client";

import { useSyncExternalStore } from "react";
import { sessionServerSnapshot, sessionSnapshot, sessionSubscribe, type SessionUser } from "@/lib/session";

const noopSubscribe = () => () => undefined;

/**
 * The signed-in customer, or null for a visitor. `ready` turns true once the browser's saved session has been read,
 * so a page can wait before deciding between the public and customer views instead of flashing the wrong one.
 */
export function useSession(): { user: SessionUser | null; ready: boolean } {
  const user = useSyncExternalStore(sessionSubscribe, sessionSnapshot, sessionServerSnapshot);
  const ready = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  return { user, ready };
}
