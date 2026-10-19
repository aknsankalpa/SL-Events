import { getEvent, type EventItem } from "./data";

/**
 * Customer bookings. This file holds the types, the payment rules and the seed data; `bookingStore.ts` holds the live
 * list and the only functions that change it. A customer can create a booking, upload proof and cancel an unpaid
 * booking. Marking a booking paid, or a ticket valid, is a staff/system decision and has no customer-facing path.
 */

export type BookingStatus =
  | "confirmed"
  | "under_review"
  | "awaiting_payment"
  | "proof_rejected"
  | "expired"
  | "cancelled"
  | "attended";

/** What the customer sees about a payment, whatever the detailed booking status. */
export type PaymentState = "pending" | "confirmed" | "failed" | "expired" | "cancelled";

export type BookingLine = { ticketName: string; qty: number; unitPrice: number };

export type Booking = {
  id: string;
  /** Email of the account that made the booking. Customers only ever see their own. */
  ownerEmail: string;
  eventSlug: string;
  /** Event title as booked (history can reference events no longer listed). */
  eventTitle: string;
  eventDate: string; // display date, e.g. "13 Dec 2026"
  status: BookingStatus;
  lines: BookingLine[];
  /** Booking fee included in `total`. */
  fee: number;
  total: number;
  attendees: string[];
  paymentMethod: "Bank transfer" | "—";
  createdIso?: string;
  createdAt?: string;
  proof?: { fileName: string; uploadedAt: string; sizeLabel: string; sender?: string; bank?: string };
  /** Payment deadline label for unpaid bookings. */
  payBy?: string;
  /** ISO deadline used by the payment countdown and by expiry. */
  payByIso?: string;
  rejectionNote?: string;
  statusNote?: string;
  /** Set only when a staff member verified the payment. Tickets are never issued for a paid booking without it. */
  verifiedAt?: string;
  verifiedBy?: string;
  cancelledAt?: string;
};

export const statusMeta: Record<BookingStatus, { label: string; tone: "success" | "warning" | "neutral" | "danger" }> = {
  confirmed: { label: "Confirmed", tone: "success" },
  under_review: { label: "Pending · under review", tone: "warning" },
  awaiting_payment: { label: "Pending · awaiting payment", tone: "warning" },
  proof_rejected: { label: "Payment failed", tone: "danger" },
  expired: { label: "Expired", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  attended: { label: "Attended", tone: "success" },
};

export const paymentState = (status: BookingStatus): PaymentState =>
  status === "awaiting_payment" || status === "under_review"
    ? "pending"
    : status === "confirmed" || status === "attended"
      ? "confirmed"
      : status === "proof_rejected"
        ? "failed"
        : status === "expired"
          ? "expired"
          : "cancelled";

/** The configured payment rules. The server must enforce the same ones; the browser only mirrors them. */
export const paymentRules = {
  /** How long tickets are held while the customer pays. */
  holdHours: 24,
  /** A QR ticket is issued only after staff verified the transfer. */
  requireVerifiedPayment: true,
  /** Nothing to pay, nothing to verify: free bookings are confirmed (and ticketed) straight away. */
  freeBookingsConfirmInstantly: true,
} as const;

/**
 * Whether QR tickets exist for this booking. This is the single place that decides it: a paid booking needs a
 * verified payment, so changing a status by hand never produces a usable ticket on its own.
 */
export function canIssueTickets(b: Booking): boolean {
  if (b.status === "cancelled" || b.status === "expired") return false;
  if (b.total === 0) return paymentRules.freeBookingsConfirmInstantly;
  return (b.status === "confirmed" || b.status === "attended") && (!paymentRules.requireVerifiedPayment || !!b.verifiedAt);
}

/** What a customer may do to a booking. Marking it paid is deliberately not in this list. */
export const customerCan = {
  uploadProof: (b: Booking) => b.status === "awaiting_payment" || b.status === "proof_rejected" || b.status === "under_review",
  /** Only before any payment has been sent: once proof is in, cancelling is a matter for support. */
  cancel: (b: Booking) => b.status === "awaiting_payment" || b.status === "proof_rejected",
};

/** A booking whose payment window has closed. */
export function isPastDeadline(b: Booking, nowMs: number): boolean {
  return (b.status === "awaiting_payment" || b.status === "proof_rejected") && !!b.payByIso && nowMs > new Date(b.payByIso).getTime();
}

/** The status to show right now: an unpaid booking past its deadline reads as expired. */
export const effectiveStatus = (b: Booking, nowMs: number): BookingStatus => (nowMs > 0 && isPastDeadline(b, nowMs) ? "expired" : b.status);

const KST = "Asia/Seoul";
/** "Sat, 10 Oct, 1:10 PM" in Korea time. */
export function formatKst(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: KST });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: KST });
  return `${date.replace(/^(\w{3}) /, "$1, ")}, ${time}`;
}

const DEMO = "kasun@example.com";

export const seedBookings: Booking[] = [
  {
    id: "SL-41752",
    ownerEmail: DEMO,
    eventSlug: "kottu-and-hoppers-food-fair",
    eventTitle: "Kottu & Hoppers Food Fair",
    eventDate: "13 Dec 2026",
    status: "awaiting_payment",
    lines: [{ ticketName: "Entry", qty: 2, unitPrice: 5000 }],
    fee: 0,
    total: 10000,
    attendees: ["Kasun Perera", "Dilini Perera"],
    paymentMethod: "Bank transfer",
    createdIso: "2026-10-09T09:10:00+09:00",
    createdAt: "Fri, 9 Oct · 9:10 AM",
    payByIso: "2026-12-10T13:10:00+09:00",
    payBy: "Thu, 10 Dec, 1:10 PM",
  },
  {
    id: "SL-41744",
    ownerEmail: DEMO,
    eventSlug: "sri-lanka-cricket-cup",
    eventTitle: "Sri Lanka Cricket Cup",
    eventDate: "22 Nov 2026",
    status: "under_review",
    lines: [{ ticketName: "Spectator", qty: 2, unitPrice: 10000 }],
    fee: 0,
    total: 20000,
    attendees: ["Kasun Perera", "Dilini Perera"],
    paymentMethod: "Bank transfer",
    createdIso: "2026-10-09T10:40:00+09:00",
    createdAt: "Fri, 9 Oct · 10:40 AM",
    proof: { fileName: "transfer-receipt.jpg", uploadedAt: "11:05 AM", sizeLabel: "1.2 MB" },
    statusNote: "Proof uploaded today, 11:05 AM · usually checked within 2–6 hours",
  },
  {
    id: "SL-41730",
    ownerEmail: DEMO,
    eventSlug: "sri-lankan-music-night",
    eventTitle: "Sri Lankan Music Night",
    eventDate: "14 Nov 2026",
    status: "confirmed",
    lines: [{ ticketName: "General", qty: 2, unitPrice: 30000 }],
    fee: 0,
    total: 60000,
    attendees: ["Kasun Perera", "Dilini Perera"],
    paymentMethod: "Bank transfer",
    createdIso: "2026-10-09T13:10:00+09:00",
    createdAt: "Fri, 9 Oct · 1:10 PM",
    proof: { fileName: "transfer-receipt.jpg", uploadedAt: "1:24 PM", sizeLabel: "1.2 MB" },
    verifiedAt: "2026-10-09T14:41:00+09:00",
    verifiedBy: "SL Events payments team",
  },
  {
    id: "SL-41698",
    ownerEmail: DEMO,
    eventSlug: "baila-night",
    eventTitle: "Baila Night",
    eventDate: "28 Nov 2026",
    status: "proof_rejected",
    lines: [{ ticketName: "Regular", qty: 1, unitPrice: 25000 }],
    fee: 0,
    total: 25000,
    attendees: ["Kasun Perera"],
    paymentMethod: "Bank transfer",
    createdIso: "2026-10-08T18:00:00+09:00",
    createdAt: "Thu, 8 Oct · 6:00 PM",
    payByIso: "2026-11-20T18:00:00+09:00",
    payBy: "Fri, 20 Nov, 6:00 PM",
    rejectionNote:
      "The amount didn't match: we received ₩20,000 but ₩25,000 is due. Send the remaining ₩5,000 and upload both screenshots.",
  },
  {
    id: "SL-41402",
    ownerEmail: DEMO,
    eventSlug: "sinhala-movie-screening",
    eventTitle: "Sinhala Movie Screening",
    eventDate: "26 Sep 2026",
    status: "cancelled",
    lines: [{ ticketName: "Regular", qty: 1, unitPrice: 12000 }],
    fee: 0,
    total: 12000,
    attendees: ["Kasun Perera"],
    paymentMethod: "Bank transfer",
    createdIso: "2026-09-12T20:00:00+09:00",
    createdAt: "Sat, 12 Sep · 8:00 PM",
    cancelledAt: "2026-09-13T09:00:00+09:00",
  },
  {
    id: "SL-41310",
    ownerEmail: DEMO,
    eventSlug: "sri-lankan-dance-showcase",
    eventTitle: "Sri Lankan Dance Showcase",
    eventDate: "20 Dec 2026",
    status: "expired",
    lines: [{ ticketName: "General", qty: 2, unitPrice: 15000 }],
    fee: 0,
    total: 30000,
    attendees: ["Kasun Perera", "Dilini Perera"],
    paymentMethod: "Bank transfer",
    createdIso: "2026-10-01T19:00:00+09:00",
    createdAt: "Thu, 1 Oct · 7:00 PM",
    payByIso: "2026-10-02T19:00:00+09:00",
    payBy: "Fri, 2 Oct, 7:00 PM",
  },
  {
    id: "SL-41105",
    ownerEmail: DEMO,
    eventSlug: "",
    eventTitle: "Avurudu Night Seoul",
    eventDate: "18 Apr 2026",
    status: "attended",
    lines: [{ ticketName: "General", qty: 3, unitPrice: 15000 }],
    fee: 0,
    total: 45000,
    attendees: ["Kasun Perera", "Dilini Perera", "Nuwan Silva"],
    paymentMethod: "Bank transfer",
    createdIso: "2026-04-02T12:00:00+09:00",
    createdAt: "Thu, 2 Apr · 12:00 PM",
    verifiedAt: "2026-04-02T15:30:00+09:00",
    verifiedBy: "SL Events payments team",
  },
  {
    id: "SL-41012",
    ownerEmail: DEMO,
    eventSlug: "",
    eventTitle: "Poson Dansala & Meetup",
    eventDate: "28 Jun 2026",
    status: "attended",
    lines: [{ ticketName: "Free entry", qty: 1, unitPrice: 0 }],
    fee: 0,
    total: 0,
    attendees: ["Kasun Perera"],
    paymentMethod: "—",
    createdIso: "2026-06-10T10:00:00+09:00",
    createdAt: "Wed, 10 Jun · 10:00 AM",
  },
];

export function bookingEvent(b: Booking): EventItem | undefined {
  return b.eventSlug ? getEvent(b.eventSlug) : undefined;
}

/** The event a booking is for. Older events that are no longer listed get a plain stand-in built from the booking. */
export function eventForBooking(b: Booking): EventItem {
  return (
    bookingEvent(b) ?? {
      slug: "",
      title: b.eventTitle,
      category: "culture",
      startsAt: "",
      dateLabel: b.eventDate,
      longDate: b.eventDate,
      time: "",
      badgeDate: b.eventDate.toUpperCase(),
      venue: "Past event",
      city: "",
      area: "",
      tagline: "",
      description: [],
      organizer: "",
      doorsOpen: "",
      ticketTypes: [],
    }
  );
}

export function ticketSummary(b: Booking) {
  return b.lines.map((l) => `${l.qty} × ${l.ticketName}`).join(", ");
}

export const ticketCount = (b: Booking) => b.lines.reduce((n, l) => n + l.qty, 0);

/** Totals for the booking history: only bookings that were really paid count towards "total paid". */
export function historyTotals(list: Booking[]) {
  const attended = list.filter((b) => b.status === "attended");
  const paid = list.filter((b) => (b.status === "confirmed" || b.status === "attended") && b.total > 0);
  return {
    bookings: list.length,
    eventsAttended: attended.length,
    attendedNames: attended.map((b) => b.eventTitle).join(", "),
    totalPaid: paid.reduce((n, b) => n + b.total, 0),
  };
}

/** A QR ticket for one person. Codes are placeholders; the API must issue signed, single-use tokens. */
export type IssuedTicket = {
  code: string;
  holder: string;
  ticketName: string;
  /** True once the ticket has been scanned at the door. Only the entrance scanner changes this. */
  scanned: boolean;
};

/** Codes already used by the organizer's mock attendee list. */
const knownCodes: Record<string, string[]> = { "SL-41730": ["SLE-7K3F-92QD", "SLE-M4XD-8RTV"] };

function codeFor(id: string, index: number): string {
  let h = 2166136261;
  for (const c of `${id}:${index}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const s = h.toString(36).toUpperCase().padStart(8, "0").slice(-8);
  return `SLE-${s.slice(0, 4)}-${s.slice(4)}`;
}

/** The tickets for a booking. Empty unless the payment rules say tickets may exist. */
export function ticketsFor(b: Booking): IssuedTicket[] {
  if (!canIssueTickets(b)) return [];
  const names = b.lines.flatMap((l) => Array.from({ length: l.qty }, () => l.ticketName));
  return names.map((ticketName, i) => ({
    code: knownCodes[b.id]?.[i] ?? codeFor(b.id, i),
    holder: b.attendees[i] || b.attendees[0] || "Guest",
    ticketName,
    scanned: b.status === "attended",
  }));
}

/** Where a booking row should take the customer: its payment status and next step live on one screen. */
export const bookingHref = (b: Booking): string => `/bookings/${b.id}`;
