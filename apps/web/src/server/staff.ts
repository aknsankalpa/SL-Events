// What event staff see and do with bookings: the payment proofs to check, an event's bookings and ticket holders,
// and checking a ticket in at the door. Server code only (route handlers).
//
// Who may see what:
//   - payment proofs and bookings: an admin (every event) or an owner/manager of the event's organizer;
//   - checking tickets in: the same people, plus door staff assigned to the event (event_staff);
//   - a ticket is admitted at most once: the check-in is a single conditional UPDATE, so two scanners can't both
//     admit the same code.

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { formatKst } from "@/lib/bookings";
import type { Attendee, OrgBooking, OrgBookingStatus } from "@/lib/organizer";
import type { AccountUser } from "./auth";
import { canManageEvent, releaseExpired } from "./bookings";
import { settingsOf } from "./operations";
import { organizerOf } from "./organizer";

type User = AccountUser & { id: number };

/* ---------- which events a person may manage ---------- */

/** Event ids the person manages: every event for an admin, their organizer's events otherwise. */
async function managedEventIds(user: User, onlyAdminScope: boolean): Promise<number[] | "all"> {
  if (onlyAdminScope && user.roles.includes("admin")) return "all";
  const org = await organizerOf(user.id);
  if (!org) return [];
  const rows = await db.select({ id: s.events.id }).from(s.events).where(eq(s.events.organizerId, org.id));
  return rows.map((r) => r.id);
}

/* ---------- payment proofs waiting to be checked ---------- */

export type ReviewItem = {
  ref: string;
  buyer: string;
  email: string;
  eventId: number | null;
  eventTitle: string;
  tickets: string;
  seats?: string;
  total: number;
  bookedAt: string;
  payByIso?: string;
  proof: {
    fileName: string;
    uploadedIso: string;
    uploadedAt: string;
    sizeBytes: number;
    isPdf: boolean;
    sender?: string;
    bank?: string;
    amount?: string;
    date?: string;
    time?: string;
    note?: string;
  };
  /** Earlier proofs for the same booking that were rejected. */
  rejectedBefore: number;
};

/**
 * Bookings under review, oldest proof first. `all` (admins only) covers every event; otherwise the person's
 * organizer's events.
 */
export async function reviewQueue(user: User, all: boolean): Promise<ReviewItem[]> {
  await releaseExpired();
  const scope = await managedEventIds(user, all);
  if (scope !== "all" && scope.length === 0) return [];
  const rows = await db
    .select({ b: s.bookings, buyer: s.users.name, email: s.users.email })
    .from(s.bookings)
    .innerJoin(s.users, eq(s.users.id, s.bookings.userId))
    .where(and(eq(s.bookings.status, "under_review"), scope === "all" ? undefined : inArray(s.bookings.eventId, scope)));
  if (!rows.length) return [];
  const ids = rows.map((r) => r.b.id);
  const lines = await db.select().from(s.bookingLines).where(inArray(s.bookingLines.bookingId, ids)).orderBy(asc(s.bookingLines.id));
  const seats = await db
    .select({ bookingId: s.tickets.bookingId, label: s.tickets.seatLabel })
    .from(s.tickets)
    .where(and(inArray(s.tickets.bookingId, ids), sql`${s.tickets.seatLabel} IS NOT NULL`))
    .orderBy(asc(s.tickets.position));
  const proofs = await db.select().from(s.paymentProofs).where(inArray(s.paymentProofs.bookingId, ids)).orderBy(desc(s.paymentProofs.uploadedAt), desc(s.paymentProofs.id));

  const items = rows.flatMap(({ b, buyer, email }): ReviewItem[] => {
    const own = proofs.filter((p) => p.bookingId === b.id);
    const latest = own[0];
    if (!latest) return [];
    const seatLabels = seats.filter((x) => x.bookingId === b.id).map((x) => x.label);
    return [
      {
        ref: b.ref,
        buyer,
        email,
        eventId: b.eventId,
        eventTitle: b.eventTitle,
        tickets: lines
          .filter((l) => l.bookingId === b.id)
          .map((l) => `${l.qty} × ${l.name}`)
          .join(", "),
        seats: seatLabels.length ? seatLabels.join(", ") : undefined,
        total: b.total,
        bookedAt: formatKst(b.createdAt.toISOString()),
        payByIso: b.payBy?.toISOString(),
        proof: {
          fileName: latest.fileName,
          uploadedIso: latest.uploadedAt.toISOString(),
          uploadedAt: formatKst(latest.uploadedAt.toISOString()),
          sizeBytes: latest.sizeBytes,
          isPdf: latest.filePath.toLowerCase().endsWith(".pdf"),
          sender: latest.sender ?? undefined,
          bank: latest.bank ?? undefined,
          ...(latest.details ?? {}),
        },
        rejectedBefore: own.length - 1,
      },
    ];
  });
  return items.sort((a, b) => a.proof.uploadedIso.localeCompare(b.proof.uploadedIso));
}

/* ---------- an event's bookings and ticket holders ---------- */

const ORG_STATUS: Record<(typeof s.bookingStatuses)[number], OrgBookingStatus> = {
  confirmed: "paid",
  attended: "paid",
  under_review: "under_review",
  awaiting_payment: "awaiting_payment",
  proof_rejected: "rejected",
  cancelled: "cancelled",
  expired: "cancelled",
};

const dayLabel = (d: Date) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Seoul" }).format(d);

/** The event, if the person manages it (admin, or owner/manager of its organizer). */
async function managedEvent(user: User, eventId: number) {
  const [event] = await db.select().from(s.events).where(eq(s.events.id, eventId));
  if (!event || !(await canManageEvent(user, event.id))) return undefined;
  return event;
}

/** Every booking of an event, newest first, with its ticket holders and what happened to it. */
export async function eventBookings(user: User, eventId: number): Promise<OrgBooking[] | undefined> {
  const event = await managedEvent(user, eventId);
  if (!event) return undefined;
  await releaseExpired();
  const rows = await db
    .select({ b: s.bookings, buyer: s.users.name, email: s.users.email, phone: s.users.phone })
    .from(s.bookings)
    .innerJoin(s.users, eq(s.users.id, s.bookings.userId))
    .where(eq(s.bookings.eventId, eventId))
    .orderBy(desc(s.bookings.createdAt), desc(s.bookings.id));
  if (!rows.length) return [];
  const ids = rows.map((r) => r.b.id);
  const lines = await db.select().from(s.bookingLines).where(inArray(s.bookingLines.bookingId, ids)).orderBy(asc(s.bookingLines.id));
  const tickets = await db.select().from(s.tickets).where(inArray(s.tickets.bookingId, ids)).orderBy(asc(s.tickets.position));
  const proofs = await db.select().from(s.paymentProofs).where(inArray(s.paymentProofs.bookingId, ids)).orderBy(asc(s.paymentProofs.uploadedAt));
  const verifierIds = [...new Set(rows.map((r) => r.b.verifiedBy).filter((x): x is number => !!x))];
  const verifiers = verifierIds.length ? await db.select({ id: s.users.id, name: s.users.name }).from(s.users).where(inArray(s.users.id, verifierIds)) : [];

  return rows.map(({ b, buyer, email, phone }): OrgBooking => {
    const status = ORG_STATUS[b.status];
    const own = tickets.filter((t) => t.bookingId === b.id);
    const history: { label: string; at: string; iso: string }[] = [{ label: "Booking created", at: formatKst(b.createdAt.toISOString()), iso: b.createdAt.toISOString() }];
    for (const p of proofs.filter((x) => x.bookingId === b.id)) history.push({ label: "Proof uploaded", at: formatKst(p.uploadedAt.toISOString()), iso: p.uploadedAt.toISOString() });
    if (b.verifiedAt) history.push({ label: "Payment approved", at: formatKst(b.verifiedAt.toISOString()), iso: b.verifiedAt.toISOString() });
    if (b.status === "proof_rejected") history.push({ label: `Proof rejected${b.rejectionNote ? ` · ${b.rejectionNote}` : ""}`, at: formatKst(b.updatedAt.toISOString()), iso: b.updatedAt.toISOString() });
    if (b.cancelledAt) history.push({ label: "Booking cancelled", at: formatKst(b.cancelledAt.toISOString()), iso: b.cancelledAt.toISOString() });
    if (b.status === "expired" && b.payBy) history.push({ label: "Expired: not paid in time", at: formatKst(b.payBy.toISOString()), iso: b.payBy.toISOString() });
    history.sort((x, y) => y.iso.localeCompare(x.iso));
    return {
      id: b.ref,
      buyer,
      email,
      phone: phone ?? "",
      tickets: lines
        .filter((l) => l.bookingId === b.id)
        .map((l) => `${l.qty} × ${l.name}`)
        .join(", "),
      amount: b.total,
      status,
      booked: dayLabel(b.createdAt),
      // Codes are shown only for paid bookings: an unpaid booking's codes don't get anyone in.
      holders: status === "paid" ? own.map((t) => ({ name: t.holderName, ticket: t.seatLabel ? `${t.ticketName} · ${t.seatLabel}` : t.ticketName, code: t.code })) : [],
      history: history.map(({ label, at }) => ({ label, at })),
      approvedBy: b.verifiedBy ? verifiers.find((v) => v.id === b.verifiedBy)?.name : undefined,
      approvedAt: b.verifiedAt ? formatKst(b.verifiedAt.toISOString()) : undefined,
    };
  });
}

/** Everyone holding a ticket for an event, and the figures above the list. */
export async function eventAttendees(user: User, eventId: number) {
  const event = await managedEvent(user, eventId);
  if (!event) return undefined;
  await releaseExpired();
  const rows = await db
    .select({ t: s.tickets, status: s.bookings.status, ref: s.bookings.ref, ownerName: s.users.name, ownerEmail: s.users.email, cancelledAt: s.bookings.cancelledAt })
    .from(s.tickets)
    .innerJoin(s.bookings, eq(s.bookings.id, s.tickets.bookingId))
    .innerJoin(s.users, eq(s.users.id, s.bookings.userId))
    .where(eq(s.tickets.eventId, eventId))
    .orderBy(asc(s.tickets.holderName));

  const attendees = rows.map(({ t, status, ref, ownerName, ownerEmail, cancelledAt }): Attendee & { paid: boolean; seat?: string } => {
    const paid = status === "confirmed" || status === "attended";
    const gone = status === "cancelled" || status === "expired";
    const own = t.holderName.trim().toLowerCase() === ownerName.trim().toLowerCase();
    return {
      name: t.holderName,
      email: own ? ownerEmail : "",
      via: own ? undefined : `via ${ownerName}`,
      ticket: t.seatLabel ? `${t.ticketName} · ${t.seatLabel}` : t.ticketName,
      // Unpaid tickets don't get anyone in, so their codes aren't listed.
      code: paid ? t.code : "—",
      booking: ref,
      state: gone ? "cancelled" : t.scannedAt ? "checked_in" : "not_yet",
      note: gone ? (status === "expired" ? "Not paid in time" : cancelledAt ? `Cancelled ${dayLabel(cancelledAt)}` : "Cancelled") : !paid ? "Payment not confirmed yet" : undefined,
      paid,
      seat: t.seatLabel ?? undefined,
    };
  });
  // The latest scans at the door, newest first, for the scanner screen.
  const scans = await db
    .select({ outcome: s.scanLog.outcome, at: s.scanLog.at, gate: s.scanLog.gate, holder: s.tickets.holderName, ticket: s.tickets.ticketName })
    .from(s.scanLog)
    .leftJoin(s.tickets, eq(s.tickets.id, s.scanLog.ticketId))
    .where(eq(s.scanLog.eventId, eventId))
    .orderBy(desc(s.scanLog.at), desc(s.scanLog.id))
    .limit(8);
  const [refused] = await db
    .select({ n: sql<string>`COUNT(*)` })
    .from(s.scanLog)
    .where(and(eq(s.scanLog.eventId, eventId), sql`${s.scanLog.outcome} <> 'admitted'`));

  const valid = attendees.filter((a) => a.state !== "cancelled");
  const paidRefs = new Set(valid.filter((a) => a.paid).map((a) => a.booking));
  return {
    attendees,
    stats: {
      total: valid.filter((a) => a.paid).length,
      paidBookings: paidRefs.size,
      checkedIn: valid.filter((a) => a.state === "checked_in").length,
      vip: valid.filter((a) => a.paid && /vip/i.test(a.ticket)).length,
      unpaidTickets: valid.filter((a) => !a.paid).length,
      ticketsListed: attendees.length,
      refusedScans: Number(refused?.n ?? 0),
    },
    recentScans: scans.map((x) => ({ outcome: x.outcome, holder: x.holder ?? undefined, ticket: x.ticket ?? undefined, gate: x.gate ?? undefined, at: x.at.toISOString() })),
  };
}

/* ---------- checking a ticket in ---------- */

export type CheckInOutcome = "admitted" | "already_used" | "not_found" | "wrong_event" | "not_paid" | "cancelled" | "too_early" | "too_late";
export type CheckInResult = {
  outcome: CheckInOutcome;
  holder?: string;
  ticket?: string;
  seat?: string;
  booking?: string;
  scannedAt?: string;
  eventTitle?: string;
  /** For "too_early" / "too_late": when check-in opens and when it closes. */
  opensAt?: string;
  cutoffAt?: string;
  /** For "already_used": when, where and by whom it was first scanned. */
  firstScan?: { time: string; gate: string; by: string };
  /** For "admitted": how many tickets of the booking are now in. */
  bookingProgress?: { checked: number; total: number };
};

/** Admins, owners/managers of the event's organizer, and door staff assigned to the event. */
export async function canCheckIn(user: User, eventId: number): Promise<boolean> {
  if (await canManageEvent(user, eventId)) return true;
  const [row] = await db
    .select({ from: s.eventStaff.accessFrom, until: s.eventStaff.accessUntil, suspended: s.eventStaff.suspended })
    .from(s.eventStaff)
    .where(and(eq(s.eventStaff.eventId, eventId), eq(s.eventStaff.userId, user.id)));
  // A paused member can't check anyone in until the organizer resumes them.
  if (!row || row.suspended) return false;
  const now = Date.now();
  return (!row.from || row.from.getTime() <= now) && (!row.until || row.until.getTime() >= now);
}

/**
 * Admits a ticket at the door. The UPDATE only succeeds for an unscanned ticket of this event whose booking is paid,
 * so the same code can never be admitted twice, even from two scanners at once. Every attempt is logged.
 */
export async function checkIn(user: User, eventId: number, rawCode: string, gate: string | null): Promise<CheckInResult> {
  const code = rawCode.trim().toUpperCase().slice(0, 40);

  // Once the organizer has saved event-day settings, check-in opens and closes when they said.
  const [event] = await db.select({ startsAt: s.events.startsAt, operations: s.events.operations }).from(s.events).where(eq(s.events.id, eventId));
  if (event?.startsAt && (event.operations as { settings?: unknown } | null)?.settings) {
    const settings = settingsOf(event.operations);
    const day = new Date(event.startsAt.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
    const opens = new Date(`${day}T${settings.checkInOpens.padStart(5, "0")}:00+09:00`);
    const cutoff = settings.lateCutoff === "none" ? null : new Date(`${day}T${settings.lateCutoff.padStart(5, "0")}:00+09:00`);
    const now = Date.now();
    const timing: CheckInOutcome | null = now < opens.getTime() ? "too_early" : cutoff && now > cutoff.getTime() ? "too_late" : null;
    if (timing) {
      await db.insert(s.scanLog).values({ eventId, code, outcome: timing, staffUserId: user.id, gate });
      return { outcome: timing, opensAt: formatKst(opens.toISOString()), cutoffAt: cutoff ? formatKst(cutoff.toISOString()) : undefined };
    }
  }

  const [res] = await db.execute(sql`
    UPDATE tickets t JOIN bookings b ON b.id = t.booking_id
    SET t.scanned_at = UTC_TIMESTAMP(), t.scanned_by = ${user.id}, t.gate = ${gate}
    WHERE t.code = ${code} AND t.event_id = ${eventId} AND t.scanned_at IS NULL AND b.status IN ('confirmed', 'attended')`);
  const admitted = (res as unknown as { affectedRows: number }).affectedRows === 1;

  const [row] = await db
    .select({ t: s.tickets, status: s.bookings.status, ref: s.bookings.ref, bookingId: s.bookings.id, eventTitle: s.events.title })
    .from(s.tickets)
    .innerJoin(s.bookings, eq(s.bookings.id, s.tickets.bookingId))
    .leftJoin(s.events, eq(s.events.id, s.tickets.eventId))
    .where(eq(s.tickets.code, code));

  let result: CheckInResult;
  if (!row) result = { outcome: "not_found" };
  else {
    const base = { holder: row.t.holderName, ticket: row.t.ticketName, seat: row.t.seatLabel ?? undefined, booking: row.ref, eventTitle: row.eventTitle ?? undefined };
    if (admitted) {
      // A booking with someone through the door reads as "attended" for the customer.
      await db.update(s.bookings).set({ status: "attended" }).where(and(eq(s.bookings.id, row.bookingId), eq(s.bookings.status, "confirmed")));
      const mates = await db.select({ scannedAt: s.tickets.scannedAt }).from(s.tickets).where(eq(s.tickets.bookingId, row.bookingId));
      result = { outcome: "admitted", ...base, bookingProgress: { checked: mates.filter((m) => m.scannedAt).length, total: mates.length } };
    } else if (row.t.eventId !== eventId) result = { outcome: "wrong_event", ...base };
    else if (row.status === "cancelled" || row.status === "expired") result = { outcome: "cancelled", ...base };
    else if (row.status !== "confirmed" && row.status !== "attended") result = { outcome: "not_paid", ...base };
    else {
      const [by] = row.t.scannedBy ? await db.select({ name: s.users.name }).from(s.users).where(eq(s.users.id, row.t.scannedBy)) : [];
      const at = row.t.scannedAt ?? new Date();
      result = {
        outcome: "already_used",
        ...base,
        scannedAt: formatKst(at.toISOString()),
        firstScan: { time: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Seoul" }).format(at), gate: row.t.gate ?? "—", by: by?.name.split(" ")[0] ?? "Staff" },
      };
    }
  }
  await db.insert(s.scanLog).values({
    eventId,
    ticketId: row && row.t.eventId === eventId ? row.t.id : null,
    code,
    outcome: result.outcome,
    staffUserId: user.id,
    gate,
  });
  return result;
}
