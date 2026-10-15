// Event-day operations: staff, entry statistics and permitted settings. Mock data until the API exists.
// The Music Night numbers are chosen to agree with the scanner screen (86 in, 142 to arrive, 3 rejected).

export const GATES = ["Main door", "VIP entrance", "Side door"] as const;

export type StaffRole = "gate_lead" | "scanner" | "support";
export type StaffStatus = "active" | "invited" | "suspended";

export type StaffMember = {
  id: string;
  name: string;
  /** Email or phone the invite was sent to. */
  contact: string;
  role: StaffRole;
  /** null for roles that aren't tied to a door (support). */
  gate: string | null;
  status: StaffStatus;
  scans: number;
  lastScan?: string;
  /** Access window on the event day, "HH:MM" in Korea time. Access ends automatically after it. */
  accessFrom: string;
  accessUntil: string;
};

export const roleMeta: Record<
  StaffRole,
  { label: string; summary: string; can: { scan: boolean; manual: boolean; attendees: boolean; stats: boolean } }
> = {
  gate_lead: {
    label: "Gate lead",
    summary: "Runs a door: scans, checks people in by hand and sees entry numbers.",
    can: { scan: true, manual: true, attendees: true, stats: true },
  },
  scanner: {
    label: "Scanner",
    summary: "Scans QR tickets at a door. Sees only the result of each scan.",
    can: { scan: true, manual: false, attendees: false, stats: false },
  },
  support: {
    label: "Help desk",
    summary: "Looks guests up by name and checks them in by hand. Cannot scan.",
    can: { scan: false, manual: true, attendees: true, stats: false },
  },
};

export const permissionLabels: { key: keyof (typeof roleMeta)["gate_lead"]["can"]; label: string }[] = [
  { key: "scan", label: "Scan QR tickets" },
  { key: "manual", label: "Check in by hand" },
  { key: "attendees", label: "See the attendee list" },
  { key: "stats", label: "See entry statistics" },
];

export type OpsSettings = {
  /** When scanners start accepting tickets. */
  checkInOpens: string;
  /** "none" or an "HH:MM" after which entry is refused. */
  lateCutoff: string;
  manualCheckIn: boolean;
  allowReentry: boolean;
  showGuestNames: boolean;
  studentIdCheck: boolean;
  soundFeedback: boolean;
  scannerLinkExpiry: "midnight" | "dawn" | "event_end";
  /** Alert the organizer when check-ins reach this share of tickets sold. */
  capacityAlertPct: number;
};

export const defaultSettings: OpsSettings = {
  checkInOpens: "17:00",
  lateCutoff: "none",
  manualCheckIn: true,
  allowReentry: false,
  showGuestNames: true,
  studentIdCheck: true,
  soundFeedback: true,
  scannerLinkExpiry: "midnight",
  capacityAlertPct: 90,
};

/** Rules SL Events controls for everyone. Shown so organizers know why they can't change them. */
export const lockedSettings = [
  { label: "Ticket QR codes", reason: "Each QR is single-use and checked on SL Events servers, so it can't be switched off." },
  { label: "Ticket transfers", reason: "Names on tickets can only be changed by SL Events support before the event." },
  { label: "Payment confirmation", reason: "Only verified bank transfers produce tickets. Staff cannot approve payments." },
];

export type ActivityItem = {
  id: string;
  kind: "scan" | "staff" | "setting" | "system";
  text: string;
  time: string;
};

export type EventOps = {
  staff: StaffMember[];
  settings: OpsSettings;
  activity: ActivityItem[];
};

const musicNightStaff: StaffMember[] = [
  { id: "st-1", name: "Kasun Wijesinghe", contact: "kasun.w@example.com", role: "gate_lead", gate: "Main door", status: "active", scans: 38, lastScan: "6:41 PM", accessFrom: "16:30", accessUntil: "23:30" },
  { id: "st-2", name: "Malsha Perera", contact: "010-3321-4402", role: "scanner", gate: "Main door", status: "active", scans: 23, lastScan: "6:40 PM", accessFrom: "16:30", accessUntil: "23:30" },
  { id: "st-3", name: "Dilan Fernando", contact: "dilan.f@example.com", role: "scanner", gate: "VIP entrance", status: "active", scans: 19, lastScan: "6:36 PM", accessFrom: "16:30", accessUntil: "23:30" },
  { id: "st-4", name: "Ishara Jayasuriya", contact: "010-7709-1185", role: "scanner", gate: "Side door", status: "active", scans: 6, lastScan: "6:12 PM", accessFrom: "16:30", accessUntil: "23:30" },
  { id: "st-5", name: "Nuwan Abeysekara", contact: "nuwan.a@example.com", role: "support", gate: null, status: "invited", scans: 0, accessFrom: "16:30", accessUntil: "23:30" },
];

const musicNightActivity: ActivityItem[] = [
  { id: "a-1", kind: "scan", text: "Tharindu Silva (VIP) admitted at VIP entrance by Dilan Fernando", time: "6:41 PM" },
  { id: "a-2", kind: "scan", text: "Ticket SLE-N5ZC-4HJU was already used. Refused at Main door", time: "6:38 PM" },
  { id: "a-3", kind: "staff", text: "Ishara Jayasuriya started scanning at Side door", time: "6:12 PM" },
  { id: "a-4", kind: "system", text: "Doors opened. Check-in is live", time: "5:30 PM" },
  { id: "a-5", kind: "staff", text: "Nuwan Abeysekara was invited as Help desk", time: "Yesterday" },
];

export function seedOps(eventId: string): EventOps {
  if (eventId === "music-night") {
    return { staff: musicNightStaff, settings: defaultSettings, activity: musicNightActivity };
  }
  return { staff: [], settings: defaultSettings, activity: [] };
}

/* ---------- Entry statistics ---------- */

export type EntryStats = {
  expected: number;
  checkedIn: number;
  rejected: { already_used: number; wrong_event: number; not_found: number };
  byType: { label: string; in: number; of: number }[];
  byGate: { label: string; in: number }[];
  /** 15-minute slots from the time the doors opened. */
  timeline: { label: string; value: number }[];
  /** Whether doors have opened (otherwise the numbers are empty by design). */
  live: boolean;
};

export function statsFor(eventId: string, expected: number): EntryStats {
  if (eventId === "music-night") {
    return {
      expected: 228,
      checkedIn: 86,
      rejected: { already_used: 2, wrong_event: 1, not_found: 0 },
      byType: [
        { label: "General", in: 48, of: 126 },
        { label: "VIP", in: 21, of: 42 },
        { label: "Student", in: 17, of: 60 },
      ],
      byGate: [
        { label: "Main door", in: 61 },
        { label: "VIP entrance", in: 19 },
        { label: "Side door", in: 6 },
      ],
      timeline: [
        { label: "5:30", value: 8 },
        { label: "5:45", value: 17 },
        { label: "6:00", value: 29 },
        { label: "6:15", value: 21 },
        { label: "6:30", value: 11 },
      ],
      live: true,
    };
  }
  return {
    expected,
    checkedIn: 0,
    rejected: { already_used: 0, wrong_event: 0, not_found: 0 },
    byType: [],
    byGate: GATES.map((g) => ({ label: g, in: 0 })),
    timeline: [],
    live: false,
  };
}

/** "17:30" → "5:30 PM". Returns the input untouched if it isn't HH:MM. */
export function formatClock(t: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return t;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? "PM" : "AM"}`;
}

export const staffInitials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
