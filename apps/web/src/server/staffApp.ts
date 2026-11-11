// What the door-staff part of the mobile app needs: who the person is, the events they work and each event's live
// entry numbers. Server code only. Checking a ticket in is POST /api/staff/checkin (server/staff.ts).

import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { GATES } from "@/lib/operations";
import type { AccountUser } from "./auth";
import { organizerOf } from "./organizer";

type User = AccountUser & { id: number };

const ICONS: Record<string, string> = { concert: "mic", party: "headset-outline", culture: "color-palette-outline" };
const kstDay = (d: Date) => new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
const clock = (d: Date) => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Seoul" }).format(d);
const dateLabel = (d: Date) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Seoul" }).format(d).replace(/^(\w+) /, "$1, ");
const OUTCOME: Record<string, string> = { admitted: "admit", already_used: "already_used", not_found: "invalid", wrong_event: "wrong_event", not_paid: "not_paid", cancelled: "cancelled", too_early: "too_early", too_late: "too_late" };

/** The person, the events they check tickets in for, and each event's numbers so far. Undefined: not door staff. */
export async function staffHome(user: User) {
  // Door staff see the events they're assigned to; an organizer's owners and managers see all their events.
  const assigned = await db.select().from(s.eventStaff).where(and(eq(s.eventStaff.userId, user.id), eq(s.eventStaff.suspended, false)));
  const org = await organizerOf(user.id);
  const orgEvents = org ? await db.select({ id: s.events.id }).from(s.events).where(eq(s.events.organizerId, org.id)) : [];
  const ids = [...new Set([...assigned.map((a) => a.eventId), ...orgEvents.map((e) => e.id)])];
  if (!ids.length) return undefined;

  const events = await db
    .select({ e: s.events, organizer: s.organizers.name, organizerId: s.organizers.id, orgPhone: s.organizers.phone })
    .from(s.events)
    .innerJoin(s.organizers, eq(s.organizers.id, s.events.organizerId))
    .where(and(inArray(s.events.id, ids), inArray(s.events.status, ["on_sale", "paused", "ended", "in_review", "unpublished"])))
    .orderBy(asc(s.events.startsAt));
  const owners = await db
    .select({ organizerId: s.organizerMembers.organizerId, name: s.users.name, phone: s.users.phone })
    .from(s.organizerMembers)
    .innerJoin(s.users, eq(s.users.id, s.organizerMembers.userId))
    .where(and(inArray(s.organizerMembers.organizerId, events.length ? events.map((x) => x.organizerId) : [0]), eq(s.organizerMembers.role, "owner")));
  const team = await db
    .select({ eventId: s.eventStaff.eventId, gate: s.eventStaff.gate, name: s.users.name })
    .from(s.eventStaff)
    .innerJoin(s.users, eq(s.users.id, s.eventStaff.userId))
    .where(inArray(s.eventStaff.eventId, ids));
  const tickets = await db
    .select({ eventId: s.tickets.eventId, name: s.tickets.ticketName, scannedAt: s.tickets.scannedAt })
    .from(s.tickets)
    .innerJoin(s.bookings, eq(s.bookings.id, s.tickets.bookingId))
    .where(and(inArray(s.tickets.eventId, ids), inArray(s.bookings.status, ["confirmed", "attended"])));
  const scans = await db
    .select({ id: s.scanLog.id, eventId: s.scanLog.eventId, outcome: s.scanLog.outcome, gate: s.scanLog.gate, at: s.scanLog.at, holder: s.tickets.holderName, ticket: s.tickets.ticketName })
    .from(s.scanLog)
    .leftJoin(s.tickets, eq(s.tickets.id, s.scanLog.ticketId))
    .where(and(inArray(s.scanLog.eventId, ids), gt(s.scanLog.at, sql`UTC_TIMESTAMP() - INTERVAL 2 DAY`)))
    .orderBy(desc(s.scanLog.at))
    .limit(500);

  const today = kstDay(new Date());
  const now = Date.now();
  const list = events.map(({ e, organizer }) => {
    const mine = assigned.find((a) => a.eventId === e.id);
    const ownTickets = tickets.filter((t) => t.eventId === e.id);
    const ownScans = scans.filter((x) => x.eventId === e.id);
    const admits = ownScans.filter((x) => x.outcome === "admitted");
    const byType = new Map<string, { in: number; of: number }>();
    for (const t of ownTickets) {
      const row = byType.get(t.name) ?? { in: 0, of: 0 };
      row.of++;
      if (t.scannedAt) row.in++;
      byType.set(t.name, row);
    }
    const gates = [...new Set([...GATES, ...team.filter((m) => m.eventId === e.id && m.gate).map((m) => m.gate!)])];
    const day = e.startsAt ? kstDay(e.startsAt) : today;
    const days = Math.round((new Date(`${day}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86_400_000);
    return {
      id: String(e.id),
      slug: e.slug,
      title: e.title,
      category: e.category,
      icon: ICONS[e.category] ?? "calendar-outline",
      dateLabel: e.startsAt ? dateLabel(e.startsAt) : "Date to be announced",
      doorsLabel: e.doorsOpenAt ? `Doors ${clock(e.doorsOpenAt)}` : "",
      venue: e.venue ?? "",
      organizer,
      gate: mine?.gate ?? "Main door",
      gates,
      phase: days === 0 ? "today" : days > 0 ? "upcoming" : "past",
      inLabel: days === 1 ? "Tomorrow" : days > 1 ? `In ${days} days` : undefined,
      expected: ownTickets.length,
      doorsOpened: e.doorsOpenAt ? clock(e.doorsOpenAt) : "",
      base: {
        checkedIn: ownTickets.filter((t) => t.scannedAt).length,
        rejected: ownScans.filter((x) => x.outcome !== "admitted").length,
        perMinute: Math.round(admits.filter((x) => now - x.at.getTime() < 5 * 60_000).length / 5),
        byType: [...byType].map(([label, v]) => ({ label, ...v })),
        byGate: gates.map((g) => ({
          label: g,
          staff: team
            .filter((m) => m.eventId === e.id && m.gate === g)
            .map((m) => m.name.split(" ")[0])
            .join(", "),
          in: admits.filter((x) => x.gate === g).length,
        })),
      },
      recent: ownScans.slice(0, 30).map((x) => ({
        id: `srv-${x.id}`,
        time: clock(x.at),
        name: x.holder ?? "Unknown code",
        ticket: x.ticket ?? "—",
        gate: x.gate ?? "—",
        outcome: OUTCOME[x.outcome] ?? "invalid",
      })),
    };
  });

  const first = events[0];
  const owner = first ? owners.find((o) => o.organizerId === first.organizerId) : undefined;
  const names = user.name.split(/\s+/);
  return {
    profile: {
      email: user.email,
      name: user.name,
      firstName: names[0] ?? user.name,
      initials: names
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join(""),
      organizer: org?.name ?? first?.organizer ?? "",
      roleLabel: org ? (org.role === "owner" ? "Organizer" : "Manager") : "Door staff",
      organizerContact: { name: owner?.name ?? first?.organizer ?? "The organizer", phone: owner?.phone ?? first?.orgPhone ?? "" },
      events: list.map((x) => x.id),
    },
    events: list,
  };
}
