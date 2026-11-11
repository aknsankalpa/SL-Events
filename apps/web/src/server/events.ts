// Events as customers see them, read from the database. Server code only: pages, layouts and route handlers.
//
// Results are cached for a few minutes ("use cache") and tagged "events", so pages stay fast; anything that changes
// events or sales (publishing, editing, a booking) calls revalidateTag("events") to refresh them straight away.

import { and, asc, eq, getTableColumns, inArray, sql, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db, schema as s, type Executor } from "@/db";
import type { CategoryId, EventItem, TicketType } from "@/lib/data";
import type { ChartSeat, ChartSection, SeatChart } from "@/lib/seating";

/** Statuses customers can see. Drafts, events in review and unpublished events are hidden. */
const VISIBLE = ["on_sale", "paused", "cancelled", "ended"] as const;
/** Statuses that appear in lists and on the home page. */
const LISTED = ["on_sale", "paused"] as const;

/**
 * A booking still counts towards sales and seats unless it was cancelled, or it was never paid and its payment window
 * has closed. The same rule as `effectiveStatus` in lib/bookings.ts.
 */
export const activeBooking = sql`(${s.bookings.status} IN ('confirmed','under_review','attended')
  OR (${s.bookings.status} IN ('awaiting_payment','proof_rejected') AND (${s.bookings.payBy} IS NULL OR ${s.bookings.payBy} > UTC_TIMESTAMP())))`;

/* ---------- formatting, in Korea time ---------- */

const KST = "Asia/Seoul";
function partsOf(d: Date) {
  const get = (opts: Intl.DateTimeFormatOptions) =>
    Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: KST, ...opts }).formatToParts(d).map((p) => [p.type, p.value]));
  const a = get({ weekday: "short", year: "numeric", month: "short", day: "numeric" });
  const n = get({ year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const time = new Intl.DateTimeFormat("en-US", { timeZone: KST, hour: "numeric", minute: "2-digit" }).format(d);
  return { weekday: a.weekday!, month: a.month!, day: a.day!, year: a.year!, iso: `${n.year}-${n.month}-${n.day}T${n.hour}:${n.minute}:00+09:00`, time };
}

/** "<p>One</p><p>Two</p>" → ["One", "Two"]: the plain paragraphs shown where rich text isn't used. */
function paragraphsOf(html: string): string[] {
  return html
    .split(/<\/p>|<br\s*\/?>/i)
    .map((p) =>
      p
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim(),
    )
    .filter(Boolean);
}

/* ---------- seat charts ---------- */

type SectionRow = typeof s.seatSections.$inferSelect;
type SeatRow = typeof s.seats.$inferSelect;

/** The chart customers see, from its rows. Seats outside any section are left out unless they are blocked. */
function chartFrom(c: typeof s.seatCharts.$inferSelect, sections: SectionRow[], seatRows: SeatRow[]): SeatChart {
  const own = sections.filter((sec) => sec.eventId === c.eventId);
  const sectionKey = new Map(own.map((sec) => [sec.id, sec.key] as const));
  const chartSections: ChartSection[] = own.map((sec) => ({ id: sec.key, name: sec.name, color: sec.color, price: sec.price }));
  const chartSeats: ChartSeat[] = seatRows
    .filter((seat) => seat.eventId === c.eventId && (seat.sectionId || seat.blocked))
    .map((seat) => ({
      id: seat.key,
      row: seat.row,
      num: seat.num,
      label: seat.label,
      x: seat.x,
      y: seat.y,
      r: seat.r,
      sectionId: seat.sectionId ? sectionKey.get(seat.sectionId) ?? "" : "",
      accessible: seat.accessible || undefined,
      blocked: seat.blocked || undefined,
    }));
  return { width: c.width, height: c.height, imageUrl: c.imageUrl ?? undefined, stage: c.stage ?? undefined, sections: chartSections, seats: chartSeats };
}

/** An event's seat chart straight from the database (not cached): what a booking is checked against. */
export async function seatChartFor(eventId: number, exec: Executor = db): Promise<SeatChart | undefined> {
  const [c] = await exec.select().from(s.seatCharts).where(eq(s.seatCharts.eventId, eventId));
  if (!c) return undefined;
  const sections = await exec.select().from(s.seatSections).where(eq(s.seatSections.eventId, eventId)).orderBy(asc(s.seatSections.sort));
  const seatRows = await exec.select().from(s.seats).where(eq(s.seats.eventId, eventId));
  return chartFrom(c, sections, seatRows);
}

/** Seat ids (the chart's keys) held right now by bookings that still count. Never cached: seat pickers poll it. */
export async function takenSeatKeys(eventId: number, exec: Executor = db): Promise<string[]> {
  const rows = await exec
    .select({ key: s.seats.key })
    .from(s.seatHolds)
    .innerJoin(s.seats, eq(s.seats.id, s.seatHolds.seatId))
    .innerJoin(s.bookings, eq(s.bookings.id, s.seatHolds.bookingId))
    .where(and(eq(s.seatHolds.eventId, eventId), activeBooking));
  return rows.map((r) => r.key);
}

/* ---------- building EventItem from rows ---------- */

type EventRow = typeof s.events.$inferSelect & { organizerName: string; organizerAbout: string | null; organizerEmail: string | null; organizerLink: string | null };

async function loadEvents(where: SQL | undefined, withCharts: boolean): Promise<EventItem[]> {
  const rows: EventRow[] = await db
    .select({
      ...getTableColumns(s.events),
      organizerName: s.organizers.name,
      organizerAbout: s.organizers.about,
      organizerEmail: s.organizers.email,
      organizerLink: s.organizers.link,
    })
    .from(s.events)
    .innerJoin(s.organizers, eq(s.organizers.id, s.events.organizerId))
    // A suspended organizer's events are hidden from customers until an admin reinstates it.
    .where(and(where, eq(s.organizers.status, "active")))
    .orderBy(asc(s.events.startsAt));
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  // Ticket types, and how many of each are taken by bookings that still count.
  const types = await db.select().from(s.ticketTypes).where(and(inArray(s.ticketTypes.eventId, ids), eq(s.ticketTypes.visible, true))).orderBy(asc(s.ticketTypes.sort));
  const soldByType = new Map<number, number>();
  if (types.length) {
    const sold = await db
      .select({ typeId: s.bookingLines.ticketTypeId, qty: sql<string>`SUM(${s.bookingLines.qty})` })
      .from(s.bookingLines)
      .innerJoin(s.bookings, eq(s.bookings.id, s.bookingLines.bookingId))
      .where(and(inArray(s.bookingLines.ticketTypeId, types.map((t) => t.id)), activeBooking))
      .groupBy(s.bookingLines.ticketTypeId);
    for (const r of sold) if (r.typeId) soldByType.set(r.typeId, Number(r.qty));
  }

  // Numbered-seat events: sections, seats for sale and seats held.
  const seatedIds = rows.filter((r) => r.sellMode === "seats").map((r) => r.id);
  const sections = seatedIds.length ? await db.select().from(s.seatSections).where(inArray(s.seatSections.eventId, seatedIds)).orderBy(asc(s.seatSections.sort)) : [];
  const capacityBySection = new Map<number, number>();
  const heldBySection = new Map<number, number>();
  if (sections.length) {
    const cap = await db
      .select({ sectionId: s.seats.sectionId, n: sql<string>`COUNT(*)` })
      .from(s.seats)
      .where(and(inArray(s.seats.eventId, seatedIds), eq(s.seats.blocked, false)))
      .groupBy(s.seats.sectionId);
    for (const r of cap) if (r.sectionId) capacityBySection.set(r.sectionId, Number(r.n));
    const held = await db
      .select({ sectionId: s.seats.sectionId, n: sql<string>`COUNT(*)` })
      .from(s.seatHolds)
      .innerJoin(s.seats, eq(s.seats.id, s.seatHolds.seatId))
      .innerJoin(s.bookings, eq(s.bookings.id, s.seatHolds.bookingId))
      .where(and(inArray(s.seatHolds.eventId, seatedIds), activeBooking))
      .groupBy(s.seats.sectionId);
    for (const r of held) if (r.sectionId) heldBySection.set(r.sectionId, Number(r.n));
  }

  const charts = new Map<number, SeatChart>();
  if (withCharts && seatedIds.length) {
    const chartRows = await db.select().from(s.seatCharts).where(inArray(s.seatCharts.eventId, seatedIds));
    const seatRows = await db.select().from(s.seats).where(inArray(s.seats.eventId, seatedIds));
    for (const c of chartRows) charts.set(c.eventId, chartFrom(c, sections, seatRows));
  }

  return rows.map((r): EventItem => {
    const ticketTypes: TicketType[] =
      r.sellMode === "seats"
        ? sections
            .filter((sec) => sec.eventId === r.id)
            .map((sec) => ({
              id: sec.key,
              name: sec.name,
              price: sec.price,
              summary: "Numbered seats",
              perks: ["Numbered seats you choose yourself"],
              capacity: capacityBySection.get(sec.id) ?? 0,
              sold: heldBySection.get(sec.id) ?? 0,
            }))
        : types
            .filter((t) => t.eventId === r.id)
            .map((t) => ({
              id: t.key,
              name: t.name,
              price: t.price,
              summary: t.summary ?? undefined,
              perks: t.perks ?? [],
              capacity: t.capacity,
              sold: Math.min(t.capacity, t.soldElsewhere + (soldByType.get(t.id) ?? 0)),
            }));
    const capacity = ticketTypes.reduce((n, t) => n + t.capacity, 0);
    const sold = ticketTypes.reduce((n, t) => n + t.sold, 0);
    const left = capacity - sold;
    const when = r.startsAt ? partsOf(r.startsAt) : null;
    const doors = r.doorsOpenAt ? partsOf(r.doorsOpenAt).time : "";
    const html = r.descriptionHtml ?? "";
    return {
      slug: r.slug,
      title: r.title,
      category: r.category as CategoryId,
      startsAt: when?.iso ?? "",
      dateLabel: when ? `${when.weekday}, ${when.month} ${when.day} · ${when.time}` : "Date to be announced",
      longDate: when ? `${when.weekday}, ${when.day} ${when.month} ${when.year}` : "Date to be announced",
      time: when?.time ?? "Time to be announced",
      badgeDate: when ? `${when.month.toUpperCase()} ${when.day.padStart(2, "0")}, ${when.year}` : "TO BE ANNOUNCED",
      venue: r.venue ?? "Venue to be announced",
      city: r.city ?? "",
      area: r.area ?? "",
      tagline: r.tagline ?? "",
      description: paragraphsOf(html),
      descriptionHtml: html || undefined,
      organizer: r.organizerName,
      organizerAbout: r.contact?.about ?? undefined,
      organizerEmail: r.contact?.email ?? undefined,
      organizerPhone: r.contact?.phone ?? undefined,
      organizerLink: r.contact?.link ?? undefined,
      doorsOpen: doors,
      seatChart: charts.get(r.id),
      ticketTypes,
      singlePrice: new Set(ticketTypes.map((t) => t.price)).size <= 1,
      fewLeft: left > 0 && left <= 20,
      sellingFast: capacity > 0 && left > 20 && sold / capacity >= 0.6,
      featured: r.featured,
    };
  });
}

/* ---------- what pages call ---------- */

/** Every event customers can browse, soonest first. Without seat charts, to keep pages light. */
export async function listEvents(): Promise<EventItem[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("events");
  return loadEvents(inArray(s.events.status, [...LISTED]), false);
}

/** One event as its page shows it, seat chart included. Undefined for unknown or unpublished events. */
export async function getEventBySlug(slug: string): Promise<EventItem | undefined> {
  "use cache";
  cacheLife("minutes");
  cacheTag("events", `event:${slug}`);
  const [event] = await loadEvents(and(eq(s.events.slug, slug), inArray(s.events.status, [...VISIBLE])), true);
  return event;
}

/** Slugs to prerender at build time. Others are rendered on their first visit. */
export async function listEventSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("events");
  const rows = await db.select({ slug: s.events.slug }).from(s.events).where(inArray(s.events.status, [...VISIBLE]));
  return rows.map((r) => r.slug);
}
