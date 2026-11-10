"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { EventItem } from "@/lib/data";

/**
 * The events customers can browse, loaded from the database by the site layout (server side, cached) and handed to
 * the client components that list them: home page, event browser, "events near you". Seat charts are not included;
 * an event's own page loads its chart.
 */
const Catalog = createContext<EventItem[] | null>(null);

export function EventsCatalogProvider({ events, children }: { events: EventItem[]; children: ReactNode }) {
  return <Catalog.Provider value={events}>{children}</Catalog.Provider>;
}

export function useEvents(): EventItem[] {
  const events = useContext(Catalog);
  if (!events) throw new Error("useEvents must be used inside <EventsCatalogProvider> (the (site) layout provides it)");
  return events;
}

/** The list with the figures the home page and filters show. */
export function useCatalog() {
  const events = useEvents();
  return useMemo(() => {
    const sorted = [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return {
      events,
      /** The next six events by date: the stacked cards on the home page. */
      latest: sorted.slice(0, 6),
      cities: [...new Set(events.map((e) => e.city).filter(Boolean))],
      organizers: new Set(events.map((e) => e.organizer)).size,
      total: events.length,
    };
  }, [events]);
}
