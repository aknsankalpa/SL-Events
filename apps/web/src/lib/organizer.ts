// Mock data for the organizer portal until the backend exists.
// Anything the Figma screens don't spell out (extra rows, generated attendees) is placeholder.

import type { CategoryId } from "./data";

export const organizer = {
  name: "Nimal Fernando",
  initials: "NF",
  org: "Lanka Beats Korea",
};

export type OrganizerEvent = {
  id: string;
  title: string;
  category: CategoryId;
  dateLabel: string; // "Sat, 14 Nov 2026"
  shortDate: string; // "14 Nov 2026"
  sold: number;
  capacity: number;
  revenue: number;
  pending: number;
  status: "on_sale" | "draft" | "in_review";
};

export const organizerEvents: OrganizerEvent[] = [
  {
    id: "music-night",
    title: "Sri Lankan Music Night",
    category: "concert",
    dateLabel: "Sat, 14 Nov 2026",
    shortDate: "14 Nov 2026",
    sold: 228,
    capacity: 360,
    revenue: 7350000,
    pending: 7,
    status: "on_sale",
  },
  {
    id: "baila-night",
    title: "Baila Night",
    category: "party",
    dateLabel: "Sat, 28 Nov 2026",
    shortDate: "28 Nov 2026",
    sold: 170,
    capacity: 300,
    revenue: 4200000,
    pending: 5,
    status: "on_sale",
  },
  {
    id: "deepavali-lights-night",
    title: "Deepavali Lights Night",
    category: "culture",
    dateLabel: "Sun, 8 Nov 2026",
    shortDate: "8 Nov 2026",
    sold: 0,
    capacity: 150,
    revenue: 0,
    pending: 0,
    status: "in_review",
  },
];

export const eventStatusLabel: Record<OrganizerEvent["status"], string> = {
  on_sale: "On sale",
  draft: "Draft",
  in_review: "In review",
};

export const pendingPaymentsTotal = 12;

/* ---------- Verify payments ---------- */

export type PaymentCheck = { label: string; value: string; note?: string; ok: boolean };

export type QueueItem = {
  id: string;
  buyer: string;
  booking: string;
  amount: number;
  waited: string;
  late?: boolean;
  tickets: string;
  event: string;
  file: string;
  uploaded: string;
  receiptDate: string;
  senderName: string;
  transferTime: string;
};

export const verifyQueue: QueueItem[] = [
  {
    id: "SL-41751",
    buyer: "Sachini Herath",
    booking: "SL-41751",
    amount: 55000,
    waited: "12 min ago",
    tickets: "1 × VIP",
    event: "Sri Lankan Music Night",
    file: "receipt-sachini.png",
    uploaded: "today, 9:54 AM",
    receiptDate: "2026.10.13 09:51",
    senderName: "SACHINI HERATH",
    transferTime: "13 Oct, 9:51 AM · within the 24-hour hold",
  },
  {
    id: "SL-41749",
    buyer: "Ruwan Bandara",
    booking: "SL-41749",
    amount: 90000,
    waited: "1 h ago",
    tickets: "3 × General",
    event: "Sri Lankan Music Night",
    file: "receipt-ruwan.jpg",
    uploaded: "today, 8:47 AM",
    receiptDate: "2026.10.13 08:44",
    senderName: "RUWAN BANDARA",
    transferTime: "13 Oct, 8:44 AM · within the 24-hour hold",
  },
  {
    id: "SL-41745",
    buyer: "Asanka Mendis",
    booking: "SL-41745",
    amount: 25000,
    waited: "2 h ago",
    tickets: "1 × Regular",
    event: "Baila Night",
    file: "receipt-asanka.png",
    uploaded: "today, 7:40 AM",
    receiptDate: "2026.10.13 07:36",
    senderName: "ASANKA MENDIS",
    transferTime: "13 Oct, 7:36 AM · within the 24-hour hold",
  },
  {
    id: "SL-41742",
    buyer: "Gayani Rathnayake",
    booking: "SL-41742",
    amount: 30000,
    waited: "3 h ago",
    tickets: "1 × General",
    event: "Sri Lankan Music Night",
    file: "receipt-gayani.jpg",
    uploaded: "today, 6:35 AM",
    receiptDate: "2026.10.13 06:31",
    senderName: "GAYANI RATHNAYAKE",
    transferTime: "13 Oct, 6:31 AM · within the 24-hour hold",
  },
  {
    id: "SL-41740",
    buyer: "Malith Ekanayake",
    booking: "SL-41740",
    amount: 60000,
    waited: "5 h ago",
    late: true,
    tickets: "2 × General",
    event: "Sri Lankan Music Night",
    file: "receipt-malith.png",
    uploaded: "today, 4:30 AM",
    receiptDate: "2026.10.13 04:27",
    senderName: "MALITH EKANAYAKE",
    transferTime: "13 Oct, 4:27 AM · within the 24-hour hold",
  },
];

export const rejectReasons = [
  "Amount doesn't match",
  "Memo is missing or wrong",
  "Sender name doesn't match",
  "Screenshot is unclear",
  "Transfer not found in our account",
];

/* ---------- Bookings ---------- */

export type OrgBookingStatus = "paid" | "under_review" | "awaiting_payment" | "rejected" | "refunded";

export type OrgBooking = {
  id: string;
  buyer: string;
  email: string;
  phone: string;
  tickets: string;
  amount: number;
  status: OrgBookingStatus;
  booked: string;
  holders: { name: string; ticket: string; code: string }[];
  history: { label: string; at: string }[];
  approvedBy?: string;
  approvedAt?: string;
};

export const orgBookingStatus: Record<OrgBookingStatus, { label: string; tone: "success" | "warning" | "neutral" | "danger" }> = {
  paid: { label: "Paid", tone: "success" },
  under_review: { label: "Under review", tone: "warning" },
  awaiting_payment: { label: "Awaiting payment", tone: "neutral" },
  rejected: { label: "Rejected", tone: "danger" },
  refunded: { label: "Refunded", tone: "neutral" },
};

const generic = (created: string) => [
  { label: "Booking created", at: created },
];

export const orgBookings: OrgBooking[] = [
  {
    id: "SL-41730",
    buyer: "Kasun Perera",
    email: "kasun@example.com",
    phone: "010-2345-6789",
    tickets: "2 × General",
    amount: 60000,
    status: "paid",
    booked: "9 Oct",
    holders: [
      { name: "Kasun Perera", ticket: "General", code: "SLE-7K3F-92QD" },
      { name: "Dilini Perera", ticket: "General", code: "SLE-M4XD-8RTV" },
    ],
    approvedBy: "Nimal",
    approvedAt: "9 Oct, 2:41 PM",
    history: [
      { label: "Tickets emailed", at: "9 Oct, 2:41 PM" },
      { label: "Payment approved", at: "9 Oct, 2:41 PM" },
      { label: "Proof uploaded", at: "9 Oct, 1:24 PM" },
      { label: "Booking created", at: "9 Oct, 1:10 PM" },
    ],
  },
  {
    id: "SL-41751",
    buyer: "Sachini Herath",
    email: "sachini.h@example.com",
    phone: "010-5521-0098",
    tickets: "1 × VIP",
    amount: 55000,
    status: "under_review",
    booked: "Today",
    holders: [],
    history: [{ label: "Proof uploaded", at: "Today, 9:54 AM" }, ...generic("Today, 9:20 AM")],
  },
  {
    id: "SL-41749",
    buyer: "Ruwan Bandara",
    email: "ruwan.b@example.com",
    phone: "010-4412-7731",
    tickets: "3 × General",
    amount: 90000,
    status: "under_review",
    booked: "Today",
    holders: [],
    history: [{ label: "Proof uploaded", at: "Today, 8:47 AM" }, ...generic("Today, 8:30 AM")],
  },
  {
    id: "SL-41747",
    buyer: "Dinesh Kumara",
    email: "dinesh.k@example.com",
    phone: "010-3390-1182",
    tickets: "2 × General",
    amount: 60000,
    status: "awaiting_payment",
    booked: "Yesterday",
    holders: [],
    history: generic("Yesterday, 6:12 PM"),
  },
  {
    id: "SL-41738",
    buyer: "Nadeesha Silva",
    email: "nadeesha.s@example.com",
    phone: "010-7745-2201",
    tickets: "1 × VIP",
    amount: 55000,
    status: "rejected",
    booked: "11 Oct",
    holders: [],
    history: [
      { label: "Proof rejected · amount doesn't match", at: "11 Oct, 3:02 PM" },
      { label: "Proof uploaded", at: "11 Oct, 2:40 PM" },
      ...generic("11 Oct, 2:10 PM"),
    ],
  },
  {
    id: "SL-41721",
    buyer: "Lahiru Mendis",
    email: "lahiru.m@example.com",
    phone: "010-8821-4402",
    tickets: "4 × General",
    amount: 108000,
    status: "paid",
    booked: "8 Oct",
    holders: [
      { name: "Lahiru Mendis", ticket: "General", code: "SLE-K8RT-2WQA" },
      { name: "Chamari Mendis", ticket: "General", code: "SLE-J2HV-6PLM" },
      { name: "Sandun Mendis", ticket: "General", code: "SLE-R9DC-1XZB" },
      { name: "Ishara Mendis", ticket: "General", code: "SLE-T5NY-7GKE" },
    ],
    approvedBy: "Nimal",
    approvedAt: "8 Oct, 5:12 PM",
    history: [
      { label: "Tickets emailed", at: "8 Oct, 5:12 PM" },
      { label: "Payment approved", at: "8 Oct, 5:12 PM" },
      { label: "Proof uploaded", at: "8 Oct, 4:50 PM" },
      ...generic("8 Oct, 4:31 PM"),
    ],
  },
  {
    id: "SL-41702",
    buyer: "Fathima Nazeer",
    email: "fathima.n@example.com",
    phone: "010-6630-9917",
    tickets: "1 × General",
    amount: 30000,
    status: "refunded",
    booked: "5 Oct",
    holders: [],
    history: [{ label: "Refund sent", at: "6 Oct, 11:00 AM" }, ...generic("5 Oct, 9:15 AM")],
  },
  {
    id: "SL-41688",
    buyer: "Tharindu Silva",
    email: "tharindu.s@example.com",
    phone: "010-2209-3345",
    tickets: "2 × VIP",
    amount: 110000,
    status: "paid",
    booked: "3 Oct",
    holders: [
      { name: "Tharindu Silva", ticket: "VIP", code: "SLE-V2MG-8DYE" },
      { name: "Anusha Silva", ticket: "VIP", code: "SLE-W6KP-3CNH" },
    ],
    approvedBy: "Nimal",
    approvedAt: "3 Oct, 7:48 PM",
    history: [
      { label: "Tickets emailed", at: "3 Oct, 7:48 PM" },
      { label: "Payment approved", at: "3 Oct, 7:48 PM" },
      { label: "Proof uploaded", at: "3 Oct, 7:20 PM" },
      ...generic("3 Oct, 6:55 PM"),
    ],
  },
];

export const bookingTabCounts: Record<"all" | OrgBookingStatus, number> = {
  all: 143,
  paid: 118,
  under_review: 7,
  awaiting_payment: 9,
  rejected: 4,
  refunded: 5,
};

/* ---------- Attendees ---------- */

export type Attendee = {
  name: string;
  email: string;
  via?: string;
  ticket: string;
  code: string;
  booking: string;
  state: "not_yet" | "checked_in" | "cancelled";
  note?: string;
};

const baseAttendees: Attendee[] = [
  { name: "Kasun Perera", email: "kasun@example.com", ticket: "General", code: "SLE-7K3F-92QD", booking: "SL-41730", state: "not_yet" },
  { name: "Dilini Perera", email: "", via: "via Kasun Perera", ticket: "General", code: "SLE-M4XD-8RTV", booking: "SL-41730", state: "not_yet" },
  { name: "Tharindu Silva", email: "tharindu.s@example.com", ticket: "VIP", code: "SLE-V2MG-8DYE", booking: "SL-41688", state: "not_yet" },
  { name: "Dilini Gunawardena", email: "dilini.g@example.com", ticket: "General", code: "SLE-N5ZC-4HJU", booking: "SL-41712", state: "not_yet" },
  { name: "Lahiru Mendis", email: "lahiru.m@example.com", ticket: "General", code: "SLE-K8RT-2WQA", booking: "SL-41721", state: "not_yet" },
  { name: "Priyanka Jayasinghe", email: "priyanka.j@example.com", ticket: "Student", code: "SLE-B3NE-7UYP", booking: "SL-41699", state: "not_yet" },
  {
    name: "Fathima Nazeer",
    email: "fathima.n@example.com",
    ticket: "General",
    code: "SLE-P7AS-3LXK",
    booking: "SL-41702",
    state: "cancelled",
    note: "Refunded 6 Oct",
  },
];

/** 21 rows so the pager has three pages; rows after the first seven are generated placeholders. */
export const attendees: Attendee[] = [
  ...baseAttendees,
  ...Array.from({ length: 14 }, (_, i): Attendee => {
    const first = ["Amila", "Sanduni", "Kavindu", "Nilmini", "Chathura", "Hiruni", "Buddhika"][i % 7]!;
    const last = ["Wickramasinghe", "Fernando", "Jayawardena", "Rajapaksha", "Peiris"][i % 5]!;
    const ticket = ["General", "General", "VIP", "General", "Student"][i % 5]!;
    return {
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
      ticket,
      code: `SLE-${String(1000 + i * 37).slice(-4).replace(/\d/g, (d) => "ABCDEFGHJK"[Number(d)]!)}-${2000 + i * 53}`,
      booking: `SL-${41600 + i * 3}`,
      state: i % 6 === 0 ? "checked_in" : "not_yet",
    };
  }),
];

export const attendeeStats = {
  total: 228,
  paidBookings: 118,
  checkedIn: 0,
  vip: 42,
  unpaidTickets: 14,
  ticketsListed: 229,
};

/* ---------- Scanner ---------- */

export type ScanOutcome = "admit" | "already_used" | "wrong_event" | "not_found";

export type ScanRecord = {
  outcome: ScanOutcome;
  name: string;
  detail: string;
  time: string;
};

export const recentScans: ScanRecord[] = [
  { outcome: "admit", name: "Tharindu Silva", detail: "VIP", time: "6:41 PM" },
  { outcome: "admit", name: "Dilini Gunawardena", detail: "General", time: "6:40 PM" },
  { outcome: "already_used", name: "Asanka Mendis", detail: "General", time: "6:38 PM" },
  { outcome: "wrong_event", name: "Roshan Pathirana", detail: "Baila Night", time: "6:36 PM" },
  { outcome: "admit", name: "Kasun Perera", detail: "General", time: "6:35 PM" },
];

export const gates = ["Main door", "VIP entrance", "Side door"];

/* ---------- Ticket types ---------- */

export type OrgTicketType = {
  id: string;
  name: string;
  perk: string;
  summary: string; // shown as "What buyers get"
  color: string; // tailwind bg class
  price: number;
  quantity: number;
  sold: number;
  held: number;
  salesStart: string;
  salesEnd: string;
  maxPerOrder: number;
  hidden: boolean;
  paused: boolean;
};

export const orgTicketTypes: OrgTicketType[] = [
  {
    id: "vip",
    name: "VIP",
    perk: "Front seats",
    summary: "Front seats and meet-and-greet",
    color: "bg-gold",
    price: 55000,
    quantity: 50,
    sold: 42,
    held: 3,
    salesStart: "1 Oct 2026",
    salesEnd: "13 Nov 2026",
    maxPerOrder: 6,
    hidden: false,
    paused: false,
  },
  {
    id: "general",
    name: "General",
    perk: "Standing area",
    summary: "Standing area",
    color: "bg-white",
    price: 30000,
    quantity: 250,
    sold: 126,
    held: 11,
    salesStart: "1 Oct 2026",
    salesEnd: "13 Nov 2026",
    maxPerOrder: 10,
    hidden: false,
    paused: false,
  },
  {
    id: "student",
    name: "Student",
    perk: "ID at the door",
    summary: "Valid student ID needed at the door",
    color: "bg-stone-400",
    price: 20000,
    quantity: 60,
    sold: 60,
    held: 0,
    salesStart: "1 Oct 2026",
    salesEnd: "13 Nov 2026",
    maxPerOrder: 2,
    hidden: false,
    paused: false,
  },
];

/* ---------- Pricing ---------- */

export type PricePhase = {
  id: string;
  name: string;
  state: "ended" | "current" | "upcoming";
  when: string;
  general: number;
  vip: number;
};

export const pricePhases: PricePhase[] = [
  { id: "early", name: "Early bird", state: "ended", when: "1 Oct – 15 Oct 2026 · or first 100 tickets", general: 25000, vip: 48000 },
  { id: "regular", name: "Regular", state: "current", when: "16 Oct – 13 Nov 2026", general: 30000, vip: 55000 },
  { id: "door", name: "At the door", state: "upcoming", when: "14 Nov 2026 · bank transfer on the day", general: 35000, vip: 60000 },
];

export type PromoCode = {
  code: string;
  kind: "percent" | "amount";
  value: number;
  used: number;
  limit: number;
  validUntil: string;
};

export const promoCodes: PromoCode[] = [
  { code: "LANKA10", kind: "percent", value: 10, used: 23, limit: 100, validUntil: "13 Nov 2026" },
  { code: "ANSAN5K", kind: "amount", value: 5000, used: 8, limit: 30, validUntil: "31 Oct 2026" },
  { code: "VOLUNTEER", kind: "percent", value: 100, used: 12, limit: 12, validUntil: "14 Nov 2026" },
];

/* ---------- Dashboard ---------- */

export const dashboardStats = {
  ticketsSold: 398,
  soldThisWeek: 71,
  revenue: 11550000,
  revenueThisWeek: 1980000,
  waiting: 12,
  waitingAmount: 540000,
  ticketsLeft: 202,
  ticketsTotal: 600,
};

/** Tickets sold per day, oldest first; the last value is today (13 Oct 2026). */
export const dailySales: { date: string; label: string; value: number }[] = (() => {
  const values = [
    9, 7, 12, 10, 14, 8, 13, 17, 12, 16, 11, 19, 15, 22, 14, 18, 24, 20, 26, 6, 11, 8, 18, 15, 26, 22, 13, 18, 28, 24, 32, 38, 52,
  ];
  const days = values.slice(-30);
  const end = new Date(Date.UTC(2026, 9, 13));
  return days.map((value, i) => {
    const d = new Date(end.getTime() - (days.length - 1 - i) * 86400000);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    return { date: d.toISOString().slice(0, 10), label, value };
  });
})();

export const salesByTicket = [
  { label: "General · Music Night", event: "music-night", sold: 126, of: 250 },
  { label: "VIP · Music Night", event: "music-night", sold: 42, of: 50 },
  { label: "Student · Music Night", event: "music-night", sold: 60, of: 60 },
  { label: "Regular · Baila Night", event: "baila-night", sold: 88, of: 200 },
  { label: "Early bird · Baila Night", event: "baila-night", sold: 82, of: 100 },
];

export const reportOptions = [
  { id: "sales", title: "Sales summary", hint: "PDF · totals by event and ticket type" },
  { id: "bookings", title: "All bookings", hint: "Excel · one row per booking" },
  { id: "attendees", title: "Attendee list", hint: "Excel · names, tickets, check-in" },
  { id: "verification", title: "Payment verification log", hint: "CSV · who approved what and when" },
] as const;

/* ---------- Event editor ---------- */

export const eventCategories = ["Concert", "Party", "Cricket", "Culture", "Movies", "Food", "Travel", "Community"];

export const changeHistory = [
  { label: "VIP quantity 40 → 50", meta: "Nimal · 2 Oct" },
  { label: "Early bird price ended", meta: "Automatic · 16 Oct" },
  { label: "Event published", meta: "SL Events · 30 Sep" },
];

/* ---------- Seat map ---------- */

export type SeatSection = {
  id: string;
  name: string;
  color: string; // hex
  price: number;
  rows: string; // "A to H"
  seatsPerRow: number;
  aisleAfter: number;
  numbering: "1 → 16" | "16 → 1" | "Odd / even";
  seatType: "Single" | "Couple";
};

export const seatSectionTemplates: Record<string, SeatSection[]> = {
  "Theatre with balcony": [
    { id: "odc", name: "ODC", color: "#ece7dc", price: 30000, rows: "A to H", seatsPerRow: 16, aisleAfter: 8, numbering: "1 → 16", seatType: "Single" },
    { id: "balcony", name: "Balcony", color: "#f7cb60", price: 45000, rows: "J to L", seatsPerRow: 16, aisleAfter: 8, numbering: "1 → 16", seatType: "Single" },
    { id: "couple", name: "Couple", color: "#f28b82", price: 70000, rows: "M to M", seatsPerRow: 7, aisleAfter: 3, numbering: "1 → 16", seatType: "Couple" },
  ],
  "Single-level hall": [
    { id: "stalls", name: "Stalls", color: "#ece7dc", price: 25000, rows: "A to J", seatsPerRow: 14, aisleAfter: 7, numbering: "1 → 16", seatType: "Single" },
  ],
  "Empty map": [],
};

export const sectionColors = ["#ece7dc", "#f7cb60", "#f28b82", "#4ade80", "#60a5fa"];

/** Unique-enough client-side id for mock records created in the UI. The API will issue real ids. */
export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}
