// The admin portal's decisions about events, and the audit log they write. Server code only (route handlers).
//
// Publishing is the step that puts an organizer's event in front of customers: an event the organizer submitted
// ("in_review") becomes "on_sale" only here, and every decision is recorded in audit_log, which nothing edits or deletes.

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { db, schema as s, type Executor } from "@/db";
import type { AdminEvent, AdminEventStatus } from "@/lib/admin";
import { formatEventDate, type OrgEventStatus } from "@/lib/organizer";
import type { AccountUser } from "./auth";
import { releaseExpired } from "./bookings";
import { activeBooking } from "./events";
import { cancelEventBookings } from "./organizer";

type User = AccountUser & { id: number };
export type Outcome<T> = { ok: true; value: T } | { ok: false; status: number; error: string };
const fail = (status: number, error: string) => ({ ok: false as const, status, error });

/* ---------- audit log ---------- */

export type AuditChange = { label: string; from: string; to: string };

/** Adds an entry to the audit log. There is deliberately no function to change or remove one. */
export async function audit(
  exec: Executor,
  user: User,
  entry: { action: string; targetType: string; targetId?: string | number; type: string; changes?: AuditChange[] },
) {
  const agent = (await headers()).get("user-agent") ?? "";
  const device = /iPhone|iPad/.test(agent) ? "iPhone or iPad" : /Android/.test(agent) ? "Android" : /Windows/.test(agent) ? "Windows" : /Mac/.test(agent) ? "Mac" : "Browser";
  await exec.insert(s.auditLog).values({
    actorUserId: user.id,
    actorLabel: user.name,
    action: entry.action.slice(0, 80),
    targetType: entry.targetType,
    targetId: entry.targetId === undefined ? null : String(entry.targetId),
    detail: { type: entry.type, changes: entry.changes ?? [], device },
  });
}

/* ---------- events ---------- */

const ADMIN_STATUS: Record<OrgEventStatus, AdminEventStatus> = {
  on_sale: "live",
  paused: "live",
  in_review: "review",
  draft: "draft",
  changes_requested: "draft",
  unpublished: "unpublished",
  cancelled: "cancelled",
  ended: "ended",
};

const kstWhen = (d: Date | null) => {
  if (!d) return { date: "No date yet", when: "No date yet" };
  const iso = new Date(d.getTime() + 9 * 3600_000).toISOString();
  const time = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", hour: "numeric", minute: "2-digit" }).format(d);
  const date = formatEventDate(iso.slice(0, 10));
  return { date: date.replace(/^\w+, /, ""), when: `${date} · ${time}` };
};

/** Every event on the platform, as the admin's events page shows it. */
export async function listAdminEvents(): Promise<AdminEvent[]> {
  await releaseExpired();
  const rows = await db
    .select({ e: s.events, organizer: s.organizers.name })
    .from(s.events)
    .innerJoin(s.organizers, eq(s.organizers.id, s.events.organizerId))
    .orderBy(desc(s.events.updatedAt), desc(s.events.id));
  const ids = rows.map((r) => r.e.id);
  if (!ids.length) return [];

  const types = await db.select().from(s.ticketTypes).where(inArray(s.ticketTypes.eventId, ids)).orderBy(asc(s.ticketTypes.sort));
  const sections = await db.select().from(s.seatSections).where(inArray(s.seatSections.eventId, ids)).orderBy(asc(s.seatSections.sort));
  const typeSold = await db
    .select({ id: s.bookingLines.ticketTypeId, n: sql<string>`SUM(${s.bookingLines.qty})` })
    .from(s.bookingLines)
    .innerJoin(s.bookings, eq(s.bookings.id, s.bookingLines.bookingId))
    .where(and(inArray(s.bookings.eventId, ids), activeBooking))
    .groupBy(s.bookingLines.ticketTypeId);
  const seatCap = await db
    .select({ id: s.seats.sectionId, n: sql<string>`COUNT(*)` })
    .from(s.seats)
    .where(and(inArray(s.seats.eventId, ids), eq(s.seats.blocked, false)))
    .groupBy(s.seats.sectionId);
  const seatSold = await db
    .select({ id: s.seats.sectionId, n: sql<string>`COUNT(*)` })
    .from(s.seatHolds)
    .innerJoin(s.seats, eq(s.seats.id, s.seatHolds.seatId))
    .where(inArray(s.seatHolds.eventId, ids))
    .groupBy(s.seats.sectionId);
  const held = await db
    .select({ eventId: s.bookings.eventId, n: sql<string>`SUM(${s.bookingLines.qty})` })
    .from(s.bookingLines)
    .innerJoin(s.bookings, eq(s.bookings.id, s.bookingLines.bookingId))
    .where(and(inArray(s.bookings.eventId, ids), inArray(s.bookings.status, ["awaiting_payment", "proof_rejected", "under_review"]), activeBooking))
    .groupBy(s.bookings.eventId);
  const num = (list: { id: number | null; n: string }[], id: number) => Number(list.find((x) => x.id === id)?.n ?? 0);

  return rows.map(({ e, organizer }): AdminEvent => {
    const inventory =
      e.sellMode === "seats"
        ? sections.filter((x) => x.eventId === e.id).map((x) => ({ name: x.name, price: x.price, sold: num(seatSold, x.id), capacity: num(seatCap, x.id) }))
        : types
            .filter((t) => t.eventId === e.id && t.visible)
            .map((t) => ({ name: t.name, price: t.price, sold: Math.min(t.capacity, t.soldElsewhere + num(typeSold, t.id)), capacity: t.capacity }));
    const { date, when } = kstWhen(e.startsAt);
    return {
      id: String(e.id),
      title: e.title,
      organizer,
      date,
      status: ADMIN_STATUS[e.status],
      sold: inventory.reduce((n, t) => n + t.sold, 0),
      capacity: inventory.reduce((n, t) => n + t.capacity, 0),
      category: e.category,
      tag: e.status === "paused" ? "Sales paused" : e.status === "changes_requested" ? "Changes requested" : undefined,
      when,
      venue: [e.venue, e.city].filter(Boolean).join(", ") || "Venue not set",
      slug: e.publishedAt && ["on_sale", "paused", "cancelled", "ended"].includes(e.status) ? e.slug : undefined,
      inventory,
      held: Number(held.find((h) => h.eventId === e.id)?.n ?? 0),
      statusNote: e.statusNote ?? undefined,
    };
  });
}

export type EventDecision = "approve" | "changes" | "unpublish" | "republish" | "cancel" | "rename";

const LABEL: Record<OrgEventStatus, string> = {
  draft: "Draft",
  in_review: "For review",
  changes_requested: "Changes requested",
  on_sale: "Live",
  paused: "Live (sales paused)",
  unpublished: "Unpublished",
  cancelled: "Cancelled",
  ended: "Ended",
};

/** Carries out an admin's decision about an event. Reasons are shown to the organizer and kept in the audit log. */
export async function decideEvent(user: User, id: number, decision: EventDecision, text: string): Promise<Outcome<{ status: AdminEventStatus; cancelledBookings?: number }>> {
  const [e] = await db.select().from(s.events).where(eq(s.events.id, id));
  if (!e) return fail(404, "We couldn't find that event.");
  const note = text.trim();
  const needsNote = decision === "changes" || decision === "unpublish" || decision === "cancel";
  if (needsNote && !note) return fail(400, "Give a reason first. The organizer sees it.");
  if (note.length > 1000) return fail(400, "Keep it under 1,000 characters.");

  const allowed: Record<EventDecision, OrgEventStatus[]> = {
    approve: ["in_review"],
    changes: ["in_review"],
    unpublish: ["on_sale", "paused"],
    republish: ["unpublished"],
    cancel: ["draft", "in_review", "changes_requested", "on_sale", "paused", "unpublished"],
    rename: ["draft", "in_review", "changes_requested", "on_sale", "paused", "unpublished", "cancelled", "ended"],
  };
  if (!allowed[decision].includes(e.status)) return fail(409, `That can't be done while the event is "${LABEL[e.status]}".`);

  if (decision === "rename") {
    if (!note) return fail(400, "The title can't be empty.");
    if (note.length > 160) return fail(400, "Keep the title under 160 characters.");
    await db.transaction(async (tx) => {
      await tx.update(s.events).set({ title: note }).where(eq(s.events.id, id));
      await audit(tx, user, { type: "content", action: `Edited the title of ${e.title}`, targetType: "event", targetId: id, changes: [{ label: "Title", from: e.title, to: note }] });
    });
    refresh(e.slug);
    return { ok: true, value: { status: ADMIN_STATUS[e.status] } };
  }

  const next: OrgEventStatus = { approve: "on_sale", changes: "changes_requested", unpublish: "unpublished", republish: "on_sale", cancel: "cancelled" }[decision] as OrgEventStatus;
  const verb = { approve: "Approved and published", changes: "Asked for changes to", unpublish: "Unpublished", republish: "Published again", cancel: "Cancelled" }[decision];
  const cancelledBookings = await db.transaction(async (tx) => {
    await tx
      .update(s.events)
      .set({
        status: next,
        statusNote: needsNote ? note : null,
        ...(next === "on_sale" && !e.publishedAt ? { publishedAt: new Date() } : {}),
        ...(next === "cancelled" ? { cancelledAt: new Date() } : {}),
      })
      .where(eq(s.events.id, id));
    const cancelled = next === "cancelled" ? await cancelEventBookings(tx, id) : undefined;
    await audit(tx, user, {
      type: "decision",
      action: `${verb} ${e.title}`,
      targetType: "event",
      targetId: id,
      changes: [
        { label: "Status", from: LABEL[e.status], to: LABEL[next] },
        ...(note ? [{ label: decision === "changes" ? "Note to organizer" : "Reason", from: "—", to: note }] : []),
        ...(cancelled ? [{ label: "Bookings cancelled", from: "—", to: String(cancelled) }] : []),
      ],
    });
    return cancelled;
  });
  refresh(e.slug);
  return { ok: true, value: { status: ADMIN_STATUS[next], cancelledBookings } };
}

function refresh(slug: string) {
  try {
    // Publishing, hiding and cancelling must show on the very next visit, not after one stale view.
    revalidateTag("events", { expire: 0 });
    revalidateTag(`event:${slug}`, { expire: 0 });
  } catch {
    /* outside a request */
  }
}
