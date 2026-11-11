"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Loads one event's data from the server (its bookings, its ticket holders) and loads it again when the event changes
 * or `reload` is called. `data` is null while loading; `error` says why it couldn't load.
 */
export function useEventData<T>(url: string | null) {
  const [state, setState] = useState<{ url: string | null; data: T | null; error?: string }>({ url: null, data: null });

  const reload = useCallback(async () => {
    if (!url) return;
    try {
      const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as T & { error?: string };
      setState(res.ok ? { url, data: body } : { url, data: null, error: body.error ?? "Couldn't load this." });
    } catch {
      setState({ url, data: null, error: "We couldn't reach SL Events." });
    }
  }, [url]);

  useEffect(() => {
    // Fetching is the effect's whole job; its state arrives asynchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  // Data from a previous event is never shown for the new one.
  const current = state.url === url;
  return { data: current ? state.data : null, error: current ? state.error : undefined, reload };
}
