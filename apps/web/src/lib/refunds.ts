import { createPersistedStore } from "./persistedStore";
import { REFERENCE_DATE } from "./organizer";

export type RequestKind = "refund" | "cancellation";
export type RequestStatus = "pending" | "approved" | "declined";

export type RequestTicket = {
  holder: string;
  ticket: string;
  code: string;
  price: number;
  /** Already scanned at the door: a used ticket can't be refunded. */
  used: boolean;
};

export type RefundRequest = {
  id: string;
  kind: RequestKind;
  status: RequestStatus;
  bookingId: string;
  buyer: string;
  email: string;
  event: string;
  /** ISO date of the event, used for the refund window. */
  eventDate: string;
  /** ISO date the buyer sent the request. */
  requestedOn: string;
  tickets: RequestTicket[];
  /** What the buyer paid so far. 0 for a booking that was never paid. */
  paid: number;
  /** What the buyer is asking to get back. */
  asked: number;
  reason: string;
  decision?: {
    at: string;
    amount?: number;
    note?: string;
    declineReason?: string;
  };
  timeline: { label: string; at: string }[];
};

/** The published refund policy: refunds are available until this many days before the event. */
export const REFUND_WINDOW_DAYS = 3;

export const declineReasons = [
  "Ticket has already been used",
  "Outside the refund window",
  "Tickets for this event are final sale",
  "Booking was made with a promo code that isn't refundable",
  "Other (explain below)",
];

const seed: RefundRequest[] = [
  {
    id: "RF-1024",
    kind: "refund",
    status: "pending",
    bookingId: "SL-41721",
    buyer: "Lahiru Mendis",
    email: "lahiru.m@example.com",
    event: "Sri Lankan Music Night",
    eventDate: "2026-11-14",
    requestedOn: "2026-10-12",
    tickets: [
      { holder: "Lahiru Mendis", ticket: "General", code: "SLE-K8RT-2WQA", price: 27000, used: false },
      { holder: "Chamari Mendis", ticket: "General", code: "SLE-J2HV-6PLM", price: 27000, used: false },
      { holder: "Sandun Mendis", ticket: "General", code: "SLE-R9DC-1XZB", price: 27000, used: false },
      { holder: "Ishara Mendis", ticket: "General", code: "SLE-T5NY-7GKE", price: 27000, used: false },
    ],
    paid: 108000,
    asked: 108000,
    reason: "Our family can't travel up from Busan any more. We'd like to cancel all four tickets.",
    timeline: [
      { label: "Refund requested by the buyer", at: "12 Oct, 8:14 PM" },
      { label: "Booking paid and tickets issued", at: "8 Oct, 5:12 PM" },
    ],
  },
  {
    id: "RF-1023",
    kind: "cancellation",
    status: "pending",
    bookingId: "SL-41747",
    buyer: "Dinesh Kumara",
    email: "dinesh.k@example.com",
    event: "Sri Lankan Music Night",
    eventDate: "2026-11-14",
    requestedOn: "2026-10-13",
    tickets: [
      { holder: "Dinesh Kumara", ticket: "General", code: "—", price: 30000, used: false },
      { holder: "Guest", ticket: "General", code: "—", price: 30000, used: false },
    ],
    paid: 0,
    asked: 0,
    reason: "My transfer is stuck and I'd rather cancel this booking than risk paying twice.",
    timeline: [
      { label: "Cancellation requested by the buyer", at: "Today, 9:02 AM" },
      { label: "Booking created, waiting for payment", at: "Yesterday, 6:12 PM" },
    ],
  },
  {
    id: "RF-1022",
    kind: "refund",
    status: "pending",
    bookingId: "SL-41688",
    buyer: "Tharindu Silva",
    email: "tharindu.s@example.com",
    event: "Sri Lankan Music Night",
    eventDate: "2026-11-14",
    requestedOn: "2026-10-11",
    tickets: [
      { holder: "Tharindu Silva", ticket: "VIP", code: "SLE-V2MG-8DYE", price: 55000, used: true },
      { holder: "Anusha Silva", ticket: "VIP", code: "SLE-W6KP-3CNH", price: 55000, used: false },
    ],
    paid: 110000,
    asked: 110000,
    reason: "My partner is unwell and can't come. We would like our money back for both tickets.",
    timeline: [
      { label: "Refund requested by the buyer", at: "11 Oct, 4:40 PM" },
      { label: "Booking paid and tickets issued", at: "3 Oct, 7:48 PM" },
    ],
  },
  {
    id: "RF-1019",
    kind: "refund",
    status: "approved",
    bookingId: "SL-41702",
    buyer: "Fathima Nazeer",
    email: "fathima.n@example.com",
    event: "Sri Lankan Music Night",
    eventDate: "2026-11-14",
    requestedOn: "2026-10-05",
    tickets: [{ holder: "Fathima Nazeer", ticket: "General", code: "SLE-P7AS-3LXK", price: 30000, used: false }],
    paid: 30000,
    asked: 30000,
    reason: "I have a work shift on the day.",
    decision: { at: "6 Oct, 11:00 AM", amount: 30000, note: "No problem. Hope to see you at the next one." },
    timeline: [
      { label: "Refund of ₩30,000 sent to the buyer's refund account", at: "6 Oct, 11:00 AM" },
      { label: "Approved by Nimal", at: "6 Oct, 9:30 AM" },
      { label: "Refund requested by the buyer", at: "5 Oct, 9:15 AM" },
    ],
  },
  {
    id: "RF-1018",
    kind: "refund",
    status: "declined",
    bookingId: "SL-41655",
    buyer: "Asanka Mendis",
    email: "asanka.m@example.com",
    event: "Sri Lankan Music Night",
    eventDate: "2026-11-14",
    requestedOn: "2026-10-10",
    tickets: [{ holder: "Asanka Mendis", ticket: "General", code: "SLE-H3QD-5NUA", price: 30000, used: true }],
    paid: 30000,
    asked: 30000,
    reason: "I had to leave early, so could I get a refund?",
    decision: {
      at: "10 Oct, 6:50 PM",
      declineReason: "Ticket has already been used",
      note: "Your ticket was scanned at the door, so we're not able to refund it.",
    },
    timeline: [
      { label: "Declined by Nimal: ticket has already been used", at: "10 Oct, 6:50 PM" },
      { label: "Refund requested by the buyer", at: "10 Oct, 6:41 PM" },
    ],
  },
  {
    id: "RF-1016",
    kind: "refund",
    status: "pending",
    bookingId: "SL-41350",
    buyer: "Chamath Gunaratne",
    email: "chamath.g@example.com",
    event: "Baila Night",
    eventDate: "2026-11-28",
    requestedOn: "2026-10-13",
    tickets: [
      { holder: "Chamath Gunaratne", ticket: "Regular", code: "SLE-C4LB-9ZTX", price: 25000, used: false },
      { holder: "Kavindi Gunaratne", ticket: "Regular", code: "SLE-C4LB-2MRP", price: 25000, used: false },
    ],
    paid: 50000,
    asked: 25000,
    reason: "We'd like to keep one ticket and return the other. A friend can't make it.",
    timeline: [
      { label: "Refund requested by the buyer", at: "Today, 7:25 AM" },
      { label: "Booking paid and tickets issued", at: "29 Sep, 3:40 PM" },
    ],
  },
];

export const refundStore = createPersistedStore<RefundRequest[]>("sl-events:refund-requests:v1", seed);

/* ---------- helpers ---------- */

const day = (iso: string) => Date.parse(iso.slice(0, 10));

/** Whole days between two ISO dates. */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((day(toIso) - day(fromIso)) / 86_400_000);
}

/** Most the organizer can send back: what is paid for tickets that haven't been used. */
export function maxRefundable(r: RefundRequest): number {
  if (r.paid <= 0) return 0;
  const unused = r.tickets.filter((t) => !t.used).reduce((n, t) => n + t.price, 0);
  return Math.min(r.paid, unused);
}

export function policyFor(r: RefundRequest) {
  const daysBefore = daysBetween(r.requestedOn, r.eventDate);
  return {
    daysBefore,
    withinWindow: daysBefore >= REFUND_WINDOW_DAYS,
    daysToEvent: daysBetween(REFERENCE_DATE, r.eventDate),
  };
}

export const pendingCount = (list: RefundRequest[]) => list.filter((r) => r.status === "pending").length;
