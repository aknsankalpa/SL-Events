import { useEffect, useSyncExternalStore } from "react";
import { api } from "@/lib/api";

/**
 * Seat ids taken right now at an event, as the website counts them (never whose they are). Asked when a chart
 * appears, every 30 seconds while it is on screen, and after a booking attempt. The website checks the seats again
 * when the booking is placed, so a seat taken in between is still caught.
 */
const NONE: ReadonlySet<string> = new Set();
const taken = new Map<string, ReadonlySet<string>>();
const listeners = new Map<string, Set<() => void>>();
const inFlight = new Map<string, Promise<void>>();

export function refreshTakenSeats(slug: string): Promise<void> {
  const running = inFlight.get(slug);
  if (running) return running;
  const p = api<{ taken?: string[] }>(`/api/events/${encodeURIComponent(slug)}/seats`)
    .then(({ ok, data }) => {
      if (!ok) return;
      taken.set(slug, new Set(data.taken ?? []));
      listeners.get(slug)?.forEach((l) => l());
    })
    .finally(() => inFlight.delete(slug));
  inFlight.set(slug, p);
  return p;
}

export function useTakenSeats(eventSlug: string): ReadonlySet<string> {
  const value = useSyncExternalStore(
    (listener) => {
      const set = listeners.get(eventSlug) ?? new Set();
      listeners.set(eventSlug, set);
      set.add(listener);
      return () => {
        set.delete(listener);
      };
    },
    () => taken.get(eventSlug) ?? NONE,
    () => NONE,
  );

  useEffect(() => {
    if (!eventSlug) return;
    void refreshTakenSeats(eventSlug);
    const id = setInterval(() => void refreshTakenSeats(eventSlug), 30_000);
    return () => clearInterval(id);
  }, [eventSlug]);

  return value;
}
