// Organizer events in the database: the wizard's draft in and out, saving, sending for review, pausing and
// cancelling. Server code only (route handlers).
//
// The organizer's screens keep working with the same `EventDraft` they always had; this file turns it into rows
// (events, ticket_types, seat_charts, seat_sections, seats) and back. What protects customers is checked here:
//   - only an owner or manager of the organizer can touch its events;
//   - a seat someone holds can't be deleted, blocked or left without a section, and a ticket type can't go below
//     what is already sold;
//   - a published event can't be saved into a state that couldn't have been submitted.

import { and, asc, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db, schema as s, type Executor } from "@/db";
import {
  categoryIdOf,
  draftProblems,
  editableBeforeReview,
  eventCategories,
  formatEventDate,
  normalizeDraft,
  type DetectionSettings,
  type EventDraft,
  type LayoutSeat,
  type OrganizerEvent,
  type OrgEventStatus,
  type SeatSection,
} from "@/lib/organizer";
import type { OrganizerProfile } from "@/lib/profile";
import { defaultDetection } from "@/lib/seatDetect";
import { requireUser, type AccountUser } from "./auth";
import { releaseExpired } from "./bookings";
import { activeBooking } from "./events";
import { storeImage } from "./storage";

type User = AccountUser & { id: number };
export type Org = { id: number; slug: string; name: string; role: "owner" | "manager" };
export type Outcome<T> = { ok: true; value: T } | { ok: false; status: number; error: string; problems?: string[] };
const fail = (status: number, error: string, problems?: string[]) => ({ ok: false as const, status, error, problems });

/* ---------- who is asking ---------- */

/** The organizer an account manages (as owner or manager). Door staff don't get into the organizer portal. */
export async function organizerOf(userId: number): Promise<Org | null> {
  const [row] = await db
    .select({ id: s.organizers.id, slug: s.organizers.slug, name: s.organizers.name, role: s.organizerMembers.role })
    .from(s.organizerMembers)
    .innerJoin(s.organizers, eq(s.organizers.id, s.organizerMembers.organizerId))
    // A suspended organizer's people are locked out until an admin reinstates it.
    .where(and(eq(s.organizerMembers.userId, userId), inArray(s.organizerMembers.role, ["owner", "manager"]), eq(s.organizers.status, "active")))
    .orderBy(asc(s.organizers.id))
    .limit(1);
  return row ? { ...row, role: row.role as Org["role"] } : null;
}

/** For route handlers: the signed-in organizer and their organization, or a ready-made error response. */
export async function requireOrganizer(): Promise<{ user: User; org: Org; error?: undefined } | { error: Response; user?: undefined; org?: undefined }> {
  const { user, error } = await requireUser("organizer");
  if (error) return { error };
  const org = await organizerOf(user.id);
  if (!org) return { error: Response.json({ error: "Your account isn't linked to an organizer yet." }, { status: 403 }) };
  return { user, org };
}

/* ---------- small helpers ---------- */

/** A date and a clock time typed in Korea time, as the moment it is. */
const kst = (date: string, time: string): Date | null =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{1,2}:\d{2}$/.test(time) ? new Date(`${date}T${time.padStart(5, "0")}:00+09:00`) : null;

/** The Korea-time date ("2026-12-19") and clock time ("18:30") of a moment. */
function kstParts(d: Date) {
  const iso = new Date(d.getTime() + 9 * 3600_000).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

const categoryLabel = (id: string) => eventCategories.find((c) => categoryIdOf(c) === id) ?? "Culture";

/** "Kandyan Dance Gala 2026" → "kandyan-dance-gala-2026". */
const slugify = (title: string) =>
  title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100) || "event";

const keyOf = (raw: string, fallback: string) =>
  raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || fallback;

function refreshPublic(slug?: string) {
  try {
    // A change to a published event (new time, paused sales) must show on the very next visit.
    revalidateTag("events", { expire: 0 });
    if (slug) revalidateTag(`event:${slug}`, { expire: 0 });
  } catch {
    /* outside a request */
  }
}

/** Statuses customers can see (and so whose page needs refreshing after a change). */
const PUBLIC: OrgEventStatus[] = ["on_sale", "paused", "cancelled", "ended"];

type SeatChartSettings = { detection?: DetectionSettings; sections?: Record<string, Partial<SeatSection>> };

/* ---------- database → the organizer's screens ---------- */

type EventRow = typeof s.events.$inferSelect;

/** Rebuilds the wizard's draft from an event's rows, so the editor opens exactly what was saved. */
export async function draftOf(e: EventRow, exec: Executor = db): Promise<EventDraft> {
  const types = await exec.select().from(s.ticketTypes).where(eq(s.ticketTypes.eventId, e.id)).orderBy(asc(s.ticketTypes.sort), asc(s.ticketTypes.id));
  const [chart] = await exec.select().from(s.seatCharts).where(eq(s.seatCharts.eventId, e.id));
  const sections = chart ? await exec.select().from(s.seatSections).where(eq(s.seatSections.eventId, e.id)).orderBy(asc(s.seatSections.sort)) : [];
  const seats = chart ? await exec.select().from(s.seats).where(eq(s.seats.eventId, e.id)).orderBy(asc(s.seats.id)) : [];
  const settings = (chart?.settings ?? {}) as SeatChartSettings;
  const sectionKey = new Map(sections.map((x) => [x.id, x.key]));
  const when = e.startsAt ? kstParts(e.startsAt) : null;
  const extras = e.extras ?? {};

  return normalizeDraft({
    name: e.title,
    category: categoryLabel(e.category),
    tags: extras.tags ?? "",
    description: e.descriptionHtml ?? "",
    date: when?.date ?? "",
    doorsOpen: e.doorsOpenAt ? kstParts(e.doorsOpenAt).time : "18:00",
    starts: when?.time ?? "19:00",
    venue: e.venue ?? "",
    // The area already holds the full address ("Mapo-gu, Seoul"); the city is only its last part, kept for filters.
    address: extras.address ?? e.area ?? e.city ?? "",
    organizerName: extras.hostName ?? "",
    organizerAbout: e.contact?.about ?? "",
    organizerEmail: e.contact?.email ?? "",
    organizerPhone: e.contact?.phone ?? "",
    organizerLink: e.contact?.link ?? "",
    sellMode: e.sellMode,
    coverName: extras.coverName ?? "",
    coverUrl: e.coverUrl ?? "",
    ticketTypes: types.map((t) => ({
      id: t.key,
      name: t.name,
      price: t.price,
      quantity: t.capacity,
      maxPerOrder: t.maxPerOrder,
      color: t.color ?? "#ece7dc",
      saleNote: t.summary ?? "",
      perks: (t.perks ?? []).join(", "),
      visible: t.visible,
    })),
    seatMap: {
      template: extras.template ?? "",
      sections: sections.map(
        (x): SeatSection => ({ rows: "", seatsPerRow: 0, aisleAfter: 0, numbering: "1 → 16", seatType: "Single", ...settings.sections?.[x.key], id: x.key, name: x.name, color: x.color, price: x.price }),
      ),
      blocked: [],
      accessible: [],
      layout: chart
        ? {
            imageUrl: chart.imageUrl ?? "",
            width: chart.width,
            height: chart.height,
            settings: settings.detection ?? defaultDetection,
            stage: chart.stage ?? undefined,
            seats: seats.map(
              (x): LayoutSeat => ({
                uid: x.key,
                x: x.x,
                y: x.y,
                r: x.r,
                section: x.sectionId ? sectionKey.get(x.sectionId) ?? null : null,
                blocked: x.blocked || undefined,
                accessible: x.accessible || undefined,
                row: x.row,
                num: x.num,
                locked: x.locked || undefined,
              }),
            ),
          }
        : undefined,
    },
    pricingReviewed: extras.pricingReviewed ?? false,
    discounts: { earlyBird: !!extras.discounts?.earlyBird, promoCodes: !!extras.discounts?.promoCodes },
  });
}

/** Sales figures per event: tickets taken, tickets for sale, money from verified bookings, payments waiting. */
async function figures(ids: number[]) {
  const out = new Map<number, { sold: number; capacity: number; revenue: number; pending: number }>();
  for (const id of ids) out.set(id, { sold: 0, capacity: 0, revenue: 0, pending: 0 });
  if (!ids.length) return out;
  const types = await db
    .select({ eventId: s.ticketTypes.eventId, cap: sql<string>`SUM(${s.ticketTypes.capacity})`, elsewhere: sql<string>`SUM(${s.ticketTypes.soldElsewhere})` })
    .from(s.ticketTypes)
    .where(and(inArray(s.ticketTypes.eventId, ids), eq(s.ticketTypes.visible, true)))
    .groupBy(s.ticketTypes.eventId);
  const seats = await db
    .select({ eventId: s.seats.eventId, n: sql<string>`COUNT(*)` })
    .from(s.seats)
    .where(and(inArray(s.seats.eventId, ids), eq(s.seats.blocked, false), sql`${s.seats.sectionId} IS NOT NULL`))
    .groupBy(s.seats.eventId);
  const sold = await db
    .select({ eventId: s.bookings.eventId, n: sql<string>`SUM(${s.bookingLines.qty})` })
    .from(s.bookingLines)
    .innerJoin(s.bookings, eq(s.bookings.id, s.bookingLines.bookingId))
    .where(and(inArray(s.bookings.eventId, ids), activeBooking))
    .groupBy(s.bookings.eventId);
  const money = await db
    .select({
      eventId: s.bookings.eventId,
      revenue: sql<string>`SUM(CASE WHEN ${s.bookings.status} IN ('confirmed','attended') THEN ${s.bookings.total} ELSE 0 END)`,
      pending: sql<string>`SUM(CASE WHEN ${s.bookings.status} = 'under_review' THEN 1 ELSE 0 END)`,
    })
    .from(s.bookings)
    .where(inArray(s.bookings.eventId, ids))
    .groupBy(s.bookings.eventId);
  const modes = await db.select({ id: s.events.id, mode: s.events.sellMode }).from(s.events).where(inArray(s.events.id, ids));
  for (const m of modes) {
    const f = out.get(m.id)!;
    const t = types.find((x) => x.eventId === m.id);
    f.capacity = m.mode === "seats" ? Number(seats.find((x) => x.eventId === m.id)?.n ?? 0) : Number(t?.cap ?? 0);
    f.sold = Number(sold.find((x) => x.eventId === m.id)?.n ?? 0) + (m.mode === "tickets" ? Number(t?.elsewhere ?? 0) : 0);
    const mo = money.find((x) => x.eventId === m.id);
    f.revenue = Number(mo?.revenue ?? 0);
    f.pending = Number(mo?.pending ?? 0);
  }
  return out;
}

async function toOrganizerEvent(e: EventRow, f: { sold: number; capacity: number; revenue: number; pending: number }): Promise<OrganizerEvent> {
  const draft = await draftOf(e);
  const when = e.startsAt ? kstParts(e.startsAt) : null;
  const label = when ? formatEventDate(when.date) : "";
  return {
    id: String(e.id),
    slug: e.publishedAt ? e.slug : undefined,
    title: e.title,
    category: categoryIdOf(e.category),
    dateLabel: label,
    shortDate: label,
    startsAt: when ? `${when.date}T${when.time}:00+09:00` : undefined,
    venue: [e.venue, draft.address].filter(Boolean).join(", ") || undefined,
    ...f,
    status: e.status,
    statusNote: e.statusNote ?? undefined,
    history: await historyOf(e),
    draft,
  };
}

/** The event's story from its own dates and SL Events' recorded decisions about it, newest first. */
async function historyOf(e: EventRow) {
  const stamp = (d: Date) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Seoul" }).format(d);
  const decisions = await db
    .select({ action: s.auditLog.action, at: s.auditLog.at })
    .from(s.auditLog)
    .where(and(eq(s.auditLog.targetType, "event"), eq(s.auditLog.targetId, String(e.id))))
    .orderBy(desc(s.auditLog.at))
    .limit(20);
  const items: { label: string; meta: string; at: number }[] = [
    // Events added before the website existed carry the import date; they can't have been created after their review.
    ...(() => {
      const created = e.submittedAt && e.submittedAt < e.createdAt ? e.submittedAt : e.createdAt;
      return [{ label: "Event created", meta: stamp(created), at: created.getTime() - 1 }];
    })(),
    ...(e.submittedAt ? [{ label: "Sent to SL Events for review", meta: stamp(e.submittedAt), at: e.submittedAt.getTime() }] : []),
    ...decisions.map((d) => ({ label: d.action.replace(` ${e.title}`, ""), meta: `SL Events · ${stamp(d.at)}`, at: d.at.getTime() })),
    ...(e.cancelledAt ? [{ label: "Event cancelled", meta: stamp(e.cancelledAt), at: e.cancelledAt.getTime() }] : []),
  ];
  // Events published before the website kept decisions still show when they went live.
  if (e.publishedAt && !decisions.some((d) => /published/i.test(d.action))) items.push({ label: "Published", meta: stamp(e.publishedAt), at: e.publishedAt.getTime() });
  return items.sort((a, b) => b.at - a.at).map(({ label, meta }) => ({ label, meta }));
}

/** Every event of the organizer, the most recently changed first. */
export async function listOrganizerEvents(org: Org): Promise<OrganizerEvent[]> {
  await releaseExpired();
  const rows = await db.select().from(s.events).where(eq(s.events.organizerId, org.id)).orderBy(desc(s.events.updatedAt), desc(s.events.id));
  const f = await figures(rows.map((r) => r.id));
  return Promise.all(rows.map((r) => toOrganizerEvent(r, f.get(r.id)!)));
}

/** One event, for its organizer, or for an admin (who reviews it). Undefined when it isn't theirs. */
export async function eventForEditor(user: User, id: number): Promise<OrganizerEvent | undefined> {
  const [row] = await db.select().from(s.events).where(eq(s.events.id, id));
  if (!row) return undefined;
  if (!user.roles.includes("admin")) {
    const org = await organizerOf(user.id);
    if (!org || org.id !== row.organizerId) return undefined;
  }
  const f = await figures([row.id]);
  return toOrganizerEvent(row, f.get(row.id)!);
}

/* ---------- the organizer's screens → database ---------- */

class Refused extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly problems?: string[],
  ) {
    super(message);
  }
}

/** Limits on what one draft may contain, so a broken or hostile request can't fill the database. */
function checkSizes(d: EventDraft) {
  const tooLong: [string, string, number][] = [
    ["Event name", d.name, 160],
    ["Tags", d.tags, 200],
    ["Venue", d.venue, 160],
    ["Address", d.address, 200],
    ["Organizer name", d.organizerName ?? "", 120],
    ["About the organizer", d.organizerAbout ?? "", 2000],
    ["Email", d.organizerEmail ?? "", 191],
    ["Phone", d.organizerPhone ?? "", 40],
    ["Link", d.organizerLink ?? "", 255],
    ["Description", d.description, 50_000],
  ];
  for (const [label, value, max] of tooLong) if (value.length > max) throw new Refused(`${label} is too long (${max} characters at most).`);
  if (d.ticketTypes.length > 20) throw new Refused("An event can have up to 20 ticket types.");
  for (const t of d.ticketTypes) {
    if (t.name.length > 80) throw new Refused("Ticket type names can be up to 80 characters.");
    if (!Number.isInteger(t.price) || t.price < 0 || t.price > 10_000_000) throw new Refused(`Check the price of ${t.name || "a ticket type"}.`);
    if (!Number.isInteger(t.quantity) || t.quantity < 0 || t.quantity > 100_000) throw new Refused(`Check the quantity of ${t.name || "a ticket type"}.`);
  }
  const layout = d.seatMap.layout;
  if (d.seatMap.sections.length > 30) throw new Refused("A seat chart can have up to 30 sections.");
  for (const sec of d.seatMap.sections) {
    if (sec.name.length > 80) throw new Refused("Section names can be up to 80 characters.");
    if (!Number.isInteger(sec.price) || sec.price < 0 || sec.price > 10_000_000) throw new Refused(`Check the price of ${sec.name || "a section"}.`);
  }
  if (layout && layout.seats.length > 5000) throw new Refused("A seat chart can have up to 5,000 seats.");
  if (layout && layout.seats.some((x) => !x.uid || x.uid.length > 64 || !Number.isFinite(x.x) || !Number.isFinite(x.y) || !Number.isFinite(x.r) || String(x.row).length > 4)) {
    throw new Refused("The seat chart has a seat that can't be saved. Reload the page and try again.");
  }
}

async function uniqueSlug(exec: Executor, title: string, exceptId?: number) {
  const base = slugify(title);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const [taken] = await exec.select({ id: s.events.id }).from(s.events).where(eq(s.events.slug, candidate));
    if (!taken || taken.id === exceptId) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Ticket types: kept by key, updated, added; a removed type that has sales is hidden instead of deleted. */
async function writeTicketTypes(tx: Executor, eventId: number, d: EventDraft) {
  const existing = await tx.select().from(s.ticketTypes).where(eq(s.ticketTypes.eventId, eventId));
  const booked = await tx
    .select({ typeId: s.bookingLines.ticketTypeId, active: sql<string>`SUM(CASE WHEN ${activeBooking} THEN ${s.bookingLines.qty} ELSE 0 END)`, any: sql<string>`COUNT(*)` })
    .from(s.bookingLines)
    .innerJoin(s.bookings, eq(s.bookings.id, s.bookingLines.bookingId))
    .where(inArray(s.bookingLines.ticketTypeId, existing.length ? existing.map((t) => t.id) : [0]))
    .groupBy(s.bookingLines.ticketTypeId);
  const used = new Map(booked.map((b) => [b.typeId, { active: Number(b.active), any: Number(b.any) }]));

  const seen = new Set<string>();
  for (const [i, t] of d.ticketTypes.entries()) {
    let key = keyOf(t.id || t.name, `type-${i + 1}`);
    while (seen.has(key)) key = `${key}-${i + 1}`;
    seen.add(key);
    const values = {
      name: t.name.trim() || "Ticket",
      price: t.price,
      capacity: t.quantity,
      maxPerOrder: Math.min(10, Math.max(1, Math.round(t.maxPerOrder) || 10)),
      color: /^#[0-9a-f]{3,8}$/i.test(t.color) ? t.color : null,
      summary: t.saleNote.trim().slice(0, 200) || null,
      perks: t.perks
        .split(/[,\n]/)
        .map((p) => p.trim())
        .filter(Boolean)
        .slice(0, 12),
      visible: t.visible,
      sort: i,
    };
    const old = existing.find((x) => x.key === key);
    if (old) {
      const taken = (used.get(old.id)?.active ?? 0) + old.soldElsewhere;
      if (values.capacity < taken) throw new Refused(`${values.name}: ${taken} are already sold, so the quantity can't be lower than that.`, 409);
      await tx.update(s.ticketTypes).set(values).where(eq(s.ticketTypes.id, old.id));
    } else {
      await tx.insert(s.ticketTypes).values({ ...values, eventId, key });
    }
  }
  for (const old of existing) {
    if (seen.has(old.key)) continue;
    if (used.get(old.id)?.any) await tx.update(s.ticketTypes).set({ visible: false }).where(eq(s.ticketTypes.id, old.id));
    else await tx.delete(s.ticketTypes).where(eq(s.ticketTypes.id, old.id));
  }
}

/** The seat chart: sections and seats kept by key. Seats customers hold must stay sellable. */
async function writeSeatChart(tx: Executor, eventId: number, d: EventDraft, imageUrl: string | null) {
  const layout = d.seatMap.layout;
  if (!layout) return;
  const sectionsMeta: SeatChartSettings["sections"] = {};
  for (const sec of d.seatMap.sections) {
    sectionsMeta[sec.id] = { rows: sec.rows, seatsPerRow: sec.seatsPerRow, aisleAfter: sec.aisleAfter, numbering: sec.numbering, seatType: sec.seatType };
  }
  const chartValues = {
    width: Math.max(1, Math.round(layout.width)),
    height: Math.max(1, Math.round(layout.height)),
    imageUrl,
    stage: layout.stage ?? null,
    settings: { detection: layout.settings, sections: sectionsMeta } satisfies SeatChartSettings,
  };
  await tx
    .insert(s.seatCharts)
    .values({ eventId, ...chartValues })
    .onDuplicateKeyUpdate({ set: chartValues });

  // Seats held by bookings that still count must stay on the chart, in a section, and not blocked.
  const held = await tx
    .select({ key: s.seats.key })
    .from(s.seatHolds)
    .innerJoin(s.seats, eq(s.seats.id, s.seatHolds.seatId))
    .where(eq(s.seatHolds.eventId, eventId));
  const sellable = new Set(layout.seats.filter((x) => x.section && !x.blocked).map((x) => x.uid));
  const lost = held.filter((h) => !sellable.has(h.key));
  if (lost.length) {
    throw new Refused(
      `${lost.length} seat${lost.length === 1 ? " is" : "s are"} already booked, so ${lost.length === 1 ? "it" : "they"} can't be deleted, blocked or left without a section. Put ${lost.length === 1 ? "it" : "them"} back and save again.`,
      409,
    );
  }

  // Sections
  const keepSections = d.seatMap.sections.map((x) => keyOf(x.id, "section"));
  for (const [i, sec] of d.seatMap.sections.entries()) {
    const values = { name: sec.name.trim() || "Section", color: /^#[0-9a-f]{3,8}$/i.test(sec.color) ? sec.color : "#ece7dc", price: sec.price, sort: i };
    await tx
      .insert(s.seatSections)
      .values({ eventId, key: keepSections[i]!, ...values })
      .onDuplicateKeyUpdate({ set: values });
  }
  await tx.delete(s.seatSections).where(and(eq(s.seatSections.eventId, eventId), keepSections.length ? notInArray(s.seatSections.key, keepSections) : sql`1 = 1`));
  const sectionRows = await tx.select({ id: s.seatSections.id, key: s.seatSections.key }).from(s.seatSections).where(eq(s.seatSections.eventId, eventId));
  const sectionId = new Map(sectionRows.map((x) => [x.key, x.id]));

  // Seats, a few hundred per statement.
  const rows = layout.seats.map((x) => ({
    eventId,
    key: x.uid,
    sectionId: x.section ? sectionId.get(keyOf(x.section, "section")) ?? null : null,
    row: String(x.row ?? "").slice(0, 4),
    num: Math.max(0, Math.round(x.num) || 0),
    label: `${x.row ?? ""}${x.num ?? ""}`.slice(0, 12),
    x: x.x,
    y: x.y,
    r: x.r,
    accessible: !!x.accessible,
    blocked: !!x.blocked,
    locked: !!x.locked,
  }));
  for (let i = 0; i < rows.length; i += 300) {
    await tx
      .insert(s.seats)
      .values(rows.slice(i, i + 300))
      .onDuplicateKeyUpdate({
        set: {
          sectionId: sql`VALUES(${s.seats.sectionId})`,
          row: sql`VALUES(${s.seats.row})`,
          num: sql`VALUES(${s.seats.num})`,
          label: sql`VALUES(${s.seats.label})`,
          x: sql`VALUES(${s.seats.x})`,
          y: sql`VALUES(${s.seats.y})`,
          r: sql`VALUES(${s.seats.r})`,
          accessible: sql`VALUES(${s.seats.accessible})`,
          blocked: sql`VALUES(${s.seats.blocked})`,
          locked: sql`VALUES(${s.seats.locked})`,
        },
      });
  }
  const keys = rows.map((r) => r.key);
  await tx.delete(s.seats).where(and(eq(s.seats.eventId, eventId), keys.length ? notInArray(s.seats.key, keys) : sql`1 = 1`));
}

/**
 * Creates (`id` null) or saves an event from the wizard's draft. With `submit`, it also goes to SL Events for review,
 * which needs everything filled in. Events that are already published stay published and change straight away.
 */
export async function saveEvent(org: Org, id: number | null, input: unknown, opts: { submit?: boolean } = {}): Promise<Outcome<OrganizerEvent>> {
  const d = normalizeDraft(input);
  try {
    checkSizes(d);
    let row: EventRow | undefined;
    if (id !== null) {
      [row] = await db.select().from(s.events).where(and(eq(s.events.id, id), eq(s.events.organizerId, org.id)));
      if (!row) return fail(404, "We couldn't find that event.");
      if (row.status === "cancelled" || row.status === "ended") return fail(409, "This event is over, so it can't be changed.");
    }
    const status = row?.status ?? "draft";
    const published = !!row && !editableBeforeReview.includes(status) && status !== "in_review";
    const problems = draftProblems(d);
    if ((opts.submit || published) && problems.length) {
      return fail(400, opts.submit ? "Fix these before sending the event for review." : "A published event needs these filled in.", problems);
    }
    if (opts.submit && !["draft", "changes_requested", "in_review"].includes(status)) return fail(409, "This event has already been reviewed.");

    await releaseExpired();
    const eventId = await db.transaction(async (tx) => {
      if (row) {
        const [{ n }] = await tx.select({ n: sql<string>`COUNT(*)` }).from(s.bookings).where(eq(s.bookings.eventId, row.id));
        if (Number(n) > 0 && d.sellMode !== row.sellMode) throw new Refused("This event already has bookings, so it can't switch between tickets and numbered seats.", 409);
      }
      const startsAt = kst(d.date, d.starts);
      const city = d.address.split(",").map((p) => p.trim()).filter(Boolean).pop() ?? null;
      const values = {
        title: d.name.trim() || "Untitled event",
        category: categoryIdOf(d.category),
        sellMode: d.sellMode,
        startsAt,
        doorsOpenAt: kst(d.date, d.doorsOpen),
        venue: d.venue.trim() || null,
        city: city?.slice(0, 60) ?? null,
        area: d.address.trim() || null,
        descriptionHtml: d.description || null,
        contact:
          d.organizerAbout || d.organizerEmail || d.organizerPhone || d.organizerLink
            ? { about: d.organizerAbout || undefined, email: d.organizerEmail || undefined, phone: d.organizerPhone || undefined, link: d.organizerLink || undefined }
            : null,
        extras: { tags: d.tags, address: d.address, hostName: d.organizerName ?? "", coverName: d.coverName, pricingReviewed: d.pricingReviewed, template: d.seatMap.template, discounts: { earlyBird: !!d.discounts?.earlyBird, promoCodes: !!d.discounts?.promoCodes } },
      };

      let eventId = row?.id ?? 0;
      if (!row) {
        [{ id: eventId }] = await tx
          .insert(s.events)
          .values({ ...values, organizerId: org.id, status: "draft", slug: await uniqueSlug(tx, values.title) })
          .$returningId();
      }
      // The page address follows the title until the event is first published; after that links must keep working.
      const slug = row?.publishedAt ? row.slug : await uniqueSlug(tx, values.title, eventId);
      const coverUrl = await storeImage(`covers/${eventId}`, d.coverUrl);
      const planUrl = d.seatMap.layout ? await storeImage(`plans/${eventId}`, d.seatMap.layout.imageUrl) : null;
      await tx
        .update(s.events)
        .set({
          ...values,
          slug,
          coverUrl,
          ...(opts.submit ? { status: "in_review" as const, submittedAt: new Date(), statusNote: null } : {}),
        })
        .where(eq(s.events.id, eventId));

      if (d.sellMode === "tickets") await writeTicketTypes(tx, eventId, d);
      else await writeSeatChart(tx, eventId, d, planUrl);
      return eventId;
    });

    const [saved] = await db.select().from(s.events).where(eq(s.events.id, eventId));
    if (PUBLIC.includes(saved!.status)) refreshPublic(saved!.slug);
    const f = await figures([eventId]);
    return { ok: true, value: await toOrganizerEvent(saved!, f.get(eventId)!) };
  } catch (e) {
    if (e instanceof Refused) return fail(e.status, e.message, e.problems);
    if (e instanceof Error && /picture/i.test(e.message)) return fail(400, e.message);
    throw e;
  }
}

/** Cancels every booking of an event that still counts and frees its seats. Returns how many were cancelled. */
export async function cancelEventBookings(tx: Executor, eventId: number): Promise<number> {
  const [res] = await tx
    .update(s.bookings)
    .set({ status: "cancelled", cancelledAt: new Date(), statusNote: "The event was cancelled." })
    .where(and(eq(s.bookings.eventId, eventId), inArray(s.bookings.status, ["awaiting_payment", "under_review", "proof_rejected", "confirmed"])));
  await tx.delete(s.seatHolds).where(eq(s.seatHolds.eventId, eventId));
  return res.affectedRows;
}

/** What an organizer may do to a whole event: pause or resume ticket sales, or cancel it. */
export async function changeEventStatus(org: Org, id: number, action: "pause" | "resume" | "cancel"): Promise<Outcome<{ status: OrgEventStatus; cancelledBookings?: number }>> {
  const [row] = await db.select().from(s.events).where(and(eq(s.events.id, id), eq(s.events.organizerId, org.id)));
  if (!row) return fail(404, "We couldn't find that event.");
  if (action === "pause") {
    if (row.status !== "on_sale") return fail(409, "Only an event that is on sale can be paused.");
    await db.update(s.events).set({ status: "paused" }).where(eq(s.events.id, id));
    refreshPublic(row.slug);
    return { ok: true, value: { status: "paused" } };
  }
  if (action === "resume") {
    if (row.status !== "paused") return fail(409, "Only a paused event can be resumed.");
    await db.update(s.events).set({ status: "on_sale" }).where(eq(s.events.id, id));
    refreshPublic(row.slug);
    return { ok: true, value: { status: "on_sale" } };
  }
  if (row.status === "cancelled" || row.status === "ended") return fail(409, "This event is already over.");
  const cancelledBookings = await db.transaction(async (tx) => {
    await tx.update(s.events).set({ status: "cancelled", cancelledAt: new Date() }).where(eq(s.events.id, id));
    return cancelEventBookings(tx, id);
  });
  refreshPublic(row.slug);
  return { ok: true, value: { status: "cancelled", cancelledBookings } };
}

/* ---------- the organizer's profile ---------- */

type ProfileSettings = { roleTitle?: string; language?: string; organizerNotifications?: Record<string, boolean> };

const NOTIFY_DEFAULTS = { newBooking: true, paymentProof: true, lowStock: true, dailySummary: false, platformNews: false };

/** The profile page: the person (from their account) and the organization (shared by its team). */
export async function getProfile(user: User, org: Org): Promise<OrganizerProfile> {
  const [u] = await db.select().from(s.users).where(eq(s.users.id, user.id));
  const [o] = await db.select().from(s.organizers).where(eq(s.organizers.id, org.id));
  const settings = (u?.settings ?? {}) as ProfileSettings;
  return {
    fullName: u!.name,
    roleTitle: settings.roleTitle ?? (org.role === "owner" ? "Owner" : "Manager"),
    email: u!.email,
    phone: u!.phone ?? "",
    language: settings.language ?? "English",
    orgName: o!.name,
    orgBio: o!.about ?? "",
    orgEmail: o!.email ?? "",
    orgPhone: o!.phone ?? "",
    orgLink: o!.link ?? "",
    city: o!.city ?? "",
    logoUrl: o!.logoUrl ?? "",
    payout: { bank: o!.payout?.bank ?? "", number: o!.payout?.number ?? "", holder: o!.payout?.holder ?? "" },
    notifications: { ...NOTIFY_DEFAULTS, ...(settings.organizerNotifications ?? {}) },
    verified: o!.status === "active",
    memberSince: new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "Asia/Seoul" }).format(o!.createdAt),
  };
}

/**
 * Saves the profile. The person's own details go on their account; the organization's details are shared by the
 * team. Only the owner can change the payout account, because that is where the money goes.
 */
export async function saveProfile(user: User, org: Org, input: Partial<OrganizerProfile>): Promise<Outcome<OrganizerProfile>> {
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const fullName = str(input.fullName, 120).replace(/\s+/g, " ");
  const orgName = str(input.orgName, 160);
  const orgEmail = str(input.orgEmail, 191).toLowerCase();
  if (!fullName) return fail(400, "Enter your name.");
  if (!orgName) return fail(400, "Your organization needs a name.");
  if (orgEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orgEmail)) return fail(400, "Enter a valid public contact email.");
  const payout = { bank: str(input.payout?.bank, 80), number: str(input.payout?.number, 40), holder: str(input.payout?.holder, 120) };
  if ((payout.number || payout.holder) && (!/^[\d\s-]{8,24}$/.test(payout.number) || !payout.holder)) return fail(400, "Enter the account number and the name on the account.");

  const [current] = await db.select().from(s.organizers).where(eq(s.organizers.id, org.id));
  const payoutChanged = JSON.stringify(current!.payout ?? { bank: "", number: "", holder: "" }) !== JSON.stringify(payout) && (payout.number || current!.payout?.number);
  if (payoutChanged && org.role !== "owner") return fail(403, "Only the organization's owner can change the payout account.");

  let logoUrl: string | null;
  try {
    logoUrl = await storeImage(`logos/${org.id}`, input.logoUrl);
  } catch (e) {
    return fail(400, e instanceof Error ? e.message : "That picture can't be used.");
  }
  const [u] = await db.select({ settings: s.users.settings }).from(s.users).where(eq(s.users.id, user.id));
  const notifications = Object.fromEntries(Object.keys(NOTIFY_DEFAULTS).map((k) => [k, !!input.notifications?.[k as keyof typeof NOTIFY_DEFAULTS]]));
  await db.transaction(async (tx) => {
    await tx
      .update(s.users)
      .set({
        name: fullName,
        phone: str(input.phone, 40) || null,
        settings: { ...((u?.settings ?? {}) as ProfileSettings), roleTitle: str(input.roleTitle, 60), language: str(input.language, 40) || "English", organizerNotifications: notifications },
      })
      .where(eq(s.users.id, user.id));
    await tx
      .update(s.organizers)
      .set({
        name: orgName,
        about: str(input.orgBio, 2000) || null,
        email: orgEmail || null,
        phone: str(input.orgPhone, 40) || null,
        link: str(input.orgLink, 255) || null,
        city: str(input.city, 60) || null,
        logoUrl,
        payout: payout.number ? payout : null,
      })
      .where(eq(s.organizers.id, org.id));
  });
  // The organizer's name appears on its event pages.
  if (orgName !== current!.name) refreshPublic();
  return { ok: true, value: await getProfile(user, org) };
}
