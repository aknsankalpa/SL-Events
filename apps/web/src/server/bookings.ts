// Bookings, seat holds, payment proofs and tickets in the database. Server code only (route handlers).
//
// The rules (who may do what, and when) are the same ones lib/bookings.ts describes, decided here:
//   - a customer sees and changes only their own bookings;
//   - a booking is checked against what is really left, inside one transaction: ticket types are locked while they
//     are counted, and a seat can be held by one booking only (the seat_holds primary key refuses a second one);
//   - unpaid bookings are held for the payment window; when it closes they expire and their seats are freed;
//   - only staff of the event's organizer (or an admin) can confirm or reject a payment, and QR tickets are only
//     shown once a paid booking has been verified.

import { randomInt } from "node:crypto";
import { and, asc, desc, eq, inArray, isNotNull, lte, sql, type SQL } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db, schema as s } from "@/db";
import {
  BOOKING_FEE,
  canIssueTickets,
  customerCan,
  effectiveStatus,
  formatKst,
  MAX_PER_BOOKING,
  paymentRules,
  type Booking,
  type BookingLine,
  type BookingStatus,
  type IssuedTicket,
} from "@/lib/bookings";
import { linesForSeats, prepareSeatBooking } from "@/lib/seating";
import type { AccountUser } from "./auth";
import { activeBooking, seatChartFor, takenSeatKeys } from "./events";
import { MAX_UPLOAD_BYTES, readUpload, saveUpload, sniff, contentTypeOf } from "./storage";

type User = AccountUser & { id: number };
export type Outcome<T> = { ok: true; value: T } | { ok: false; status: number; error: string; errors?: Record<string, string> };
const fail = (status: number, error: string, errors?: Record<string, string>): { ok: false; status: number; error: string; errors?: Record<string, string> } => ({ ok: false, status, error, errors });

/** The error a duplicate key raises in MariaDB, whether or not Drizzle wrapped it. */
function duplicateKey(e: unknown): string | null {
  for (let x: unknown = e; x && typeof x === "object"; x = (x as { cause?: unknown }).cause) {
    const err = x as { code?: string; sqlMessage?: string; message?: string };
    if (err.code === "ER_DUP_ENTRY") return err.sqlMessage ?? err.message ?? "duplicate";
  }
  return null;
}

/** Event pages show how many tickets are left; after a change in sales they refresh on their next visit. */
function refreshEvents() {
  try {
    revalidateTag("events", "max");
  } catch {
    /* outside a request (scripts): nothing cached to refresh */
  }
}

/* ---------- expiry ---------- */

/**
 * Marks unpaid bookings whose payment window has closed as expired and frees their seats. Runs before bookings are
 * read or made (so nothing waits for a timer) and can also run from a scheduled job.
 */
export async function releaseExpired(): Promise<number> {
  const [res] = await db
    .update(s.bookings)
    .set({ status: "expired" })
    .where(and(inArray(s.bookings.status, ["awaiting_payment", "proof_rejected"]), isNotNull(s.bookings.payBy), lte(s.bookings.payBy, sql`UTC_TIMESTAMP()`)));
  await db.execute(sql`DELETE h FROM seat_holds h JOIN bookings b ON b.id = h.booking_id WHERE b.status IN ('expired', 'cancelled')`);
  if (res.affectedRows > 0) refreshEvents();
  return res.affectedRows;
}

/* ---------- reading ---------- */

const sizeLabel = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** "13 Dec 2026" in Korea time: how a booking remembers its event's date. */
const dateLabel = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Seoul" }).format(d) : "Date to be announced";

async function loadBookings(where: SQL): Promise<(Booking & { dbId: number; eventId: number | null })[]> {
  const rows = await db
    .select({ b: s.bookings, ownerEmail: s.users.email, slug: s.events.slug })
    .from(s.bookings)
    .innerJoin(s.users, eq(s.users.id, s.bookings.userId))
    .leftJoin(s.events, eq(s.events.id, s.bookings.eventId))
    .where(where)
    .orderBy(desc(s.bookings.createdAt), desc(s.bookings.id));
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.b.id);
  const lines = await db.select().from(s.bookingLines).where(inArray(s.bookingLines.bookingId, ids)).orderBy(asc(s.bookingLines.id));
  const tickets = await db
    .select({ t: s.tickets, seatKey: s.seats.key })
    .from(s.tickets)
    .leftJoin(s.seats, eq(s.seats.id, s.tickets.seatId))
    .where(inArray(s.tickets.bookingId, ids))
    .orderBy(asc(s.tickets.position));
  const proofs = await db.select().from(s.paymentProofs).where(inArray(s.paymentProofs.bookingId, ids)).orderBy(desc(s.paymentProofs.uploadedAt), desc(s.paymentProofs.id));
  const now = Date.now();

  return rows.map(({ b, ownerEmail, slug }) => {
    const own = tickets.filter((x) => x.t.bookingId === b.id);
    const proof = proofs.find((p) => p.bookingId === b.id);
    const payByIso = b.payBy?.toISOString();
    const seats = own.filter((x) => x.t.seatLabel).map((x) => ({ id: x.seatKey ?? x.t.seatLabel!, label: x.t.seatLabel! }));
    const booking: Booking & { dbId: number; eventId: number | null } = {
      dbId: b.id,
      eventId: b.eventId,
      id: b.ref,
      ownerEmail,
      eventSlug: slug ?? "",
      eventTitle: b.eventTitle,
      eventDate: b.eventDateLabel,
      status: effectiveStatus({ status: b.status, payByIso }, now),
      lines: lines.filter((l) => l.bookingId === b.id).map((l): BookingLine => ({ ticketName: l.name, qty: l.qty, unitPrice: l.unitPrice })),
      fee: b.fee,
      total: b.total,
      attendees: own.map((x) => x.t.holderName),
      seats: seats.length ? seats : undefined,
      paymentMethod: b.paymentMethod === "bank_transfer" ? "Bank transfer" : "—",
      createdIso: b.createdAt.toISOString(),
      createdAt: formatKst(b.createdAt.toISOString()),
      proof: proof
        ? { fileName: proof.fileName, uploadedAt: formatKst(proof.uploadedAt.toISOString()), sizeLabel: sizeLabel(proof.sizeBytes), sender: proof.sender ?? undefined, bank: proof.bank ?? undefined }
        : undefined,
      payByIso,
      payBy: payByIso ? formatKst(payByIso) : undefined,
      rejectionNote: b.rejectionNote ?? undefined,
      statusNote: b.statusNote ?? undefined,
      verifiedAt: b.verifiedAt?.toISOString(),
      verifiedBy: b.verifiedAt ? "SL Events payments team" : undefined,
      cancelledAt: b.cancelledAt?.toISOString(),
    };
    if (canIssueTickets(booking)) {
      booking.tickets = own.map(
        (x): IssuedTicket => ({ code: x.t.code, holder: x.t.holderName, ticketName: x.t.ticketName, scanned: !!x.t.scannedAt, seat: x.t.seatLabel ?? undefined }),
      );
    }
    return booking;
  });
}

/** Strips the server's own fields before a booking leaves the server. */
function publicBooking(b: Booking & { dbId: number; eventId: number | null }): Booking {
  const copy: Partial<typeof b> = { ...b };
  delete copy.dbId;
  delete copy.eventId;
  return copy as Booking;
}

/** The customer's own bookings, newest first. */
export async function listMyBookings(user: User): Promise<Booking[]> {
  await releaseExpired();
  return (await loadBookings(eq(s.bookings.userId, user.id))).map(publicBooking);
}

/** One of the customer's own bookings. Someone else's booking is "not found", exactly like a missing one. */
export async function getMyBooking(user: User, ref: string): Promise<Booking | undefined> {
  await releaseExpired();
  const [b] = await loadBookings(and(eq(s.bookings.ref, ref), eq(s.bookings.userId, user.id))!);
  return b && publicBooking(b);
}

/** Seats taken right now at an event, by its page address. Undefined for an event customers can't see. */
export async function takenSeatsForEvent(slug: string): Promise<string[] | undefined> {
  const [event] = await db
    .select({ id: s.events.id })
    .from(s.events)
    .where(and(eq(s.events.slug, slug), inArray(s.events.status, ["on_sale", "paused", "cancelled", "ended"])));
  if (!event) return undefined;
  await releaseExpired();
  return takenSeatKeys(event.id);
}

/* ---------- making a booking ---------- */

export type BookingRequest = {
  eventSlug: string;
  /** Ticket-type events: ticket type key → how many. */
  tickets?: Record<string, number>;
  /** Numbered-seat events: the chart's seat ids. */
  seatIds?: string[];
  /** One name per ticket, in the order the tickets are listed (for seats: the order the server puts them in). */
  attendees: string[];
};

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const randomCode = (n: number) => Array.from({ length: n }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
/** "SLE-7K3F-92QD": the QR ticket code. Random, so codes can't be guessed from a booking number. */
const ticketCode = () => `SLE-${randomCode(4)}-${randomCode(4)}`;
const bookingRef = () => `SL-${randomInt(100000, 1000000)}`;

class Refused extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly errors?: Record<string, string>,
  ) {
    super(message);
  }
}

// Inside a transaction every query goes through `tx`: borrowing a second connection from the small pool while holding
// one could leave simultaneous bookings all waiting for each other.
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type PlannedLine = BookingLine & { ticketTypeId?: number; sectionId?: number };
type PlannedSeat = { seatId: number; label: string };

/** Places a booking for the signed-in customer. Unpaid bookings are held for the payment window. */
export async function createBooking(user: User, req: BookingRequest): Promise<Outcome<Booking>> {
  const [event] = await db.select().from(s.events).where(eq(s.events.slug, req.eventSlug));
  if (!event || !["on_sale", "paused", "cancelled", "ended"].includes(event.status)) return fail(404, "We couldn't find that event.");
  if (event.status === "paused") return fail(409, "Ticket sales for this event are paused at the moment.");
  if (event.status !== "on_sale") return fail(409, "This event is no longer on sale.");
  if (event.startsAt && event.startsAt.getTime() <= Date.now()) return fail(409, "This event has already started.");

  const attendees = Array.isArray(req.attendees) ? req.attendees.map((n) => (typeof n === "string" ? n.trim().replace(/\s+/g, " ") : "")) : [];
  const nameErrors: Record<string, string> = {};
  attendees.forEach((n, i) => {
    if (!n) nameErrors[`attendee${i}`] = "Enter the name for this ticket.";
    else if (n.length > 120) nameErrors[`attendee${i}`] = "That name is too long.";
  });
  if (Object.keys(nameErrors).length) return fail(400, "Enter a name for every ticket.", nameErrors);

  await releaseExpired();
  try {
    const id = await db.transaction(async (tx) => {
      const { lines, seats } = event.sellMode === "seats" ? await planSeats(tx, event.id, req.seatIds) : await planTickets(tx, event.id, req.tickets);
      const count = lines.reduce((n, l) => n + l.qty, 0);
      if (count === 0) throw new Refused(event.sellMode === "seats" ? "Choose at least one seat." : "Choose at least one ticket.");
      if (count > MAX_PER_BOOKING) throw new Refused(`One booking can hold up to ${MAX_PER_BOOKING} tickets.`);
      if (attendees.length !== count) throw new Refused("Enter one name for each ticket.");

      const total = lines.reduce((n, l) => n + l.qty * l.unitPrice, 0) + BOOKING_FEE;
      const free = total === 0 && paymentRules.freeBookingsConfirmInstantly;
      const now = new Date();
      const values = {
        userId: user.id,
        eventId: event.id,
        eventTitle: event.title,
        eventDateLabel: dateLabel(event.startsAt),
        status: (free ? "confirmed" : "awaiting_payment") as BookingStatus,
        fee: BOOKING_FEE,
        total,
        paymentMethod: (free ? "none" : "bank_transfer") as "none" | "bank_transfer",
        payBy: free ? null : new Date(now.getTime() + paymentRules.holdHours * 3600_000),
      };

      // A new booking number until one is free (a failed insert doesn't end the transaction in MariaDB).
      let bookingId = 0;
      for (let attempt = 0; !bookingId; attempt++) {
        try {
          [{ id: bookingId }] = await tx.insert(s.bookings).values({ ...values, ref: bookingRef() }).$returningId();
        } catch (e) {
          if (attempt > 8 || !duplicateKey(e)?.includes("bookings_ref_unique")) throw e;
        }
      }

      await tx.insert(s.bookingLines).values(
        lines.map((l) => ({ bookingId, ticketTypeId: l.ticketTypeId ?? null, sectionId: l.sectionId ?? null, name: l.ticketName, qty: l.qty, unitPrice: l.unitPrice })),
      );

      const names = lines.flatMap((l) => Array.from({ length: l.qty }, () => l.ticketName));
      for (const [position, ticketName] of names.entries()) {
        const seat = seats[position];
        for (let attempt = 0; ; attempt++) {
          try {
            await tx.insert(s.tickets).values({
              bookingId,
              eventId: event.id,
              code: ticketCode(),
              holderName: attendees[position]!,
              ticketName,
              seatId: seat?.seatId ?? null,
              seatLabel: seat?.label ?? null,
              position,
            });
            break;
          } catch (e) {
            if (attempt > 8 || !duplicateKey(e)?.includes("tickets_code_unique")) throw e;
          }
        }
      }

      if (seats.length) {
        try {
          await tx.insert(s.seatHolds).values(seats.map((seat) => ({ eventId: event.id, seatId: seat.seatId, bookingId })));
        } catch (e) {
          if (duplicateKey(e)) throw new Refused("Someone has just booked one of those seats. Please choose again.", 409);
          throw e;
        }
      }
      return bookingId;
    });

    refreshEvents();
    const [booking] = await loadBookings(eq(s.bookings.id, id));
    return { ok: true, value: publicBooking(booking!) };
  } catch (e) {
    if (e instanceof Refused) return fail(e.status, e.message, e.errors);
    throw e;
  }
}

/** Ticket-type events: checks each type against what is really left, with the types locked while they are counted. */
async function planTickets(tx: Tx, eventId: number, wanted: BookingRequest["tickets"]): Promise<{ lines: PlannedLine[]; seats: PlannedSeat[] }> {
  const asked = Object.entries(wanted && typeof wanted === "object" ? wanted : {})
    .map(([key, qty]) => [key, Number(qty)] as const)
    .filter(([, qty]) => qty > 0);
  if (asked.some(([, qty]) => !Number.isInteger(qty))) throw new Refused("Ticket numbers must be whole numbers.");

  const types = await tx.select().from(s.ticketTypes).where(eq(s.ticketTypes.eventId, eventId)).orderBy(asc(s.ticketTypes.sort)).for("update");
  const sold = await tx
    .select({ typeId: s.bookingLines.ticketTypeId, qty: sql<string>`SUM(${s.bookingLines.qty})` })
    .from(s.bookingLines)
    .innerJoin(s.bookings, eq(s.bookings.id, s.bookingLines.bookingId))
    .where(and(eq(s.bookings.eventId, eventId), activeBooking))
    .groupBy(s.bookingLines.ticketTypeId);
  const soldBy = new Map(sold.map((r) => [r.typeId, Number(r.qty)]));

  for (const [key] of asked) if (!types.some((t) => t.key === key && t.visible)) throw new Refused("One of those tickets isn't on sale.");
  const lines: PlannedLine[] = [];
  for (const t of types) {
    const qty = asked.find(([key]) => key === t.key)?.[1] ?? 0;
    if (!qty) continue;
    if (t.salesPaused || (t.salesEndAt && t.salesEndAt.getTime() <= Date.now())) throw new Refused(`${t.name} tickets aren't on sale any more.`, 409);
    if (qty > t.maxPerOrder) throw new Refused(`You can book up to ${t.maxPerOrder} ${t.name} tickets at a time.`);
    const left = Math.max(0, t.capacity - t.soldElsewhere - (soldBy.get(t.id) ?? 0));
    if (qty > left) throw new Refused(left === 0 ? `${t.name} tickets are sold out.` : `Only ${left} ${t.name} ticket${left === 1 ? " is" : "s are"} left.`, 409);
    lines.push({ ticketName: t.name, qty, unitPrice: t.price, ticketTypeId: t.id });
  }
  return { lines, seats: [] };
}

/** Numbered-seat events: checks the seats against the chart and what is held; the hold itself happens on insert. */
async function planSeats(tx: Tx, eventId: number, seatIds: BookingRequest["seatIds"]): Promise<{ lines: PlannedLine[]; seats: PlannedSeat[] }> {
  const ids = Array.isArray(seatIds) ? seatIds.filter((x): x is string => typeof x === "string") : [];
  const chart = await seatChartFor(eventId, tx);
  if (!chart) throw new Refused("This event has no seat chart yet.", 409);
  const prepared = prepareSeatBooking(chart, new Set(await takenSeatKeys(eventId, tx)), ids, MAX_PER_BOOKING);
  if (!prepared.ok) throw new Refused(prepared.message, 409);

  const sections = await tx.select({ id: s.seatSections.id, key: s.seatSections.key }).from(s.seatSections).where(eq(s.seatSections.eventId, eventId));
  const seatRows = await tx
    .select({ id: s.seats.id, key: s.seats.key })
    .from(s.seats)
    .where(and(eq(s.seats.eventId, eventId), inArray(s.seats.key, prepared.seats.map((x) => x.id))));
  const sectionId = new Map(sections.map((x) => [x.key, x.id]));
  const seatId = new Map(seatRows.map((x) => [x.key, x.id]));

  const lines = linesForSeats(chart, prepared.seats).map((l) => ({ ticketName: l.ticketName, qty: l.qty, unitPrice: l.unitPrice, sectionId: sectionId.get(l.sectionId) }));
  const seats = prepared.seats.map((x) => {
    const id = seatId.get(x.id);
    if (!id) throw new Refused("One of those seats isn't on the chart any more. Please choose again.", 409);
    return { seatId: id, label: x.label };
  });
  return { lines, seats };
}

/* ---------- after booking ---------- */

async function ownBookingRow(user: User, ref: string) {
  const [row] = await db.select().from(s.bookings).where(and(eq(s.bookings.ref, ref), eq(s.bookings.userId, user.id)));
  return row;
}

export type ProofInput = { file: File | null; sender: string; bank: string; amount: string; date: string; time: string; note: string };

/** Stores the customer's transfer screenshot. The booking moves to "under review"; it never becomes paid from here. */
export async function submitProof(user: User, ref: string, input: ProofInput): Promise<Outcome<Booking>> {
  await releaseExpired();
  const row = await ownBookingRow(user, ref);
  if (!row) return fail(404, "We can't find that booking.");
  const status = effectiveStatus({ status: row.status, payByIso: row.payBy?.toISOString() }, Date.now());
  if (!customerCan.uploadProof({ status } as Booking)) {
    return fail(409, status === "expired" ? "The payment window for this booking has closed." : "This booking doesn't need a payment proof.");
  }

  const errors: Record<string, string> = {};
  const sender = input.sender.trim().replace(/\s+/g, " ");
  if (!sender || sender.length > 120) errors.sender = "Enter the name on the sending account.";
  const file = input.file;
  let bytes: Uint8Array | undefined;
  let kind: ReturnType<typeof sniff>;
  if (!file || file.size === 0) errors.file = "Add a screenshot of your transfer.";
  else if (file.size > MAX_UPLOAD_BYTES) errors.file = "That file is larger than 10 MB.";
  else {
    bytes = new Uint8Array(await file.arrayBuffer());
    kind = sniff(bytes);
    if (!kind) errors.file = "Use a JPG, PNG or PDF file.";
  }
  if (Object.keys(errors).length || !bytes || !kind || !file) return fail(400, "Please check the highlighted details.", errors);

  const filePath = await saveUpload(`proofs/${row.ref}`, bytes, kind);
  const clip = (v: string, n: number) => v.trim().slice(0, n) || undefined;
  await db.transaction(async (tx) => {
    await tx.insert(s.paymentProofs).values({
      bookingId: row.id,
      filePath,
      fileName: (file.name || `receipt.${kind.ext}`).replace(/[\\/\r\n]/g, "_").slice(0, 160),
      sizeBytes: bytes.byteLength,
      sender,
      bank: clip(input.bank, 80) ?? null,
      details: { amount: clip(input.amount, 40), date: clip(input.date, 20), time: clip(input.time, 20), note: clip(input.note, 1000) },
    });
    await tx
      .update(s.bookings)
      .set({ status: "under_review", rejectionNote: null, statusNote: "Proof received · usually checked within 2–6 hours" })
      .where(eq(s.bookings.id, row.id));
  });
  const [booking] = await loadBookings(eq(s.bookings.id, row.id));
  return { ok: true, value: publicBooking(booking!) };
}

/** Cancels a booking that hasn't been paid for. Its seats and tickets are free again straight away. */
export async function cancelBooking(user: User, ref: string): Promise<Outcome<Booking>> {
  await releaseExpired();
  const row = await ownBookingRow(user, ref);
  if (!row) return fail(404, "We can't find that booking.");
  if (!customerCan.cancel({ status: row.status } as Booking)) return fail(409, "This booking can't be cancelled here. Contact support if you need help.");
  await db.transaction(async (tx) => {
    await tx.update(s.bookings).set({ status: "cancelled", cancelledAt: new Date() }).where(eq(s.bookings.id, row.id));
    await tx.delete(s.seatHolds).where(eq(s.seatHolds.bookingId, row.id));
  });
  refreshEvents();
  const [booking] = await loadBookings(eq(s.bookings.id, row.id));
  return { ok: true, value: publicBooking(booking!) };
}

/* ---------- staff ---------- */

/** Admins manage every event; an organizer's owners and managers manage that organizer's events. Door staff don't. */
export async function canManageEvent(user: User, eventId: number | null): Promise<boolean> {
  if (user.roles.includes("admin")) return true;
  if (!eventId) return false;
  const [row] = await db
    .select({ role: s.organizerMembers.role })
    .from(s.events)
    .innerJoin(s.organizerMembers, eq(s.organizerMembers.organizerId, s.events.organizerId))
    .where(and(eq(s.events.id, eventId), eq(s.organizerMembers.userId, user.id), inArray(s.organizerMembers.role, ["owner", "manager"])));
  return !!row;
}

/**
 * Confirms or rejects a payment that is under review. Confirming is what makes QR tickets appear. A rejected booking
 * gets at least a full payment window to send the rest, so a late rejection doesn't expire it on the spot.
 */
export async function reviewPayment(user: User, ref: string, decision: "confirm" | "reject", reason: string): Promise<Outcome<{ status: BookingStatus }>> {
  const [row] = await db.select().from(s.bookings).where(eq(s.bookings.ref, ref));
  if (!row || !(await canManageEvent(user, row.eventId))) return fail(404, "We can't find that booking.");
  if (row.status !== "under_review") return fail(409, "Only payments under review can be confirmed or rejected.");
  if (decision === "confirm") {
    await db
      .update(s.bookings)
      .set({ status: "confirmed", verifiedAt: new Date(), verifiedBy: user.id, statusNote: null, rejectionNote: null })
      .where(and(eq(s.bookings.id, row.id), eq(s.bookings.status, "under_review")));
    return { ok: true, value: { status: "confirmed" } };
  }
  const note = reason.trim();
  if (!note || note.length > 1000) return fail(400, "Tell the customer what was wrong.", { reason: "Tell the customer what was wrong." });
  const minPayBy = new Date(Date.now() + paymentRules.holdHours * 3600_000);
  await db
    .update(s.bookings)
    .set({ status: "proof_rejected", rejectionNote: note, statusNote: null, payBy: row.payBy && row.payBy > minPayBy ? row.payBy : minPayBy })
    .where(and(eq(s.bookings.id, row.id), eq(s.bookings.status, "under_review")));
  return { ok: true, value: { status: "proof_rejected" } };
}

/** The latest payment screenshot of a booking, for its owner or the event's staff. */
export async function proofFile(user: User, ref: string): Promise<{ bytes: Buffer; type: string; name: string } | null> {
  const [row] = await db.select().from(s.bookings).where(eq(s.bookings.ref, ref));
  if (!row || (row.userId !== user.id && !(await canManageEvent(user, row.eventId)))) return null;
  const [proof] = await db.select().from(s.paymentProofs).where(eq(s.paymentProofs.bookingId, row.id)).orderBy(desc(s.paymentProofs.uploadedAt), desc(s.paymentProofs.id)).limit(1);
  if (!proof) return null;
  const bytes = await readUpload(proof.filePath);
  return bytes ? { bytes, type: contentTypeOf(proof.filePath), name: proof.fileName } : null;
}
