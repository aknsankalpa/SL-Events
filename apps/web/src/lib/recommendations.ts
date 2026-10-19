import { categories, events, type EventItem } from "./data";
import type { Booking } from "./bookings";
import { ticketsLeftTotal } from "./organizers";

export type Recommendation = { event: EventItem; reason: string };

/**
 * Picks events a customer is likely to want: categories they've booked before count most, then their own city, then
 * how fast an event is selling. Events they already booked, and sold-out ones, are left out.
 */
export function recommend(bookings: Booking[], city: string, limit = 3): Recommendation[] {
  const booked = new Set(bookings.filter((b) => b.status !== "cancelled" && b.status !== "expired").map((b) => b.eventSlug));
  const affinity = new Map<string, number>();
  for (const b of bookings) {
    const category = events.find((e) => e.slug === b.eventSlug)?.category;
    if (category) affinity.set(category, (affinity.get(category) ?? 0) + (b.status === "attended" ? 2 : 1));
  }
  const label = (id: string) => categories.find((c) => c.id === id)?.label.toLowerCase() ?? id;

  return events
    .filter((e) => !booked.has(e.slug) && ticketsLeftTotal(e) > 0)
    .map((e) => {
      const cap = e.ticketTypes.reduce((n, t) => n + t.capacity, 0);
      const sold = e.ticketTypes.reduce((n, t) => n + t.sold, 0);
      const liked = affinity.get(e.category) ?? 0;
      const near = !!city && e.city === city;
      const reason = liked > 0 ? `Because you like ${label(e.category)}` : near ? `Popular in ${city}` : "Selling fast";
      return { event: e, reason, score: liked * 3 + (near ? 2 : 0) + (cap ? sold / cap : 0) };
    })
    .sort((a, b) => b.score - a.score || a.event.startsAt.localeCompare(b.event.startsAt))
    .slice(0, limit)
    .map(({ event, reason }) => ({ event, reason }));
}
