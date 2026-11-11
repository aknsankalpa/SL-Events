// Event-day operations for one event: door staff, the organizer's event-day settings, entry statistics and the
// activity feed. Server code only (route handlers).
//
// Door staff are real accounts linked to the event (event_staff). Someone new gets an account without a password and
// sets one with "Forgot password". Their access window, door and role are kept here; checking tickets in
// (server/staff.ts) honours the window and a paused member.

import { and, asc, count, desc, eq, inArray, max, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { defaultSettings, type ActivityItem, type EntryStats, type OpsSettings, type StaffMember, type StaffRole } from "@/lib/operations";
import type { AccountUser } from "./auth";
import { normEmail, validEmail } from "./auth";
import { canManageEvent } from "./bookings";

type User = AccountUser & { id: number };
export type Outcome<T> = { ok: true; value: T } | { ok: false; status: number; error: string };
const fail = (status: number, error: string) => ({ ok: false as const, status, error });

type StoredActivity = { text: string; kind: ActivityItem["kind"]; at: string };
type StoredOps = { settings?: Partial<OpsSettings>; activity?: StoredActivity[] };

const ROLE_LABEL: Record<StaffRole, string> = { gate_lead: "Gate lead", scanner: "Scanner", support: "Help desk" };

/* ---------- Korea time ---------- */

const kstParts = (d: Date) => {
  const iso = new Date(d.getTime() + 9 * 3600_000).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
};
const clock = (d: Date) => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Seoul" }).format(d);
function when(d: Date) {
  const today = kstParts(new Date()).date;
  return kstParts(d).date === today ? clock(d) : `${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Seoul" }).format(d)}, ${clock(d)}`;
}
/** "17:30" on the event's day in Korea, or null when the event has no date. */
const onEventDay = (startsAt: Date | null, hhmm: string) => (startsAt && /^\d{1,2}:\d{2}$/.test(hhmm) ? new Date(`${kstParts(startsAt).date}T${hhmm.padStart(5, "0")}:00+09:00`) : null);

/** The organizer's settings for the event, filled in with the defaults. */
export const settingsOf = (operations: unknown): OpsSettings => ({ ...defaultSettings, ...(((operations ?? {}) as StoredOps).settings ?? {}) });

async function managed(user: User, eventId: number) {
  const [e] = await db.select().from(s.events).where(eq(s.events.id, eventId));
  if (!e || !(await canManageEvent(user, e.id))) return undefined;
  return e;
}

async function log(eventId: number, kind: ActivityItem["kind"], text: string) {
  const [e] = await db.select({ operations: s.events.operations }).from(s.events).where(eq(s.events.id, eventId));
  const ops = (e?.operations ?? {}) as StoredOps;
  const activity = [{ text, kind, at: new Date().toISOString() }, ...(ops.activity ?? [])].slice(0, 40);
  await db.update(s.events).set({ operations: { ...ops, activity } }).where(eq(s.events.id, eventId));
}

/* ---------- reading ---------- */

export async function getOperations(user: User, eventId: number) {
  const e = await managed(user, eventId);
  if (!e) return undefined;
  const ops = (e.operations ?? {}) as StoredOps;

  const staffRows = await db
    .select({ m: s.eventStaff, name: s.users.name, email: s.users.email, hasPassword: sql<number>`${s.users.passwordHash} IS NOT NULL` })
    .from(s.eventStaff)
    .innerJoin(s.users, eq(s.users.id, s.eventStaff.userId))
    .where(eq(s.eventStaff.eventId, eventId))
    .orderBy(asc(s.users.name));
  const scansBy = await db
    .select({ userId: s.scanLog.staffUserId, n: count(), last: max(s.scanLog.at) })
    .from(s.scanLog)
    .where(eq(s.scanLog.eventId, eventId))
    .groupBy(s.scanLog.staffUserId);
  const staff = staffRows.map(({ m, name, email, hasPassword }): StaffMember => {
    const sc = scansBy.find((x) => x.userId === m.userId);
    return {
      id: String(m.userId),
      name,
      contact: email,
      role: m.role,
      gate: m.role === "support" ? null : m.gate,
      status: m.suspended ? "suspended" : Number(hasPassword) ? "active" : "invited",
      scans: sc?.n ?? 0,
      lastScan: sc?.last ? clock(new Date(sc.last)) : undefined,
      accessFrom: m.accessFrom ? kstParts(m.accessFrom).time : "",
      accessUntil: m.accessUntil ? kstParts(m.accessUntil).time : "",
    };
  });

  // The feed: the latest scans plus staff and settings changes, newest first.
  const scans = await db
    .select({ outcome: s.scanLog.outcome, at: s.scanLog.at, gate: s.scanLog.gate, code: s.scanLog.code, holder: s.tickets.holderName, ticket: s.tickets.ticketName, staff: s.users.name })
    .from(s.scanLog)
    .leftJoin(s.tickets, eq(s.tickets.id, s.scanLog.ticketId))
    .leftJoin(s.users, eq(s.users.id, s.scanLog.staffUserId))
    .where(eq(s.scanLog.eventId, eventId))
    .orderBy(desc(s.scanLog.at))
    .limit(20);
  const scanText = (x: (typeof scans)[number]) => {
    const where = x.gate ? ` at ${x.gate}` : "";
    const by = x.staff ? ` by ${x.staff}` : "";
    if (x.outcome === "admitted") return `${x.holder ?? "A guest"}${x.ticket ? ` (${x.ticket})` : ""} admitted${where}${by}`;
    const why = { already_used: "was already used", not_found: "doesn't exist", wrong_event: "is for another event", not_paid: "isn't paid", cancelled: "was cancelled", too_early: "came before check-in opened", too_late: "came after the late cut-off" }[x.outcome];
    return `Ticket ${x.code} ${why}. Refused${where}${by}`;
  };
  const activity: ActivityItem[] = [
    ...scans.map((x, i) => ({ id: `scan-${i}`, kind: "scan" as const, text: scanText(x), at: x.at.getTime() })),
    ...(ops.activity ?? []).map((a, i) => ({ id: `ops-${i}`, kind: a.kind, text: a.text, at: new Date(a.at).getTime() })),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, 20)
    .map(({ at, ...a }) => ({ ...a, time: when(new Date(at)) }));

  return { staff, settings: settingsOf(e.operations), activity, stats: await entryStats(eventId) };
}

/** Entry numbers from the tickets and the scans at the door. */
async function entryStats(eventId: number): Promise<EntryStats> {
  const tickets = await db
    .select({ name: s.tickets.ticketName, scannedAt: s.tickets.scannedAt })
    .from(s.tickets)
    .innerJoin(s.bookings, eq(s.bookings.id, s.tickets.bookingId))
    .where(and(eq(s.tickets.eventId, eventId), inArray(s.bookings.status, ["confirmed", "attended"])));
  const refused = await db
    .select({ outcome: s.scanLog.outcome, n: count() })
    .from(s.scanLog)
    .where(and(eq(s.scanLog.eventId, eventId), sql`${s.scanLog.outcome} <> 'admitted'`))
    .groupBy(s.scanLog.outcome);
  const admitted = await db
    .select({ gate: s.scanLog.gate, at: s.scanLog.at })
    .from(s.scanLog)
    .where(and(eq(s.scanLog.eventId, eventId), eq(s.scanLog.outcome, "admitted")))
    .orderBy(asc(s.scanLog.at));

  const byTypeMap = new Map<string, { in: number; of: number }>();
  for (const t of tickets) {
    const row = byTypeMap.get(t.name) ?? { in: 0, of: 0 };
    row.of++;
    if (t.scannedAt) row.in++;
    byTypeMap.set(t.name, row);
  }
  const byGateMap = new Map<string, number>();
  for (const a of admitted) byGateMap.set(a.gate ?? "Not recorded", (byGateMap.get(a.gate ?? "Not recorded") ?? 0) + 1);

  // 15-minute slots from the first admission.
  const timeline: { label: string; value: number }[] = [];
  if (admitted.length) {
    const start = Math.floor(admitted[0]!.at.getTime() / 900_000) * 900_000;
    for (const a of admitted) {
      const slot = Math.floor((a.at.getTime() - start) / 900_000);
      if (slot > 95) continue;
      while (timeline.length <= slot) timeline.push({ label: clock(new Date(start + timeline.length * 900_000)).replace(/ [AP]M$/, ""), value: 0 });
      timeline[slot]!.value++;
    }
  }
  const n = (o: string) => refused.find((r) => r.outcome === o)?.n ?? 0;
  return {
    expected: tickets.length,
    checkedIn: tickets.filter((t) => t.scannedAt).length,
    rejected: { already_used: n("already_used"), wrong_event: n("wrong_event"), not_found: n("not_found") + n("not_paid") + n("cancelled") + n("too_early") + n("too_late") },
    byType: [...byTypeMap].map(([label, v]) => ({ label, ...v })),
    byGate: [...byGateMap].map(([label, v]) => ({ label, in: v })),
    timeline,
    live: admitted.length > 0,
  };
}

/* ---------- changing ---------- */

const HHMM = /^([01]?\d|2[0-3]):[0-5]\d$/;

export async function saveOpsSettings(user: User, eventId: number, input: Partial<OpsSettings>): Promise<Outcome<OpsSettings>> {
  const e = await managed(user, eventId);
  if (!e) return fail(404, "We couldn't find that event.");
  const next: OpsSettings = {
    checkInOpens: typeof input.checkInOpens === "string" && HHMM.test(input.checkInOpens) ? input.checkInOpens : defaultSettings.checkInOpens,
    lateCutoff: input.lateCutoff === "none" || (typeof input.lateCutoff === "string" && HHMM.test(input.lateCutoff)) ? input.lateCutoff! : "none",
    manualCheckIn: input.manualCheckIn !== false,
    allowReentry: input.allowReentry === true,
    showGuestNames: input.showGuestNames !== false,
    studentIdCheck: input.studentIdCheck !== false,
    soundFeedback: input.soundFeedback !== false,
    scannerLinkExpiry: (["midnight", "dawn", "event_end"] as const).find((x) => x === input.scannerLinkExpiry) ?? "midnight",
    capacityAlertPct: Math.min(100, Math.max(10, Math.round(Number(input.capacityAlertPct)) || 90)),
  };
  const ops = (e.operations ?? {}) as StoredOps;
  await db.update(s.events).set({ operations: { ...ops, settings: next } }).where(eq(s.events.id, eventId));
  await log(eventId, "setting", `Event-day settings were updated by ${user.name}`);
  return { ok: true, value: next };
}

type StaffInput = { name?: string; contact?: string; role?: StaffRole; gate?: string | null; accessFrom?: string; accessUntil?: string; status?: StaffMember["status"] };

function staffValues(e: typeof s.events.$inferSelect, input: StaffInput) {
  const role = (["gate_lead", "scanner", "support"] as const).find((r) => r === input.role) ?? "scanner";
  const from = typeof input.accessFrom === "string" && HHMM.test(input.accessFrom) ? onEventDay(e.startsAt, input.accessFrom) : null;
  let until = typeof input.accessUntil === "string" && HHMM.test(input.accessUntil) ? onEventDay(e.startsAt, input.accessUntil) : null;
  // A window that ends "before" it starts runs past midnight.
  if (from && until && until <= from) until = new Date(until.getTime() + 86_400_000);
  return { role, gate: role === "support" ? null : (input.gate ?? "").trim().slice(0, 60) || null, accessFrom: from, accessUntil: until };
}

/** Adds someone to the door team by email. A new email gets an account; they set a password with "Forgot password". */
export async function addStaff(user: User, eventId: number, input: StaffInput): Promise<Outcome<{ id: string; created: boolean }>> {
  const e = await managed(user, eventId);
  if (!e) return fail(404, "We couldn't find that event.");
  const name = (input.name ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const email = normEmail(input.contact ?? "");
  if (!name) return fail(400, "Enter their name.");
  if (!validEmail(email)) return fail(400, "Enter their email address. They log in with it to scan tickets.");
  let created = false;
  const id = await db.transaction(async (tx) => {
    let [account] = await tx.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, email));
    if (!account) {
      [account] = await tx.insert(s.users).values({ email, name }).$returningId();
      await tx.insert(s.userRoles).values({ userId: account!.id, role: "customer" });
      created = true;
    }
    const [already] = await tx.select().from(s.eventStaff).where(and(eq(s.eventStaff.eventId, eventId), eq(s.eventStaff.userId, account!.id)));
    if (already) return null;
    const [hasRole] = await tx.select().from(s.userRoles).where(and(eq(s.userRoles.userId, account!.id), eq(s.userRoles.role, "staff")));
    if (!hasRole) await tx.insert(s.userRoles).values({ userId: account!.id, role: "staff" });
    await tx.insert(s.eventStaff).values({ eventId, userId: account!.id, ...staffValues(e, input) });
    return account!.id;
  });
  if (id === null) return fail(409, "They're already on the door team for this event.");
  await log(eventId, "staff", `${name} was added as ${ROLE_LABEL[staffValues(e, input).role]}`);
  return { ok: true, value: { id: String(id), created } };
}

export async function updateStaff(user: User, eventId: number, userId: number, input: StaffInput): Promise<Outcome<{ ok: true }>> {
  const e = await managed(user, eventId);
  if (!e) return fail(404, "We couldn't find that event.");
  const [m] = await db
    .select({ name: s.users.name })
    .from(s.eventStaff)
    .innerJoin(s.users, eq(s.users.id, s.eventStaff.userId))
    .where(and(eq(s.eventStaff.eventId, eventId), eq(s.eventStaff.userId, userId)));
  if (!m) return fail(404, "They aren't on this event's door team.");
  await db
    .update(s.eventStaff)
    .set({ ...staffValues(e, input), suspended: input.status === "suspended" })
    .where(and(eq(s.eventStaff.eventId, eventId), eq(s.eventStaff.userId, userId)));
  await log(eventId, "staff", input.status === "suspended" ? `${m.name}'s access was paused` : `${m.name}'s access was updated`);
  return { ok: true, value: { ok: true } };
}

export async function removeStaff(user: User, eventId: number, userId: number): Promise<Outcome<{ ok: true }>> {
  const e = await managed(user, eventId);
  if (!e) return fail(404, "We couldn't find that event.");
  const [m] = await db
    .select({ name: s.users.name })
    .from(s.eventStaff)
    .innerJoin(s.users, eq(s.users.id, s.eventStaff.userId))
    .where(and(eq(s.eventStaff.eventId, eventId), eq(s.eventStaff.userId, userId)));
  if (!m) return fail(404, "They aren't on this event's door team.");
  await db.transaction(async (tx) => {
    await tx.delete(s.eventStaff).where(and(eq(s.eventStaff.eventId, eventId), eq(s.eventStaff.userId, userId)));
    // Door staff of no event any more lose the door-staff role.
    const [{ n }] = await tx.select({ n: count() }).from(s.eventStaff).where(eq(s.eventStaff.userId, userId));
    if (n === 0) await tx.delete(s.userRoles).where(and(eq(s.userRoles.userId, userId), eq(s.userRoles.role, "staff")));
  });
  await log(eventId, "staff", `${m.name} was removed. Their access has ended`);
  return { ok: true, value: { ok: true } };
}
