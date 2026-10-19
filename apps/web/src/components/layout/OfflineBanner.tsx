"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

/** Whether the browser has a connection. Assumed true on the server and before the first check. */
export function useOnline() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

/** A banner across the top of the site when the connection drops, so a failed page or upload isn't a mystery. */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="alert" className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber px-4 py-2 text-center text-xs font-bold text-ink">
      <WifiOff size={14} aria-hidden /> You&apos;re offline. Pages you already opened still work, but booking and uploads need a connection.
    </div>
  );
}
