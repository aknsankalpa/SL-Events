"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Seat ids taken right now at an event, as the server counts them (never who holds them). Asked when a chart appears,
 * every 30 seconds while it is on screen, when the window regains focus, and after a booking attempt. The server
 * checks the seats again when the booking is placed, so a seat taken in between is still caught.
 */
const NONE: ReadonlySet<string> = new Set();
const taken = new Map<string, ReadonlySet<string>>();
const listeners = new Map<string, Set<() => void>>();
const inFlight = new Map<string, Promise<void>>();

export function refreshTakenSeats(slug: string): Promise<void> {
  const running = inFlight.get(slug);
  if (running) return running;
  const promise = fetch(`/api/events/${encodeURIComponent(slug)}/seats`, { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) return;
      const data = (await res.json()) as { taken?: string[] };
      taken.set(slug, new Set(data.taken ?? []));
      listeners.get(slug)?.forEach((l) => l());
    })
    .catch(() => undefined)
    .finally(() => inFlight.delete(slug));
  inFlight.set(slug, promise);
  return promise;
}

export function useTakenSeats(eventSlug: string): ReadonlySet<string> {
  const value = useSyncExternalStore(
    (listener) => {
      const set = listeners.get(eventSlug) ?? new Set();
      listeners.set(eventSlug, set);
      set.add(listener);
      return () => set.delete(listener);
    },
    () => taken.get(eventSlug) ?? NONE,
    () => NONE,
  );

  useEffect(() => {
    void refreshTakenSeats(eventSlug);
    const id = setInterval(() => void refreshTakenSeats(eventSlug), 30_000);
    const onFocus = () => document.visibilityState === "visible" && void refreshTakenSeats(eventSlug);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [eventSlug]);

  return value;
}
