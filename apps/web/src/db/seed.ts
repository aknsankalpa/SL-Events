/**
 * Fills the database with the demo data the website shows today (events, seat chart, organizers, bookings,
 * applications), so the site looks the same once it reads from the database.
 *
 *   npm run db:seed -- --dry-run     build every row and check it, without touching any database
 *   npm run db:seed -- --reset       empty the tables, then insert the demo data
 *
 * Safety: --reset refuses to run unless the database name contains "dev" (pass --force for a deliberate exception),
 * so it can never wipe the live database by accident.
 */
import { canIssueTickets, effectiveStatus, seedBookings, type Booking } from "../lib/bookings";
import { events as demoEvents, paymentAccount } from "../lib/data";
import { applicationStore } from "../lib/organizerApplications";
import { organizerProfiles } from "../lib/organizers";
import { holdsSeats } from "../lib/seating";
import { ticketsFor } from "../lib/bookings";
import * as s from "./schema";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

/* ---------------------------------------------------------------------------------------------------------- */
/* Build every row in memory, with fixed ids, so foreign keys line up and the run is repeatable.               */
/* ---------------------------------------------------------------------------------------------------------- */

type Rows = { [K in keyof typeof tables]: (typeof tables)[K]["$inferInsert"][] };
const tables = {
  users: s.users,
  userRoles: s.userRoles,
  organizers: s.organizers,
  organizerMembers: s.organizerMembers,
  organizerApplications: s.organizerApplications,
  events: s.events,
  ticketTypes: s.ticketTypes,
  seatCharts: s.seatCharts,
  seatSections: s.seatSections,
  seats: s.seats,
  bookings: s.bookings,
  bookingLines: s.bookingLines,
  tickets: s.tickets,
  seatHolds: s.seatHolds,
  paymentProofs: s.paymentProofs,
  eventStaff: s.eventStaff,
  siteSettings: s.siteSettings,
};
const rows: Rows = Object.fromEntries(Object.keys(tables).map((k) => [k, []])) as unknown as Rows;
const counter = new Map<string, number>();
const nextId = (table: string) => {
  const n = (counter.get(table) ?? 0) + 1;
  counter.set(table, n);
  return n;
};

const escapeHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** "5:30 PM" on the event's day, in Korea time. */
function kstTime(startsAt: string, clock: string): Date | null {
  const m = clock.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!startsAt || !m) return null;
  let h = Number(m[1]) % 12;
  if (m[3]!.toUpperCase() === "PM") h += 12;
  return new Date(`${startsAt.slice(0, 10)}T${String(h).padStart(2, "0")}:${m[2]}:00+09:00`);
}

/** The same code as bookings.ts uses, for tickets that aren't valid yet (unpaid bookings still get their codes). */
function codeFor(ref: string, index: number): string {
  let h = 2166136261;
  for (const c of `${ref}:${index}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const out = h.toString(36).toUpperCase().padStart(8, "0").slice(-8);
  return `SLE-${out.slice(0, 4)}-${out.slice(4)}`;
}

// ---- people ----
const userIdByEmail = new Map<string, number>();
function addUser(email: string, name: string, userRoles: (typeof s.roles)[number][], verified = true) {
  const key = email.toLowerCase();
  let id = userIdByEmail.get(key);
  if (!id) {
    id = nextId("users");
    userIdByEmail.set(key, id);
    rows.users.push({ id, email: key, name, emailVerifiedAt: verified ? new Date("2026-09-01T00:00:00Z") : null });
  }
  for (const role of userRoles) if (!rows.userRoles.some((r) => r.userId === id && r.role === role)) rows.userRoles.push({ userId: id, role });
  return id;
}

addUser("kasun@example.com", "Kasun Perera", ["customer"]);
const nimal = addUser("nimal@example.com", "Nimal Fernando", ["organizer", "customer"]);
addUser("sanduni@slevents.kr", "Sanduni Perera", ["admin", "customer"]);
const ishara = addUser("ishara@slevents.kr", "Ishara Kumara", ["staff"]);
const nameFromEmail = (email: string) =>
  email
    .split("@")[0]!
    .split(/[._-]+/)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
for (const b of seedBookings) if (!userIdByEmail.has(b.ownerEmail)) addUser(b.ownerEmail, b.attendees[0] || nameFromEmail(b.ownerEmail), ["customer"]);

// ---- organizers ----
const organizerIdByName = new Map<string, number>();
for (const o of organizerProfiles) {
  const id = nextId("organizers");
  organizerIdByName.set(o.name, id);
  rows.organizers.push({ id, slug: o.slug, name: o.name, about: o.about || null, email: o.email ?? null, link: o.link ?? null });
}
const lankaBeats = organizerIdByName.get("Lanka Beats Korea")!;
rows.organizerMembers.push({ organizerId: lankaBeats, userId: nimal, role: "owner" }, { organizerId: lankaBeats, userId: ishara, role: "door_staff" });

// ---- applications ----
for (const a of applicationStore.getServerSnapshot()) {
  rows.organizerApplications.push({
    id: nextId("organizerApplications"),
    ref: a.ref,
    name: a.name,
    email: a.email,
    contact: a.contact || null,
    organization: a.organization,
    kind: a.kind,
    about: a.about,
    link: a.link || null,
    documents: a.documents,
    status: a.status,
    note: a.note ?? null,
    submittedAt: new Date(a.submittedAt),
    organizerId: a.status === "approved" ? organizerIdByName.get(a.organization) ?? null : null,
  });
}

// ---- events, tickets, seat charts ----
const eventIdBySlug = new Map<string, number>();
const typeIdByEventAndName = new Map<string, number>();
const sectionIdByEventAndName = new Map<string, number>();
const seatIdByEventAndKey = new Map<string, number>();

for (const e of demoEvents) {
  const organizerId = organizerIdByName.get(e.organizer);
  if (!organizerId) throw new Error(`No organizer "${e.organizer}" for event ${e.slug}`);
  const id = nextId("events");
  eventIdBySlug.set(e.slug, id);
  const startsAt = e.startsAt ? new Date(e.startsAt) : null;
  rows.events.push({
    id,
    slug: e.slug,
    organizerId,
    title: e.title,
    category: e.category,
    status: "on_sale",
    sellMode: e.seatChart ? "seats" : "tickets",
    startsAt,
    doorsOpenAt: kstTime(e.startsAt, e.doorsOpen),
    venue: e.venue,
    city: e.city,
    area: e.area,
    tagline: e.tagline || null,
    descriptionHtml: e.descriptionHtml ?? e.description.map((p) => `<p>${escapeHtml(p)}</p>`).join(""),
    featured: !!e.featured,
    contact: e.organizerAbout || e.organizerEmail || e.organizerPhone || e.organizerLink
      ? { about: e.organizerAbout, email: e.organizerEmail, phone: e.organizerPhone, link: e.organizerLink }
      : null,
    submittedAt: new Date("2026-09-20T00:00:00Z"),
    publishedAt: new Date("2026-09-21T00:00:00Z"),
  });

  if (e.seatChart) {
    const chart = e.seatChart;
    rows.seatCharts.push({ eventId: id, width: chart.width, height: chart.height, imageUrl: chart.imageUrl ?? null, stage: chart.stage ?? null });
    const sectionIdByKey = new Map<string, number>();
    chart.sections.forEach((sec, i) => {
      const sid = nextId("seatSections");
      sectionIdByKey.set(sec.id, sid);
      sectionIdByEventAndName.set(`${id}|${sec.name}`, sid);
      rows.seatSections.push({ id: sid, eventId: id, key: sec.id, name: sec.name, color: sec.color, price: sec.price, sort: i });
    });
    for (const seat of chart.seats) {
      const seatId = nextId("seats");
      seatIdByEventAndKey.set(`${id}|${seat.id}`, seatId);
      rows.seats.push({
        id: seatId,
        eventId: id,
        key: seat.id,
        sectionId: sectionIdByKey.get(seat.sectionId) ?? null,
        row: seat.row,
        num: seat.num,
        label: seat.label,
        x: seat.x,
        y: seat.y,
        r: seat.r,
        accessible: !!seat.accessible,
        blocked: !!seat.blocked,
        locked: true,
      });
    }
  } else {
    e.ticketTypes.forEach((t, i) => {
      const tid = nextId("ticketTypes");
      typeIdByEventAndName.set(`${id}|${t.name}`, tid);
      rows.ticketTypes.push({
        id: tid,
        eventId: id,
        key: t.id,
        name: t.name,
        price: t.price,
        capacity: t.capacity,
        // The demo's "sold" numbers stand for earlier sales; from now on sales are counted from bookings.
        soldElsewhere: t.sold,
        summary: t.summary ?? null,
        perks: t.perks,
        sort: i,
      });
    });
  }

  // Door staff for Lanka Beats Korea's events.
  if (organizerId === lankaBeats) rows.eventStaff.push({ eventId: id, userId: ishara, gate: "Main door" });
}

// ---- bookings, lines, tickets, seat holds, proofs ----
const bookingStatus = (b: Booking) => b.status;
for (const b of seedBookings) {
  const id = nextId("bookings");
  const userId = userIdByEmail.get(b.ownerEmail.toLowerCase())!;
  const eventId = b.eventSlug ? eventIdBySlug.get(b.eventSlug) ?? null : null;
  rows.bookings.push({
    id,
    ref: b.id,
    userId,
    eventId,
    eventTitle: b.eventTitle,
    eventDateLabel: b.eventDate,
    status: bookingStatus(b),
    fee: b.fee,
    total: b.total,
    paymentMethod: b.paymentMethod === "Bank transfer" ? "bank_transfer" : "none",
    payBy: b.payByIso ? new Date(b.payByIso) : null,
    statusNote: b.statusNote ?? null,
    rejectionNote: b.rejectionNote ?? null,
    verifiedAt: b.verifiedAt ? new Date(b.verifiedAt) : null,
    verifiedBy: b.verifiedAt ? userIdByEmail.get("nimal@example.com")! : null,
    cancelledAt: b.cancelledAt ? new Date(b.cancelledAt) : null,
    createdAt: b.createdIso ? new Date(b.createdIso) : new Date("2026-10-01T00:00:00Z"),
  });

  for (const l of b.lines) {
    rows.bookingLines.push({
      id: nextId("bookingLines"),
      bookingId: id,
      ticketTypeId: eventId ? typeIdByEventAndName.get(`${eventId}|${l.ticketName}`) ?? null : null,
      sectionId: eventId ? sectionIdByEventAndName.get(`${eventId}|${l.ticketName}`) ?? null : null,
      name: l.ticketName,
      qty: l.qty,
      unitPrice: l.unitPrice,
    });
  }

  // One ticket per person, in line order; valid ones keep the codes the website already shows.
  const issued = canIssueTickets(b) ? ticketsFor(b) : [];
  const names = b.lines.flatMap((l) => Array.from({ length: l.qty }, () => l.ticketName));
  names.forEach((ticketName, i) => {
    const seat = b.seats?.[i];
    const seatId = seat && eventId ? seatIdByEventAndKey.get(`${eventId}|${seat.id}`) ?? null : null;
    rows.tickets.push({
      id: nextId("tickets"),
      bookingId: id,
      eventId,
      code: issued[i]?.code ?? codeFor(b.id, i),
      holderName: b.attendees[i] || b.attendees[0] || "Guest",
      ticketName,
      seatId,
      seatLabel: seat?.label ?? null,
      position: i,
      scannedAt: b.status === "attended" ? new Date("2026-06-28T10:00:00Z") : null,
    });
    if (seatId && eventId && holdsSeats(b.status)) rows.seatHolds.push({ eventId, seatId, bookingId: id });
  });

  if (b.proof) {
    rows.paymentProofs.push({
      id: nextId("paymentProofs"),
      bookingId: id,
      filePath: `demo/${b.id}/${b.proof.fileName}`,
      fileName: b.proof.fileName,
      sizeBytes: Math.round(parseFloat(b.proof.sizeLabel) * (/MB/i.test(b.proof.sizeLabel) ? 1024 * 1024 : 1024)) || 0,
      sender: b.proof.sender ?? null,
      bank: b.proof.bank ?? null,
    });
  }
}

// The demo 'sold' numbers already include the demo bookings, which the website now counts on its own: take them out
// of 'sold elsewhere' so the totals stay as the demo showed them.
const now = Date.now();
for (const b of seedBookings) {
  if (!holdsSeats(effectiveStatus(b, now))) continue;
  const eventId = b.eventSlug ? eventIdBySlug.get(b.eventSlug) : undefined;
  for (const l of b.lines) {
    const typeId = eventId ? typeIdByEventAndName.get(`${eventId}|${l.ticketName}`) : undefined;
    const row = typeId ? rows.ticketTypes.find((t) => t.id === typeId) : undefined;
    if (row) row.soldElsewhere = Math.max(0, (row.soldElsewhere ?? 0) - l.qty);
  }
}

// ---- settings ----
rows.siteSettings.push({ key: "payment_account", value: paymentAccount });

/* ---------------------------------------------------------------------------------------------------------- */
/* Checks that would fail in the database too, caught before anything is written.                             */
/* ---------------------------------------------------------------------------------------------------------- */

function assertUnique<T>(label: string, list: T[], key: (r: T) => string) {
  const seen = new Set<string>();
  for (const r of list) {
    const k = key(r);
    if (seen.has(k)) throw new Error(`Duplicate ${label}: ${k}`);
    seen.add(k);
  }
}
assertUnique("user email", rows.users, (r) => r.email);
assertUnique("organizer slug", rows.organizers, (r) => r.slug);
assertUnique("event slug", rows.events, (r) => r.slug);
assertUnique("booking ref", rows.bookings, (r) => r.ref);
assertUnique("ticket code", rows.tickets, (r) => r.code);
assertUnique("seat hold", rows.seatHolds, (r) => `${r.eventId}|${r.seatId}`);
assertUnique("seat key", rows.seats, (r) => `${r.eventId}|${r.key}`);
assertUnique("ticket type key", rows.ticketTypes, (r) => `${r.eventId}|${r.key}`);
assertUnique("application ref", rows.organizerApplications, (r) => r.ref);
for (const t of rows.tickets) if (t.seatLabel && !t.seatId) throw new Error(`Ticket ${t.code} has seat ${t.seatLabel} that isn't on the chart`);

const summary = Object.entries(rows)
  .map(([k, v]) => `${k} ${v.length}`)
  .join(", ");

/* ---------------------------------------------------------------------------------------------------------- */
/* Write                                                                                                       */
/* ---------------------------------------------------------------------------------------------------------- */

async function main() {
  if (dryRun) {
    console.log(`Dry run: every row built and checked, nothing written.\n${summary}`);
    return;
  }
  if (!args.has("--reset")) {
    console.log("Nothing done. Use --dry-run to check the data, or --reset to empty the tables and insert it.");
    return;
  }
  const { db, pool } = await import("./index");
  const [[{ name }]] = (await pool.query("SELECT DATABASE() AS name")) as unknown as [[{ name: string }]];
  if (!/dev/i.test(name ?? "") && !args.has("--force")) {
    throw new Error(`Refusing to reset "${name}": its name doesn't contain "dev". Use a development database, or pass --force on purpose.`);
  }

  const order = Object.keys(tables) as (keyof typeof tables)[];
  await db.transaction(async (tx) => {
    await tx.execute("SET FOREIGN_KEY_CHECKS = 0");
    for (const k of [...order].reverse()) await tx.delete(tables[k]);
    await tx.execute("SET FOREIGN_KEY_CHECKS = 1");
    for (const k of order) {
      const list = rows[k];
      for (let i = 0; i < list.length; i += 200) await tx.insert(tables[k]).values(list.slice(i, i + 200) as never);
    }
  });
  console.log(`Seeded "${name}": ${summary}`);
  await pool.end();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
