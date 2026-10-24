import type { CategoryId } from "@core/data";
import { GATES } from "@core/operations";
import { attendees } from "@core/organizer";

/**
 * Door-staff mock data: the events an organizer assigned, the tickets that exist for them, and the entry numbers
 * already recorded before this phone started scanning. All of it becomes API data later; the shapes mirror what the
 * server should return. The server, not the phone, must decide whether a ticket is valid and mark it used.
 */

export type StaffEvent = {
  id: string;
  /** The public event this is, so tickets customers booked in this app can be recognised at the door. */
  slug: string;
  title: string;
  category: CategoryId;
  icon: "mic" | "headset-outline" | "color-palette-outline" | "calendar-outline";
  dateLabel: string;
  doorsLabel: string;
  venue: string;
  /** The door this staff member is posted at. */
  gate: string;
  gates: string[];
  phase: "today" | "upcoming" | "past";
  inLabel?: string;
  expected: number;
  doorsOpened: string;
  /** Entry numbers recorded before this phone's own scans. */
  base: {
    checkedIn: number;
    rejected: number;
    perMinute: number;
    byType: { label: string; in: number; of: number }[];
    byGate: { label: string; staff: string; in: number }[];
  };
};

export const staffEvents: StaffEvent[] = [
  {
    id: "music-night",
    slug: "sri-lankan-music-night",
    title: "Sri Lankan Music Night",
    category: "concert",
    icon: "mic",
    dateLabel: "Sat, 14 Nov",
    doorsLabel: "Doors 5:30 PM",
    venue: "Hongdae Live Hall",
    gate: "Main door",
    gates: [...GATES],
    phase: "today",
    expected: 228,
    doorsOpened: "5:30 PM",
    base: {
      checkedIn: 86,
      rejected: 7,
      perMinute: 4,
      byType: [
        { label: "General", in: 62, of: 126 },
        { label: "VIP", in: 18, of: 42 },
        { label: "Student", in: 6, of: 60 },
      ],
      byGate: [
        { label: "Main door", staff: "Ishara, Kavindu", in: 71 },
        { label: "VIP entrance", staff: "Roshan", in: 15 },
      ],
    },
  },
  {
    id: "baila-night",
    slug: "baila-night",
    title: "Baila Night",
    category: "party",
    icon: "headset-outline",
    dateLabel: "Sat, 28 Nov",
    doorsLabel: "Doors 7:30 PM",
    venue: "Songdo Event Hall",
    gate: "VIP entrance",
    gates: ["Main door", "VIP entrance"],
    phase: "upcoming",
    inLabel: "In 14 days",
    expected: 170,
    doorsOpened: "7:30 PM",
    base: { checkedIn: 0, rejected: 0, perMinute: 0, byType: [], byGate: [] },
  },
  {
    id: "cultural-festival",
    slug: "sri-lankan-cultural-festival",
    title: "Sri Lankan Cultural Festival",
    category: "culture",
    icon: "color-palette-outline",
    dateLabel: "Sun, 6 Dec",
    doorsLabel: "Gates 10:30 AM",
    venue: "Taehwa River Grand Park",
    gate: "North gate",
    gates: ["North gate", "South gate"],
    phase: "upcoming",
    inLabel: "In 22 days",
    expected: 341,
    doorsOpened: "10:30 AM",
    base: { checkedIn: 0, rejected: 0, perMinute: 0, byType: [], byGate: [] },
  },
  {
    id: "deepavali-lights-night",
    slug: "deepavali-lights-night",
    title: "Deepavali Lights Night",
    category: "culture",
    icon: "calendar-outline",
    dateLabel: "Sun, 8 Nov",
    doorsLabel: "Doors 6:00 PM",
    venue: "Guro Arts Hall",
    gate: "Main door",
    gates: ["Main door"],
    phase: "past",
    expected: 150,
    doorsOpened: "6:00 PM",
    base: {
      checkedIn: 132,
      rejected: 4,
      perMinute: 0,
      byType: [
        { label: "General", in: 110, of: 120 },
        { label: "VIP", in: 22, of: 30 },
      ],
      byGate: [{ label: "Main door", staff: "Ishara, Kavindu", in: 132 }],
    },
  },
];

export const staffEvent = (id: string) => staffEvents.find((e) => e.id === id);

/* ------------------------------------- tickets ------------------------------------- */

export type TicketInfo = {
  code: string;
  name: string;
  ticket: string;
  booking: string;
  state: "valid" | "cancelled" | "unpaid";
  /** "6 Oct": when a cancelled ticket was cancelled. */
  cancelledOn?: string;
  /** Set for tickets that belong to another event. */
  otherEvent?: string;
  /** Scanned before this phone started. */
  firstScan?: { time: string; gate: string; by: string };
};

/** Where each kind of ticket may enter and where it sits. */
export const ticketRules: Record<string, { gate: string | null; area: string; allowedAt: string }> = {
  VIP: { gate: "VIP entrance", area: "Front seats", allowedAt: "VIP entrance only" },
  General: { gate: null, area: "Standing", allowedAt: "Any door except VIP" },
  Student: { gate: null, area: "Standing", allowedAt: "Any door except VIP" },
};
export const ruleFor = (ticket: string) => ticketRules[ticket] ?? ticketRules.General!;

/** Extra tickets so each result screen can be tried. Codes follow the real format: SLE- plus two groups of four. */
const extras: TicketInfo[] = [
  { code: "SLE-H8QP-5ZVC", name: "Sachini Herath", ticket: "VIP", booking: "SL-41690", state: "valid" },
  { code: "SLE-Q4HZ-6TNB", name: "Asanka Mendis", ticket: "General", booking: "SL-41655", state: "valid", firstScan: { time: "6:38 PM", gate: "Main door", by: "Kavindu R." } },
  { code: "SLE-D2WL-9RXE", name: "Dinesh Kumara", ticket: "General", booking: "SL-41747", state: "unpaid" },
  { code: "SLE-Q8JZ-5WRN", name: "Roshan Pathirana", ticket: "General", booking: "SL-41702", state: "valid", otherEvent: "Baila Night" },
];

/** The ticket list for an event. The Music Night list is the organizer's attendee list; others start empty. */
export function directoryFor(eventId: string): TicketInfo[] {
  if (eventId !== "music-night") return [];
  const fromAttendees: TicketInfo[] = attendees.map((a) => ({
    code: a.code,
    name: a.name,
    ticket: a.ticket,
    booking: a.booking,
    state: a.state === "cancelled" ? "cancelled" : "valid",
    cancelledOn: a.state === "cancelled" ? (a.note ?? "").replace(/^Cancelled\s*/i, "") || undefined : undefined,
    firstScan: a.state === "checked_in" ? { time: "6:20 PM", gate: "Main door", by: "Kavindu R." } : undefined,
  }));
  return [...fromAttendees, ...extras];
}

/** Codes worth trying on a demo phone: one per result screen. */
export const demoCodes = [
  { code: "SLE-7K3F-92QD", label: "Valid · General" },
  { code: "SLE-V2MG-8DYE", label: "Valid · VIP (use VIP entrance)" },
  { code: "SLE-Q4HZ-6TNB", label: "Already scanned" },
  { code: "SLE-H8QP-5ZVC", label: "VIP at the wrong door" },
  { code: "SLE-D2WL-9RXE", label: "Not paid yet" },
  { code: "SLE-P7AS-3LXK", label: "Cancelled" },
  { code: "SLE-Q8JZ-5WRN", label: "Another event" },
  { code: "HELLO-123", label: "Not a ticket" },
];

/** Entries shown in "Recent scans" before this phone has scanned anything. */
export const seedLog: { id: string; time: string; name: string; ticket: string; gate: string; outcome: Outcome }[] = [
  { id: "s1", time: "6:41 PM", name: "Tharindu Silva", ticket: "VIP", gate: "Main door", outcome: "admit" },
  { id: "s2", time: "6:40 PM", name: "Dilini Gunawardena", ticket: "General", gate: "Main door", outcome: "admit" },
  { id: "s3", time: "6:38 PM", name: "Asanka Mendis", ticket: "General", gate: "Main door", outcome: "already_used" },
  { id: "s4", time: "6:36 PM", name: "Dinesh Kumara", ticket: "General", gate: "Main door", outcome: "not_paid" },
  { id: "s5", time: "6:35 PM", name: "Kasun Perera", ticket: "General", gate: "Main door", outcome: "admit" },
];

export type Outcome = "admit" | "already_used" | "invalid" | "wrong_entrance" | "wrong_event" | "not_paid" | "cancelled";

export const outcomeMeta: Record<Outcome, { short: string; refused: boolean }> = {
  admit: { short: "Admit", refused: false },
  already_used: { short: "Used", refused: true },
  invalid: { short: "Invalid", refused: true },
  wrong_entrance: { short: "Wrong door", refused: true },
  wrong_event: { short: "Wrong event", refused: true },
  not_paid: { short: "Not paid", refused: true },
  cancelled: { short: "Cancelled", refused: true },
};
