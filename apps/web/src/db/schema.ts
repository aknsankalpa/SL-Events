// The SL Events database (MariaDB 10.5 on Hostinger, through Drizzle's MySQL dialect).
//
// Rules the database itself enforces, so no bug in the website can break them:
//   - one account per email, one organizer per slug, one event per slug;
//   - a seat can be held by only one booking at a time (`seat_holds`: unique event + seat);
//   - every QR ticket code is unique;
//   - deleting an event, booking or user takes its dependent rows with it, or is refused where history must stay.
// Everything a customer may or may not see or change (their own bookings only, staff-only payment checks) is checked
// in the website's server code before it reaches these tables.

import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  datetime,
  double,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  serial,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

const id = () => serial("id").primaryKey();
/** A reference to another table's `serial` id. */
const ref = (name: string) => bigint(name, { mode: "number", unsigned: true });
const createdAt = () => datetime("created_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`);
const updatedAt = () => datetime("updated_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => new Date());

/* ------------------------------------------------------------------------------------------------------------ */
/* People                                                                                                         */
/* ------------------------------------------------------------------------------------------------------------ */

export const roles = ["customer", "organizer", "staff", "admin"] as const;

export const users = mysqlTable(
  "users",
  {
    id: id(),
    email: varchar("email", { length: 191 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    /** Null until the account sets a password (demo accounts, or invited staff who haven't signed in yet). */
    passwordHash: varchar("password_hash", { length: 255 }),
    emailVerifiedAt: datetime("email_verified_at", { mode: "date" }),
    phone: varchar("phone", { length: 40 }),
    city: varchar("city", { length: 60 }),
    /** Notification and display preferences (the customer settings screen). */
    settings: json("settings").$type<Record<string, unknown>>(),
    disabledAt: datetime("disabled_at", { mode: "date" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

export const userRoles = mysqlTable(
  "user_roles",
  {
    userId: ref("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: mysqlEnum("role", roles).notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.role] })],
);

/** Signed-in sessions. The cookie holds a random token; only its hash is stored. */
export const sessions = mysqlTable(
  "sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: ref("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
    /** Which role the account is using, for accounts with several (the app's "Switch view"). */
    activeRole: mysqlEnum("active_role", roles),
    userAgent: varchar("user_agent", { length: 255 }),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

/** Email verification and password reset codes. Only a hash of the code is stored. */
export const authCodes = mysqlTable(
  "auth_codes",
  {
    id: id(),
    email: varchar("email", { length: 191 }).notNull(),
    purpose: mysqlEnum("purpose", ["verify_email", "reset_password"]).notNull(),
    codeHash: varchar("code_hash", { length: 255 }).notNull(),
    expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
    usedAt: datetime("used_at", { mode: "date" }),
    attempts: int("attempts").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("auth_codes_email_idx").on(t.email, t.purpose)],
);

/* ------------------------------------------------------------------------------------------------------------ */
/* Organizers                                                                                                     */
/* ------------------------------------------------------------------------------------------------------------ */

export const organizers = mysqlTable(
  "organizers",
  {
    id: id(),
    slug: varchar("slug", { length: 120 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    about: text("about"),
    email: varchar("email", { length: 191 }),
    phone: varchar("phone", { length: 40 }),
    link: varchar("link", { length: 255 }),
    logoUrl: varchar("logo_url", { length: 255 }),
    /** Bank details for payouts and for the "pay by transfer" instructions. */
    payout: json("payout").$type<{ bank?: string; holder?: string; number?: string }>(),
    status: mysqlEnum("status", ["active", "suspended"]).notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("organizers_slug_unique").on(t.slug)],
);

/** Who works for an organizer: owners run it, door staff scan tickets at its events. */
export const organizerMembers = mysqlTable(
  "organizer_members",
  {
    organizerId: ref("organizer_id")
      .notNull()
      .references(() => organizers.id, { onDelete: "cascade" }),
    userId: ref("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: mysqlEnum("role", ["owner", "manager", "door_staff"]).notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.organizerId, t.userId] })],
);

export const applicationStatuses = ["received", "in_review", "more_info", "approved", "declined"] as const;

/** "Become an organizer" applications (website and app). */
export const organizerApplications = mysqlTable(
  "organizer_applications",
  {
    id: id(),
    ref: varchar("ref", { length: 16 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 191 }).notNull(),
    contact: varchar("contact", { length: 120 }),
    organization: varchar("organization", { length: 160 }).notNull(),
    kind: varchar("kind", { length: 60 }).notNull(),
    about: text("about").notNull(),
    link: varchar("link", { length: 255 }),
    documents: json("documents").$type<{ name: string; size: number; path?: string }[]>(),
    status: mysqlEnum("status", applicationStatuses).notNull().default("received"),
    /** A message from the review team ("more info" and "declined"). */
    note: text("note"),
    decidedBy: ref("decided_by").references(() => users.id, { onDelete: "set null" }),
    decidedAt: datetime("decided_at", { mode: "date" }),
    /** The organizer created when the application was approved. */
    organizerId: ref("organizer_id").references(() => organizers.id, { onDelete: "set null" }),
    submittedAt: createdAt(),
  },
  (t) => [uniqueIndex("organizer_applications_ref_unique").on(t.ref), index("organizer_applications_email_idx").on(t.email)],
);

/* ------------------------------------------------------------------------------------------------------------ */
/* Events, tickets and seats                                                                                      */
/* ------------------------------------------------------------------------------------------------------------ */

export const categories = ["concert", "party", "cricket", "culture", "movies", "food", "travel", "community"] as const;
export const eventStatuses = ["draft", "in_review", "changes_requested", "on_sale", "paused", "unpublished", "cancelled", "ended"] as const;

export const events = mysqlTable(
  "events",
  {
    id: id(),
    slug: varchar("slug", { length: 120 }).notNull(),
    organizerId: ref("organizer_id")
      .notNull()
      .references(() => organizers.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 160 }).notNull(),
    category: mysqlEnum("category", categories).notNull(),
    status: mysqlEnum("status", eventStatuses).notNull().default("draft"),
    /** "tickets": ticket types with quantities. "seats": numbered seats chosen on a chart. */
    sellMode: mysqlEnum("sell_mode", ["tickets", "seats"]).notNull().default("tickets"),
    /** In UTC; shown in Korea time. */
    startsAt: datetime("starts_at", { mode: "date" }),
    doorsOpenAt: datetime("doors_open_at", { mode: "date" }),
    venue: varchar("venue", { length: 160 }),
    city: varchar("city", { length: 60 }),
    area: varchar("area", { length: 160 }),
    tagline: varchar("tagline", { length: 200 }),
    /** Rich text, sanitised before display. */
    descriptionHtml: text("description_html"),
    coverUrl: varchar("cover_url", { length: 255 }),
    featured: boolean("featured").notNull().default(false),
    /** The organizer's own contact details for this event, when they differ from the organizer profile. */
    contact: json("contact").$type<{ about?: string; email?: string; phone?: string; link?: string }>(),
    /** Event-day settings (check-in opens, late cut-off, re-entry, ...). */
    operations: json("operations").$type<Record<string, unknown>>(),
    /** Why an admin asked for changes, unpublished or cancelled it. */
    statusNote: text("status_note"),
    submittedAt: datetime("submitted_at", { mode: "date" }),
    publishedAt: datetime("published_at", { mode: "date" }),
    cancelledAt: datetime("cancelled_at", { mode: "date" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("events_slug_unique").on(t.slug),
    index("events_organizer_idx").on(t.organizerId),
    index("events_status_starts_idx").on(t.status, t.startsAt),
  ],
);

export const ticketTypes = mysqlTable(
  "ticket_types",
  {
    id: id(),
    eventId: ref("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    /** Short key used in links and booking lines ("general", "vip"); unique within the event. */
    key: varchar("key", { length: 60 }).notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    price: int("price", { unsigned: true }).notNull(),
    capacity: int("capacity", { unsigned: true }).notNull(),
    /** Tickets sold outside this system (before launch, at the door). Sales here are counted from bookings. */
    soldElsewhere: int("sold_elsewhere", { unsigned: true }).notNull().default(0),
    maxPerOrder: int("max_per_order", { unsigned: true }).notNull().default(10),
    summary: varchar("summary", { length: 200 }),
    perks: json("perks").$type<string[]>(),
    color: varchar("color", { length: 9 }),
    visible: boolean("visible").notNull().default(true),
    salesPaused: boolean("sales_paused").notNull().default(false),
    salesEndAt: datetime("sales_end_at", { mode: "date" }),
    sort: int("sort").notNull().default(0),
  },
  (t) => [uniqueIndex("ticket_types_event_key_unique").on(t.eventId, t.key)],
);

/** The seat chart of a numbered-seat event: its size, the plan picture and the stage. Seats are in `seats`. */
export const seatCharts = mysqlTable("seat_charts", {
  eventId: ref("event_id")
    .primaryKey()
    .references(() => events.id, { onDelete: "cascade" }),
  width: int("width", { unsigned: true }).notNull(),
  height: int("height", { unsigned: true }).notNull(),
  imageUrl: varchar("image_url", { length: 255 }),
  stage: json("stage").$type<{ x: number; y: number; w: number; h: number; label: string }>(),
  /** How the builder detects and numbers seats from a picture. */
  settings: json("settings").$type<Record<string, unknown>>(),
  updatedAt: updatedAt(),
});

export const seatSections = mysqlTable(
  "seat_sections",
  {
    id: id(),
    eventId: ref("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 60 }).notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    color: varchar("color", { length: 9 }).notNull(),
    price: int("price", { unsigned: true }).notNull(),
    sort: int("sort").notNull().default(0),
  },
  (t) => [uniqueIndex("seat_sections_event_key_unique").on(t.eventId, t.key)],
);

export const seats = mysqlTable(
  "seats",
  {
    id: id(),
    eventId: ref("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    /** The builder's seat id ("odc-C7"); bookings keep pointing at it when the chart is edited. */
    key: varchar("key", { length: 64 }).notNull(),
    sectionId: ref("section_id").references(() => seatSections.id, { onDelete: "set null" }),
    row: varchar("row", { length: 4 }).notNull(),
    num: int("num", { unsigned: true }).notNull(),
    label: varchar("label", { length: 12 }).notNull(),
    x: double("x").notNull(),
    y: double("y").notNull(),
    r: double("r").notNull(),
    accessible: boolean("accessible").notNull().default(false),
    blocked: boolean("blocked").notNull().default(false),
    /** Row and number came from the rows table, so renumbering by position leaves them alone. */
    locked: boolean("locked").notNull().default(false),
  },
  (t) => [uniqueIndex("seats_event_key_unique").on(t.eventId, t.key), index("seats_section_idx").on(t.sectionId)],
);

/* ------------------------------------------------------------------------------------------------------------ */
/* Bookings, payments and tickets                                                                                 */
/* ------------------------------------------------------------------------------------------------------------ */

export const bookingStatuses = ["awaiting_payment", "under_review", "proof_rejected", "confirmed", "attended", "expired", "cancelled"] as const;

export const bookings = mysqlTable(
  "bookings",
  {
    id: id(),
    /** What customers see and quote: "SL-41752". */
    ref: varchar("ref", { length: 16 }).notNull(),
    userId: ref("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    /** Null only for bookings of events that were removed; the title and date below keep the history readable. */
    eventId: ref("event_id").references(() => events.id, { onDelete: "set null" }),
    eventTitle: varchar("event_title", { length: 160 }).notNull(),
    eventDateLabel: varchar("event_date_label", { length: 40 }).notNull(),
    status: mysqlEnum("status", bookingStatuses).notNull(),
    fee: int("fee", { unsigned: true }).notNull().default(0),
    total: int("total", { unsigned: true }).notNull(),
    paymentMethod: mysqlEnum("payment_method", ["bank_transfer", "none"]).notNull(),
    /** Unpaid bookings are held until then; after it they count as expired and their seats are free again. */
    payBy: datetime("pay_by", { mode: "date" }),
    statusNote: text("status_note"),
    rejectionNote: text("rejection_note"),
    /** Set only when staff verified the payment. A paid booking never gets valid tickets without it. */
    verifiedAt: datetime("verified_at", { mode: "date" }),
    verifiedBy: ref("verified_by").references(() => users.id, { onDelete: "set null" }),
    cancelledAt: datetime("cancelled_at", { mode: "date" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("bookings_ref_unique").on(t.ref),
    index("bookings_user_idx").on(t.userId, t.createdAt),
    index("bookings_event_status_idx").on(t.eventId, t.status),
    index("bookings_pay_by_idx").on(t.status, t.payBy),
  ],
);

export const bookingLines = mysqlTable(
  "booking_lines",
  {
    id: id(),
    bookingId: ref("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    ticketTypeId: ref("ticket_type_id").references(() => ticketTypes.id, { onDelete: "set null" }),
    sectionId: ref("section_id").references(() => seatSections.id, { onDelete: "set null" }),
    /** Name and price as booked, so later edits to the event don't change old bookings. */
    name: varchar("name", { length: 80 }).notNull(),
    qty: int("qty", { unsigned: true }).notNull(),
    unitPrice: int("unit_price", { unsigned: true }).notNull(),
  },
  (t) => [index("booking_lines_booking_idx").on(t.bookingId)],
);

/** One per person: the name on it, the seat (if numbered) and the QR code checked at the door. */
export const tickets = mysqlTable(
  "tickets",
  {
    id: id(),
    bookingId: ref("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    eventId: ref("event_id").references(() => events.id, { onDelete: "set null" }),
    /** "SLE-7K3F-92QD". Shown as the QR code; only ever valid while the booking allows tickets. */
    code: varchar("code", { length: 20 }).notNull(),
    holderName: varchar("holder_name", { length: 120 }).notNull(),
    ticketName: varchar("ticket_name", { length: 80 }).notNull(),
    seatId: ref("seat_id").references(() => seats.id, { onDelete: "set null" }),
    seatLabel: varchar("seat_label", { length: 12 }),
    position: int("position", { unsigned: true }).notNull(),
    scannedAt: datetime("scanned_at", { mode: "date" }),
    scannedBy: ref("scanned_by").references(() => users.id, { onDelete: "set null" }),
    gate: varchar("gate", { length: 60 }),
  },
  (t) => [uniqueIndex("tickets_code_unique").on(t.code), index("tickets_booking_idx").on(t.bookingId), index("tickets_event_idx").on(t.eventId)],
);

/**
 * Seats held by bookings that still count (unpaid but not expired, under review, confirmed, attended). The unique
 * key is what makes double-selling impossible: a second hold on the same seat fails inside the booking transaction.
 * Rows are deleted when their booking expires or is cancelled, which frees the seat.
 */
export const seatHolds = mysqlTable(
  "seat_holds",
  {
    eventId: ref("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    seatId: ref("seat_id")
      .notNull()
      .references(() => seats.id, { onDelete: "cascade" }),
    bookingId: ref("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.seatId] }), index("seat_holds_booking_idx").on(t.bookingId)],
);

export const paymentProofs = mysqlTable(
  "payment_proofs",
  {
    id: id(),
    bookingId: ref("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    /** Where the screenshot is stored on the server (outside the public folder). */
    filePath: varchar("file_path", { length: 255 }).notNull(),
    fileName: varchar("file_name", { length: 160 }).notNull(),
    sizeBytes: int("size_bytes", { unsigned: true }).notNull(),
    sender: varchar("sender", { length: 120 }),
    bank: varchar("bank", { length: 80 }),
    uploadedAt: createdAt(),
  },
  (t) => [index("payment_proofs_booking_idx").on(t.bookingId)],
);

/* ------------------------------------------------------------------------------------------------------------ */
/* Event day                                                                                                      */
/* ------------------------------------------------------------------------------------------------------------ */

/** Door staff assigned to an event, and where they stand. */
export const eventStaff = mysqlTable(
  "event_staff",
  {
    eventId: ref("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: ref("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gate: varchar("gate", { length: 60 }),
    accessFrom: datetime("access_from", { mode: "date" }),
    accessUntil: datetime("access_until", { mode: "date" }),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.userId] })],
);

/** Every scan at the door, admitted or refused, for the organizer's check-in screens and disputes. */
export const scanLog = mysqlTable(
  "scan_log",
  {
    id: id(),
    eventId: ref("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    ticketId: ref("ticket_id").references(() => tickets.id, { onDelete: "set null" }),
    code: varchar("code", { length: 40 }).notNull(),
    outcome: mysqlEnum("outcome", ["admitted", "already_used", "not_found", "wrong_event", "not_paid", "cancelled", "too_early", "too_late"]).notNull(),
    staffUserId: ref("staff_user_id").references(() => users.id, { onDelete: "set null" }),
    gate: varchar("gate", { length: 60 }),
    at: createdAt(),
  },
  (t) => [index("scan_log_event_idx").on(t.eventId, t.at)],
);

/* ------------------------------------------------------------------------------------------------------------ */
/* Site                                                                                                           */
/* ------------------------------------------------------------------------------------------------------------ */

export const supportRequests = mysqlTable(
  "support_requests",
  {
    id: id(),
    ref: varchar("ref", { length: 16 }).notNull(),
    userId: ref("user_id").references(() => users.id, { onDelete: "set null" }),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 191 }).notNull(),
    topic: varchar("topic", { length: 80 }).notNull(),
    bookingRef: varchar("booking_ref", { length: 16 }),
    message: text("message").notNull(),
    status: mysqlEnum("status", ["open", "answered", "closed"]).notNull().default("open"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("support_requests_ref_unique").on(t.ref)],
);

/** Admin-editable settings that a non-coder can change: payment account, banner, maintenance notice, templates. */
export const siteSettings = mysqlTable("site_settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: json("value").notNull(),
  updatedBy: ref("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: updatedAt(),
});

/** Who changed what in the admin and organizer portals. Never edited or deleted from the website. */
export const auditLog = mysqlTable(
  "audit_log",
  {
    id: id(),
    actorUserId: ref("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    actorLabel: varchar("actor_label", { length: 120 }).notNull(),
    action: varchar("action", { length: 80 }).notNull(),
    targetType: varchar("target_type", { length: 40 }).notNull(),
    targetId: varchar("target_id", { length: 64 }),
    detail: json("detail").$type<Record<string, unknown>>(),
    at: createdAt(),
  },
  (t) => [index("audit_log_at_idx").on(t.at), index("audit_log_target_idx").on(t.targetType, t.targetId)],
);
