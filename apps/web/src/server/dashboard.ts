// Figures for the organizer's dashboard and the admin's dashboard and reports, from real bookings. Server code only.

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import type { OrgBooking } from "@/lib/organizer";
import type { AccountUser } from "./auth";
import { releaseExpired } from "./bookings";
import { activeBooking } from "./events";
import type { Org } from "./organizer";
import { eventBookings } from "./staff";

type User = AccountUser & { id: number };
const DAY = 86_400_000;
const PAID = ["confirmed", "attended"] as const;

/** "2026-11-11" in Korea time. */
const kstDay = (d: Date) => new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
const dayLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** The last `days` days in Korea time, oldest first, each with how many paid tickets were booked that day. */
function series(rows: { at: Date; qty: number }[], days: number) {
  const today = kstDay(new Date());
  const out: { date: string; label: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = kstDay(new Date(new Date(`${today}T12:00:00+09:00`).getTime() - i * DAY));
    out.push({ date, label: dayLabel(date), value: 0 });
  }
  const index = new Map(out.map((d, i) => [d.date, i]));
  for (const r of rows) {
    const i = index.get(kstDay(r.at));
    if (i !== undefined) out[i]!.value += r.qty;
  }
  return out;
}

const pct = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : now > 0 ? 100 : 0);

/**
 * Paid tickets and money per booking, for the given events (all events when `eventIds` is "all").
 * Subqueries that refer to the outer booking name their tables in full: inside select fields Drizzle leaves columns
 * unqualified, which would quietly compare a table's columns with its own.
 */
async function paidRows(eventIds: number[] | "all") {
  if (eventIds !== "all" && eventIds.length === 0) return [];
  return db
    .select({
      id: s.bookings.id,
      eventId: s.bookings.eventId,
      at: s.bookings.createdAt,
      total: s.bookings.total,
      qty: sql<string>`(SELECT COALESCE(SUM(bl.qty), 0) FROM booking_lines bl WHERE bl.booking_id = bookings.id)`,
    })
    .from(s.bookings)
    .where(and(inArray(s.bookings.status, [...PAID]), eventIds === "all" ? undefined : inArray(s.bookings.eventId, eventIds)));
}

/** Everything the organizer's dashboard shows, for their own events. */
export async function organizerDashboard(user: User, org: Org) {
  await releaseExpired();
  const events = await db.select({ id: s.events.id, title: s.events.title, mode: s.events.sellMode }).from(s.events).where(eq(s.events.organizerId, org.id));
  const ids = events.map((e) => e.id);
  const paid = (await paidRows(ids)).map((r) => ({ ...r, qty: Number(r.qty) }));
  const now = Date.now();
  const inWeek = (r: { at: Date }, w: number) => now - r.at.getTime() >= w * 7 * DAY && now - r.at.getTime() < (w + 1) * 7 * DAY;
  const sum = (list: typeof paid, key: "qty" | "total") => list.reduce((n, r) => n + r[key], 0);
  const thisWeek = paid.filter((r) => inWeek(r, 0));
  const lastWeek = paid.filter((r) => inWeek(r, 1));

  // Sales per ticket type (or seat section), counting bookings that still hold tickets.
  const types = ids.length ? await db.select().from(s.ticketTypes).where(and(inArray(s.ticketTypes.eventId, ids), eq(s.ticketTypes.visible, true))).orderBy(asc(s.ticketTypes.sort)) : [];
  const sections = ids.length ? await db.select().from(s.seatSections).where(inArray(s.seatSections.eventId, ids)).orderBy(asc(s.seatSections.sort)) : [];
  const soldByType = ids.length
    ? await db
        .select({ typeId: s.bookingLines.ticketTypeId, sectionId: s.bookingLines.sectionId, n: sql<string>`SUM(${s.bookingLines.qty})` })
        .from(s.bookingLines)
        .innerJoin(s.bookings, eq(s.bookings.id, s.bookingLines.bookingId))
        .where(and(inArray(s.bookings.eventId, ids), activeBooking))
        .groupBy(s.bookingLines.ticketTypeId, s.bookingLines.sectionId)
    : [];
  const seatCap = sections.length
    ? await db
        .select({ sectionId: s.seats.sectionId, n: sql<string>`COUNT(*)` })
        .from(s.seats)
        .where(and(inArray(s.seats.eventId, ids), eq(s.seats.blocked, false)))
        .groupBy(s.seats.sectionId)
    : [];
  const title = (id: number) => events.find((e) => e.id === id)?.title ?? "";
  const salesByTicket = [
    ...types.map((t) => ({
      label: `${t.name} · ${title(t.eventId)}`,
      event: String(t.eventId),
      sold: t.soldElsewhere + soldByType.filter((x) => x.typeId === t.id).reduce((n, x) => n + Number(x.n), 0),
      of: t.capacity,
    })),
    ...sections.map((sec) => ({
      label: `${sec.name} · ${title(sec.eventId)}`,
      event: String(sec.eventId),
      sold: soldByType.filter((x) => x.sectionId === sec.id).reduce((n, x) => n + Number(x.n), 0),
      of: Number(seatCap.find((x) => x.sectionId === sec.id)?.n ?? 0),
    })),
  ];
  const ticketsTotal = salesByTicket.reduce((n, t) => n + t.of, 0);
  const ticketsTaken = salesByTicket.reduce((n, t) => n + t.sold, 0);

  const waiting = ids.length
    ? await db
        .select({ ref: s.bookings.ref, buyer: s.users.name, total: s.bookings.total, at: sql<Date>`(SELECT MAX(pp.created_at) FROM payment_proofs pp WHERE pp.booking_id = bookings.id)` })
        .from(s.bookings)
        .innerJoin(s.users, eq(s.users.id, s.bookings.userId))
        .where(and(inArray(s.bookings.eventId, ids), eq(s.bookings.status, "under_review")))
    : [];
  const waitingSorted = waiting.map((w) => ({ booking: w.ref, buyer: w.buyer, amount: w.total, sinceIso: w.at ? new Date(w.at).toISOString() : "" })).sort((a, b) => a.sinceIso.localeCompare(b.sinceIso));

  const bookings: (OrgBooking & { event: string })[] = [];
  for (const e of events) for (const b of (await eventBookings(user, e.id)) ?? []) bookings.push({ ...b, event: e.title });

  const revenue = sum(paid, "total");
  const ticketsSold = sum(paid, "qty");
  return {
    stats: {
      soldChangePct: pct(sum(thisWeek, "qty"), sum(lastWeek, "qty")),
      revenueChangePct: pct(sum(thisWeek, "total"), sum(lastWeek, "total")),
      avgTicketPrice: ticketsSold ? Math.round(revenue / ticketsSold) : 0,
      ticketsSold,
      soldThisWeek: sum(thisWeek, "qty"),
      revenue,
      revenueThisWeek: sum(thisWeek, "total"),
      waiting: waitingSorted.length,
      waitingAmount: waitingSorted.reduce((n, w) => n + w.amount, 0),
      ticketsLeft: Math.max(0, ticketsTotal - ticketsTaken),
      ticketsTotal,
    },
    dailySales: series(paid, 90),
    salesByTicket,
    waitingQueue: waitingSorted,
    bookings: bookings.sort((a, b) => b.id.localeCompare(a.id)),
  };
}

/** The admin dashboard and reports: the whole platform. */
export async function platformFigures() {
  await releaseExpired();
  const paid = (await paidRows("all")).map((r) => ({ ...r, qty: Number(r.qty) }));
  const now = Date.now();
  const recent = (days: number) => paid.filter((r) => now - r.at.getTime() < days * DAY);
  const before = (days: number) => paid.filter((r) => now - r.at.getTime() >= days * DAY && now - r.at.getTime() < 2 * days * DAY);
  const total = (list: typeof paid, key: "qty" | "total") => list.reduce((n, r) => n + r[key], 0);

  const events = await db
    .select({ id: s.events.id, title: s.events.title, status: s.events.status, organizer: s.organizers.name })
    .from(s.events)
    .innerJoin(s.organizers, eq(s.organizers.id, s.events.organizerId));
  const scanned = await db
    .select({ eventId: s.tickets.eventId, n: sql<string>`COUNT(*)` })
    .from(s.tickets)
    .where(sql`${s.tickets.scannedAt} IS NOT NULL`)
    .groupBy(s.tickets.eventId);
  const perEvent = events
    .map((e) => {
      const rows = paid.filter((r) => r.eventId === e.id);
      return {
        id: String(e.id),
        title: e.title,
        organizer: e.organizer,
        status: e.status,
        sold: total(rows, "qty"),
        revenue: total(rows, "total"),
        checkedIn: Number(scanned.find((x) => x.eventId === e.id)?.n ?? 0),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
  const perOrganizer = [...new Set(events.map((e) => e.organizer))]
    .map((name) => {
      const mine = perEvent.filter((e) => e.organizer === name);
      return { name, events: mine.length, live: mine.filter((e) => e.status === "on_sale" || e.status === "paused").length, sold: mine.reduce((n, e) => n + e.sold, 0), revenue: mine.reduce((n, e) => n + e.revenue, 0) };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const [counts] = await db
    .select({
      users: sql<string>`(SELECT COUNT(*) FROM ${s.users})`,
      newUsers30: sql<string>`(SELECT COUNT(*) FROM ${s.users} WHERE ${s.users.createdAt} > UTC_TIMESTAMP() - INTERVAL 30 DAY)`,
      waiting: sql<string>`(SELECT COUNT(*) FROM ${s.bookings} WHERE ${s.bookings.status} = 'under_review')`,
      waitingAmount: sql<string>`(SELECT COALESCE(SUM(${s.bookings.total}), 0) FROM ${s.bookings} WHERE ${s.bookings.status} = 'under_review')`,
      awaiting: sql<string>`(SELECT COUNT(*) FROM ${s.bookings} WHERE ${s.bookings.status} IN ('awaiting_payment','proof_rejected'))`,
      eventsLive: sql<string>`(SELECT COUNT(*) FROM ${s.events} WHERE ${s.events.status} IN ('on_sale','paused'))`,
      eventsReview: sql<string>`(SELECT COUNT(*) FROM ${s.events} WHERE ${s.events.status} = 'in_review')`,
      applications: sql<string>`(SELECT COUNT(*) FROM ${s.organizerApplications} WHERE ${s.organizerApplications.status} IN ('received','in_review','more_info'))`,
      organizers: sql<string>`(SELECT COUNT(*) FROM ${s.organizers} WHERE ${s.organizers.status} = 'active')`,
    })
    .from(sql`(SELECT 1) AS one`);
  const n = (v: string | undefined) => Number(v ?? 0);

  // Weekly totals for the last 12 weeks, oldest first.
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const end = now - (11 - i) * 7 * DAY;
    const rows = paid.filter((r) => r.at.getTime() <= end && r.at.getTime() > end - 7 * DAY);
    return { label: dayLabel(kstDay(new Date(end - 6 * DAY))), tickets: total(rows, "qty"), revenue: total(rows, "total") };
  });

  return {
    totals: {
      ticketsSold: total(paid, "qty"),
      revenue: total(paid, "total"),
      tickets30: total(recent(30), "qty"),
      revenue30: total(recent(30), "total"),
      ticketsChangePct: pct(total(recent(30), "qty"), total(before(30), "qty")),
      revenueChangePct: pct(total(recent(30), "total"), total(before(30), "total")),
      users: n(counts?.users),
      newUsers30: n(counts?.newUsers30),
      paymentsWaiting: n(counts?.waiting),
      paymentsWaitingAmount: n(counts?.waitingAmount),
      awaitingPayment: n(counts?.awaiting),
      eventsLive: n(counts?.eventsLive),
      eventsInReview: n(counts?.eventsReview),
      applicationsOpen: n(counts?.applications),
      organizers: n(counts?.organizers),
    },
    ticketsPerDay: series(paid, 30),
    ticketsPerWeek: weeks,
    events: perEvent,
    organizers: perOrganizer,
  };
}
