// The ticket types of one event, for the organizer's "Ticket types" page. Server code only (route handlers).
//
// Sold means paid; held means booked and waiting for payment. A ticket type can't be set below the two together, and a
// new type starts hidden with no tickets, so nothing goes on sale until the organizer has set it up.

import { and, asc, eq, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db, schema as s } from "@/db";
import type { OrgTicketType } from "@/lib/organizer";
import { releaseExpired } from "./bookings";
import { activeBooking } from "./events";
import type { Org } from "./organizer";

export type Outcome<T> = { ok: true; value: T } | { ok: false; status: number; error: string };
const fail = (status: number, error: string) => ({ ok: false as const, status, error });
type Types = { sellMode: "tickets" | "seats"; types: OrgTicketType[] };

const kstDate = (d: Date) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Seoul" }).format(d);
const kstDay = (d: Date) => new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10);

async function ownEvent(org: Org, eventId: number) {
  const [e] = await db.select().from(s.events).where(and(eq(s.events.id, eventId), eq(s.events.organizerId, org.id)));
  return e;
}

function refresh(slug: string) {
  try {
    revalidateTag("events", { expire: 0 });
    revalidateTag(`event:${slug}`, { expire: 0 });
  } catch {
    /* outside a request */
  }
}

/** An event's ticket types with what is sold and held. Undefined when it isn't the organizer's event. */
export async function ticketTypesFor(org: Org, eventId: number): Promise<Types | undefined> {
  const e = await ownEvent(org, eventId);
  if (!e) return undefined;
  await releaseExpired();
  const types = await db.select().from(s.ticketTypes).where(eq(s.ticketTypes.eventId, eventId)).orderBy(asc(s.ticketTypes.sort), asc(s.ticketTypes.id));
  const counts = await db
    .select({
      typeId: s.bookingLines.ticketTypeId,
      sold: sql<string>`SUM(CASE WHEN ${s.bookings.status} IN ('confirmed','attended') THEN ${s.bookingLines.qty} ELSE 0 END)`,
      held: sql<string>`SUM(CASE WHEN ${s.bookings.status} IN ('awaiting_payment','proof_rejected','under_review') THEN ${s.bookingLines.qty} ELSE 0 END)`,
    })
    .from(s.bookingLines)
    .innerJoin(s.bookings, eq(s.bookings.id, s.bookingLines.bookingId))
    .where(and(eq(s.bookings.eventId, eventId), activeBooking))
    .groupBy(s.bookingLines.ticketTypeId);
  return {
    sellMode: e.sellMode,
    types: types.map((t): OrgTicketType => {
      const c = counts.find((x) => x.typeId === t.id);
      return {
        id: t.key,
        name: t.name,
        perk: (t.perks ?? []).join(", "),
        summary: t.summary ?? "",
        color: t.color ?? "#ece7dc",
        price: t.price,
        quantity: t.capacity,
        sold: t.soldElsewhere + Number(c?.sold ?? 0),
        held: Number(c?.held ?? 0),
        salesStart: e.publishedAt ? kstDate(e.publishedAt) : "When the event is published",
        salesEnd: t.salesEndAt ? kstDay(t.salesEndAt) : "",
        maxPerOrder: t.maxPerOrder,
        hidden: !t.visible,
        paused: t.salesPaused,
      };
    }),
  };
}

/** Changes one ticket type. The quantity can't go below what is sold and held. */
export async function updateTicketType(org: Org, eventId: number, key: string, input: Partial<OrgTicketType>): Promise<Outcome<Types>> {
  const e = await ownEvent(org, eventId);
  if (!e) return fail(404, "We couldn't find that event.");
  if (e.status === "cancelled" || e.status === "ended") return fail(409, "This event is over, so it can't be changed.");
  const current = (await ticketTypesFor(org, eventId))!.types.find((t) => t.id === key);
  if (!current) return fail(404, "We couldn't find that ticket type.");

  const name = typeof input.name === "string" ? input.name.trim().slice(0, 80) : current.name;
  if (!name) return fail(400, "Give the ticket type a name.");
  const quantity = input.quantity === undefined ? current.quantity : Math.round(Number(input.quantity));
  if (!Number.isFinite(quantity) || quantity < 0 || quantity > 100_000) return fail(400, "Check the quantity.");
  const floor = current.sold + current.held;
  if (quantity < floor) return fail(409, `${current.sold} sold and ${current.held} waiting for payment, so the quantity can't be lower than ${floor}.`);
  const price = input.price === undefined ? current.price : Math.round(Number(input.price));
  if (!Number.isFinite(price) || price < 0 || price > 10_000_000) return fail(400, "Check the price.");
  const maxPerOrder = input.maxPerOrder === undefined ? current.maxPerOrder : Math.min(10, Math.max(1, Math.round(Number(input.maxPerOrder)) || 1));
  const salesEnd = typeof input.salesEnd === "string" ? input.salesEnd : current.salesEnd;
  if (salesEnd && !/^\d{4}-\d{2}-\d{2}$/.test(salesEnd)) return fail(400, "Choose the last day of sales from the calendar.");

  await db
    .update(s.ticketTypes)
    .set({
      name,
      price,
      capacity: quantity,
      maxPerOrder,
      summary: typeof input.summary === "string" ? input.summary.trim().slice(0, 200) || null : undefined,
      visible: input.hidden === undefined ? undefined : !input.hidden,
      salesPaused: input.paused === undefined ? undefined : !!input.paused,
      // Sales end at the end of that day in Korea.
      salesEndAt: salesEnd ? new Date(`${salesEnd}T23:59:59+09:00`) : null,
    })
    .where(and(eq(s.ticketTypes.eventId, eventId), eq(s.ticketTypes.key, key)));
  if (["on_sale", "paused", "cancelled", "ended"].includes(e.status)) refresh(e.slug);
  return { ok: true, value: (await ticketTypesFor(org, eventId))! };
}

/** Adds a ticket type: hidden, with no tickets, until the organizer sets it up. */
export async function addTicketType(org: Org, eventId: number): Promise<Outcome<Types & { key: string }>> {
  const e = await ownEvent(org, eventId);
  if (!e) return fail(404, "We couldn't find that event.");
  if (e.sellMode === "seats") return fail(409, "This event sells numbered seats. Change sections and prices on its seat map.");
  if (e.status === "cancelled" || e.status === "ended") return fail(409, "This event is over, so it can't be changed.");
  const existing = await db.select({ key: s.ticketTypes.key }).from(s.ticketTypes).where(eq(s.ticketTypes.eventId, eventId));
  if (existing.length >= 20) return fail(409, "An event can have up to 20 ticket types.");
  let n = existing.length + 1;
  while (existing.some((x) => x.key === `type-${n}`)) n++;
  const key = `type-${n}`;
  await db.insert(s.ticketTypes).values({ eventId, key, name: "New ticket type", price: 0, capacity: 0, maxPerOrder: 10, visible: false, sort: existing.length, color: "#ece7dc" });
  return { ok: true, value: { key, ...(await ticketTypesFor(org, eventId))! } };
}
