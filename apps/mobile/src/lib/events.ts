import { useEffect, useSyncExternalStore } from "react";
import { eventForBooking, type Booking } from "@core/bookings";
import type { EventItem } from "@core/data";
import { api } from "./api";

/**
 * Events as the website lists them (only published ones). The list loads when a screen first needs it and again
 * every few minutes; an event's own page loads its full details, seat chart included.
 */
type State = { list: EventItem[]; loaded: boolean; error?: string; details: Record<string, EventItem | null> };
let state: State = { list: [], loaded: false, details: {} };
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const snapshot = () => state;

let listLoading: Promise<void> | null = null;
let loadedAt = 0;

/** Loads the event list (again). */
export function loadEvents(force = false): Promise<void> {
  if (!force && state.loaded && Date.now() - loadedAt < 3 * 60_000) return Promise.resolve();
  listLoading ??= api<{ events: EventItem[] }>("/api/events")
    .then(({ ok, data }) => {
      if (ok) {
        loadedAt = Date.now();
        set({ list: data.events ?? [], loaded: true, error: undefined });
      } else set({ loaded: true, error: data.error ?? "Couldn't load events." });
    })
    .finally(() => {
      listLoading = null;
    });
  return listLoading;
}

const detailLoading = new Map<string, Promise<void>>();

/** Loads one event with its seat chart. A missing or unpublished event becomes null. */
export function loadEvent(slug: string): Promise<void> {
  const running = detailLoading.get(slug);
  if (running) return running;
  const p = api<{ event: EventItem }>(`/api/events/${encodeURIComponent(slug)}`)
    .then(({ ok, status, data }) => {
      if (ok && data.event) set({ details: { ...state.details, [slug]: data.event } });
      else if (status === 404) set({ details: { ...state.details, [slug]: null } });
    })
    .finally(() => detailLoading.delete(slug));
  detailLoading.set(slug, p);
  return p;
}

/** The published events, soonest first, with `loaded` false until the website has answered. */
export function useEvents() {
  const s = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => {
    void loadEvents();
  }, []);
  return { events: s.list, loaded: s.loaded, error: s.error };
}

/**
 * One event. While its full details load, the list's copy (without the seat chart) is shown, so the page appears at
 * once. `missing` is true when the website says there is no such published event.
 */
export function useEvent(slug: string | undefined) {
  const s = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => {
    if (slug) void loadEvent(slug);
  }, [slug]);
  const detail = slug ? s.details[slug] : undefined;
  return { event: detail ?? s.list.find((e) => e.slug === slug), missing: detail === null, loading: detail === undefined };
}

/** An event already loaded (for screens that show a booking's event), without asking the website. */
export const knownEvent = (slug: string): EventItem | undefined => state.details[slug] ?? state.list.find((e) => e.slug === slug);

/** The next six events by date: the stacked cards on the home screen. */
export const latestOf = (events: EventItem[]) => [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 6);

/** The event a booking is for: the live one when it is loaded, otherwise a stand-in built from the booking. */
export function eventOf(b: Booking): EventItem {
  return (b.eventSlug && knownEvent(b.eventSlug)) || eventForBooking(b);
}
