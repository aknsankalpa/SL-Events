import { getEvent, type EventItem } from "./data";

export type BookingStatus =
  | "confirmed"
  | "under_review"
  | "awaiting_payment"
  | "proof_rejected"
  | "refunded"
  | "attended";

export type BookingLine = { ticketName: string; qty: number; unitPrice: number };

export type Booking = {
  id: string;
  eventSlug: string;
  /** Event title as booked (history can reference events no longer listed). */
  eventTitle: string;
  eventDate: string; // display date, e.g. "13 Dec 2026"
  status: BookingStatus;
  lines: BookingLine[];
  total: number;
  attendees: string[];
  paymentMethod: "Bank transfer" | "—";
  createdAt?: string;
  proof?: { fileName: string; uploadedAt: string; sizeLabel: string };
  /** Payment deadline label for unpaid bookings. */
  payBy?: string;
  /** ISO deadline used by the payment countdown. */
  payByIso?: string;
  rejectionNote?: string;
  statusNote?: string;
};

export const statusMeta: Record<BookingStatus, { label: string; tone: "success" | "warning" | "neutral" | "danger" }> = {
  confirmed: { label: "Confirmed", tone: "success" },
  under_review: { label: "Under review", tone: "warning" },
  awaiting_payment: { label: "Awaiting payment", tone: "neutral" },
  proof_rejected: { label: "Proof rejected", tone: "danger" },
  refunded: { label: "Refunded", tone: "neutral" },
  attended: { label: "Attended", tone: "success" },
};

export const bookings: Booking[] = [
  {
    id: "SL-41752",
    eventSlug: "kottu-and-hoppers-food-fair",
    eventTitle: "Kottu & Hoppers Food Fair",
    eventDate: "13 Dec 2026",
    status: "awaiting_payment",
    lines: [{ ticketName: "Entry", qty: 2, unitPrice: 5000 }],
    total: 10000,
    attendees: ["Kasun Perera", "Dilini Perera"],
    paymentMethod: "Bank transfer",
    payBy: "Sat, 10 Oct, 1:10 PM",
    payByIso: "2026-10-10T13:10:00+09:00",
  },
  {
    id: "SL-41744",
    eventSlug: "sri-lanka-cricket-cup",
    eventTitle: "Sri Lanka Cricket Cup",
    eventDate: "22 Nov 2026",
    status: "under_review",
    lines: [{ ticketName: "Spectator", qty: 2, unitPrice: 10000 }],
    total: 20000,
    attendees: ["Kasun Perera", "Dilini Perera"],
    paymentMethod: "Bank transfer",
    createdAt: "Fri, 9 Oct · 10:40 AM",
    proof: { fileName: "transfer-receipt.jpg", uploadedAt: "11:05 AM", sizeLabel: "1.2 MB" },
    statusNote: "Proof uploaded today, 11:05 AM · usually checked within 2–6 hours",
  },
  {
    id: "SL-41730",
    eventSlug: "sri-lankan-music-night",
    eventTitle: "Sri Lankan Music Night",
    eventDate: "14 Nov 2026",
    status: "confirmed",
    lines: [{ ticketName: "General", qty: 2, unitPrice: 30000 }],
    total: 60000,
    attendees: ["Kasun Perera", "Dilini Perera"],
    paymentMethod: "Bank transfer",
    createdAt: "Fri, 9 Oct · 1:10 PM",
    // Mirrors the design, where the payment screen for this booking shows a live deadline.
    payBy: "Sat, 10 Oct, 1:10 PM",
    payByIso: "2026-10-10T13:10:00+09:00",
    proof: { fileName: "transfer-receipt.jpg", uploadedAt: "1:24 PM", sizeLabel: "1.2 MB" },
  },
  {
    id: "SL-41698",
    eventSlug: "baila-night",
    eventTitle: "Baila Night",
    eventDate: "28 Nov 2026",
    status: "proof_rejected",
    lines: [{ ticketName: "Regular", qty: 1, unitPrice: 25000 }],
    total: 25000,
    attendees: ["Kasun Perera"],
    paymentMethod: "Bank transfer",
    rejectionNote:
      "The amount didn't match: we received ₩20,000 but ₩25,000 is due. Send the remaining ₩5,000 and upload both screenshots.",
  },
  {
    id: "SL-41402",
    eventSlug: "sinhala-movie-screening",
    eventTitle: "Sinhala Movie Screening",
    eventDate: "26 Sep 2026",
    status: "refunded",
    lines: [{ ticketName: "Regular", qty: 1, unitPrice: 12000 }],
    total: 12000,
    attendees: ["Kasun Perera"],
    paymentMethod: "Bank transfer",
  },
  {
    id: "SL-41105",
    eventSlug: "",
    eventTitle: "Avurudu Night Seoul",
    eventDate: "18 Apr 2026",
    status: "attended",
    lines: [{ ticketName: "General", qty: 3, unitPrice: 15000 }],
    total: 45000,
    attendees: ["Kasun Perera", "Dilini Perera", "Nuwan Silva"],
    paymentMethod: "Bank transfer",
  },
  {
    id: "SL-41012",
    eventSlug: "",
    eventTitle: "Poson Dansala & Meetup",
    eventDate: "28 Jun 2026",
    status: "attended",
    lines: [{ ticketName: "Free entry", qty: 1, unitPrice: 0 }],
    total: 0,
    attendees: ["Kasun Perera"],
    paymentMethod: "—",
  },
];

export function getBooking(id: string) {
  return bookings.find((b) => b.id === id);
}

export function bookingEvent(b: Booking): EventItem | undefined {
  return b.eventSlug ? getEvent(b.eventSlug) : undefined;
}

export function ticketSummary(b: Booking) {
  return b.lines.map((l) => `${l.qty} × ${l.ticketName}`).join(", ");
}

export const ticketCount = (b: Booking) => b.lines.reduce((n, l) => n + l.qty, 0);

/** Totals shown on the Booking history screen (kept as designed; the real values come from the API). */
export const historyStats = {
  bookings: 7,
  since: "March 2026",
  eventsAttended: 2,
  attendedNames: "Poson Dansala, Avurudu Night",
  totalPaid: 140000,
};

/** QR tickets issued for a confirmed booking. Codes are placeholders; the API must issue signed tokens. */
export type IssuedTicket = {
  code: string;
  holder: string;
  ticketName: string;
  scanned: boolean;
};

export const issuedTickets: Record<string, IssuedTicket[]> = {
  "SL-41730": [
    { code: "SLE-7K3F-92QD", holder: "Kasun Perera", ticketName: "General", scanned: false },
    { code: "SLE-M4XD-8RTV", holder: "Dilini Perera", ticketName: "General", scanned: false },
  ],
};

/** Where a booking row should take the customer, based on what they need to do next. */
export function bookingHref(b: Booking): string | undefined {
  switch (b.status) {
    case "confirmed":
      return `/my-tickets/${b.id}`;
    case "under_review":
      return `/my-tickets/${b.id}/status`;
    case "awaiting_payment":
      return `/bookings/${b.id}/payment`;
    case "proof_rejected":
      return `/bookings/${b.id}/proof`;
    default:
      return undefined;
  }
}
