/**
 * Mock data for the platform admin portal (the owner and SL Events staff). Shapes mirror what the API should return.
 * There are no refunds anywhere in this portal: the client asked for the refund option to be removed from the system.
 */

export const ADMIN = { name: "Sanduni Perera", initials: "SP", email: "sanduni@slevents.kr", role: "Owner" };

/* ---------------------------------- dashboard ---------------------------------- */

export const dashboardStats = {
  totalUsers: 4128,
  newUsers: 212,
  activeOrganizers: 23,
  organizersWaiting: 3,
  upcomingEvents: 14,
  eventsWaiting: 2,
  ticketsSold: 1427,
  ticketSales: 38_420_000,
  paymentsToConfirm: 12,
  oldestWaiting: "5 h",
};

/** Tickets sold per day for the last 30 days, oldest first. */
export const ticketsPerDay = [20, 27, 16, 24, 35, 52, 60, 22, 24, 28, 30, 48, 68, 78, 26, 26, 32, 38, 50, 88, 30, 34, 26, 30, 58, 84, 92, 36, 48, 55];

export const topEvents = [
  { name: "Sri Lankan Music Night", organizer: "Lanka Beats Korea", sold: 228, capacity: 360, sales: 7_350_000 },
  { name: "Sri Lankan Cultural Festival", organizer: "SL Events", sold: 341, capacity: 880, sales: 5_935_000 },
  { name: "Sri Lanka Cricket Cup", organizer: "SL Events", sold: 224, capacity: 416, sales: 3_920_000 },
  { name: "Baila Night", organizer: "Lanka Beats Korea", sold: 170, capacity: 300, sales: 4_200_000 },
];

export const platformActivity = [
  { icon: "payments", text: "Ishara confirmed 6 payments", sub: "Payments staff", time: "12 min ago" },
  { icon: "users", text: "38 new customer accounts", sub: "Today", time: "since midnight" },
  { icon: "event", text: "Nimal edited Sri Lankan Music Night", sub: "Organizer · start time", time: "1 h ago" },
  { icon: "organizer", text: "Busan Lions Cricket Club applied", sub: "Organizer application", time: "3 days ago" },
  { icon: "settings", text: "You changed the seat hold to 24 hours", sub: "Settings", time: "5 days ago" },
] as const;

/* ---------------------------------- organizers ---------------------------------- */

export type AppStatus = "new" | "info_asked" | "approved" | "rejected" | "suspended";

export type OrganizerApp = {
  id: string;
  name: string;
  initials: string;
  contact: string;
  email: string;
  phone: string;
  city: string;
  kind: string;
  registration: string;
  expectedEvents: string;
  about: string;
  applied: string;
  ago: string;
  status: AppStatus;
  documents: { title: string; detail: string }[];
  checks: string[];
  /** Set when this application came from the public form, so the decision can be sent back to the applicant. */
  publicRef?: string;
};

export const seedApplications: OrganizerApp[] = [
  {
    id: "busan-lions",
    name: "Busan Lions Cricket Club",
    initials: "BL",
    contact: "Tharushi Silva",
    email: "tharushi@example.com",
    phone: "010-4567-8901 · verified",
    city: "Busan",
    kind: "Community sports club",
    registration: "Not registered (club)",
    expectedEvents: "4 per year · 150–400 people",
    about:
      "We run weekend cricket for Sri Lankan workers in Busan and Gimhae. We want to sell tickets for our December tournament and a New Year party.",
    applied: "Applied 16 Oct 2026, 7:20 PM",
    ago: "3 days ago",
    status: "new",
    documents: [
      { title: "ID card (Alien Registration Card)", detail: "ARC · front and back · uploaded 16 Oct" },
      { title: "Bank account for payouts", detail: "Busan Bank · TSILVA LIONS · statement uploaded" },
      { title: "Past event photo", detail: "December 2025 tournament" },
    ],
    checks: ["Name on ID matches the applicant", "Phone number verified", "Bank account name matches", "Past event looks genuine"],
  },
  {
    id: "daegu-sinhala",
    name: "Daegu Sinhala School",
    initials: "DS",
    contact: "Roshan Pathirana",
    email: "roshan@example.com",
    phone: "010-2233-4455 · verified",
    city: "Daegu",
    kind: "Community school",
    registration: "Registered non-profit",
    expectedEvents: "2 per year · 80–150 people",
    about: "A weekend school for Sri Lankan children. We want to sell tickets to our Avurudu show and annual concert.",
    applied: "Applied 14 Oct 2026, 11:05 AM",
    ago: "5 days ago",
    status: "info_asked",
    documents: [
      { title: "ID card (Alien Registration Card)", detail: "ARC · front and back · uploaded 14 Oct" },
      { title: "Bank account for payouts", detail: "Shinhan · school account · statement uploaded" },
    ],
    checks: ["Name on ID matches the applicant", "Phone number verified", "Bank account name matches", "Past event looks genuine"],
  },
  {
    id: "tamil-arts",
    name: "Tamil Arts Seoul",
    initials: "TA",
    contact: "Kavitha Sivakumar",
    email: "kavitha@example.com",
    phone: "010-7788-9900 · verified",
    city: "Seoul",
    kind: "Arts group",
    registration: "Not registered (group)",
    expectedEvents: "3 per year · 100–250 people",
    about: "Bharatanatyam and folk music evenings for the Tamil community in Seoul.",
    applied: "Applied 13 Oct 2026, 4:40 PM",
    ago: "6 days ago",
    status: "new",
    documents: [
      { title: "ID card (Alien Registration Card)", detail: "ARC · front and back · uploaded 13 Oct" },
      { title: "Past event photo", detail: "Pongal 2026 programme" },
    ],
    checks: ["Name on ID matches the applicant", "Phone number verified", "Bank account name matches", "Past event looks genuine"],
  },
];

const approved = (id: string, name: string, initials: string, contact: string, city: string, ago: string): OrganizerApp => ({
  id,
  name,
  initials,
  contact,
  email: `${id}@example.com`,
  phone: "verified",
  city,
  kind: "Approved organizer",
  registration: "Checked",
  expectedEvents: "Ongoing",
  about: `${name} is an approved organizer.`,
  applied: `Approved ${ago}`,
  ago,
  status: "approved",
  documents: [],
  checks: [],
});

export const seedApproved: OrganizerApp[] = [
  approved("lanka-beats", "Lanka Beats Korea", "LB", "Nimal Fernando", "Seoul", "Aug 2025"),
  approved("sl-events", "SL Events", "SE", "Sanduni Perera", "Seoul", "Aug 2025"),
  approved("ansan-arts", "Ansan Arts Society", "AA", "Priyani Jayawardena", "Ansan", "Sep 2025"),
  approved("guro-film", "Guro Film Club", "GF", "Dinesh Karunaratne", "Seoul", "Nov 2025"),
  approved("ulsan-community", "Ulsan Sri Lankan Community", "UC", "Chaminda Perera", "Ulsan", "Jan 2026"),
];

export const seedSuspended: OrganizerApp[] = [
  { ...approved("night-owls", "Night Owls Events", "NO", "Sameera Wickrama", "Incheon", "Mar 2026"), status: "suspended", about: "Suspended after repeated buyer reports." },
];

export const seedRejected: OrganizerApp[] = [
  { ...approved("quick-tix", "Quick Tix", "QT", "Unknown", "Seoul", "Jun 2026"), status: "rejected", about: "Could not verify the applicant." },
  { ...approved("party-hub", "Party Hub", "PH", "Anjana Silva", "Busan", "Jul 2026"), status: "rejected", about: "No past events and no contact we could verify." },
];

export const organizerTabCounts = { approved: 23, suspended: 1, rejected: 4 };

/* ------------------------------------ events ------------------------------------ */

export type AdminEventStatus = "live" | "review" | "draft" | "unpublished" | "cancelled" | "ended";

export type AdminEvent = {
  id: string;
  title: string;
  organizer: string;
  date: string;
  status: AdminEventStatus;
  sold: number;
  capacity: number;
  category: string;
  tag?: string;
  when: string;
  venue: string;
  slug?: string;
  inventory: { name: string; price: number; sold: number; capacity: number }[];
  held: number;
  reports?: { count: number; text: string; detail: string };
};

export const seedEvents: AdminEvent[] = [
  {
    id: "baila-night",
    title: "Baila Night",
    organizer: "Lanka Beats Korea",
    date: "28 Nov",
    status: "live",
    sold: 170,
    capacity: 300,
    category: "party",
    tag: "FEW LEFT",
    when: "Sat, 28 Nov 2026",
    venue: "Songdo Event Hall",
    slug: "baila-night",
    inventory: [
      { name: "Early bird", price: 20000, sold: 100, capacity: 100 },
      { name: "Regular", price: 25000, sold: 70, capacity: 200 },
    ],
    held: 9,
    reports: { count: 2, text: "2 reports from buyers", detail: '"The poster says ₩20,000 but checkout shows ₩25,000." · 2 buyers, 17–18 Oct' },
  },
  {
    id: "deepavali",
    title: "Deepavali Lights Night",
    organizer: "Lanka Beats Korea",
    date: "8 Nov",
    status: "review",
    sold: 0,
    capacity: 150,
    category: "culture",
    when: "Sun, 8 Nov 2026",
    venue: "Guro Arts Hall",
    inventory: [{ name: "General", price: 15000, sold: 0, capacity: 150 }],
    held: 0,
  },
  {
    id: "kandyan-gala",
    title: "Kandyan Dance Gala 2026",
    organizer: "Ansan Arts Society",
    date: "19 Dec",
    status: "review",
    sold: 0,
    capacity: 181,
    category: "culture",
    when: "Sat, 19 Dec 2026",
    venue: "Ansan Arts Center",
    inventory: [
      { name: "VIP", price: 55000, sold: 0, capacity: 31 },
      { name: "General", price: 30000, sold: 0, capacity: 150 },
    ],
    held: 0,
  },
  {
    id: "music-night",
    title: "Sri Lankan Music Night",
    organizer: "Lanka Beats Korea",
    date: "14 Nov",
    status: "live",
    sold: 228,
    capacity: 360,
    category: "concert",
    when: "Sat, 14 Nov 2026",
    venue: "Hongdae Live Hall",
    slug: "sri-lankan-music-night",
    inventory: [
      { name: "General", price: 30000, sold: 168, capacity: 250 },
      { name: "VIP", price: 55000, sold: 42, capacity: 50 },
      { name: "Student", price: 20000, sold: 18, capacity: 60 },
    ],
    held: 7,
  },
  {
    id: "cultural-festival",
    title: "Sri Lankan Cultural Festival",
    organizer: "SL Events",
    date: "6 Dec",
    status: "live",
    sold: 341,
    capacity: 880,
    category: "culture",
    when: "Sun, 6 Dec 2026",
    venue: "Taehwa River Grand Park",
    slug: "sri-lankan-cultural-festival",
    inventory: [{ name: "Entry", price: 5000, sold: 341, capacity: 880 }],
    held: 12,
  },
  {
    id: "cricket-cup",
    title: "Sri Lanka Cricket Cup",
    organizer: "SL Events",
    date: "22 Nov",
    status: "live",
    sold: 224,
    capacity: 416,
    category: "cricket",
    when: "Sun, 22 Nov 2026",
    venue: "Samnak Riverside Ground",
    slug: "sri-lanka-cricket-cup",
    inventory: [{ name: "Spectator", price: 10000, sold: 224, capacity: 416 }],
    held: 4,
  },
  {
    id: "jeju-trip",
    title: "Jeju Autumn Trip",
    organizer: "SL Events",
    date: "21 Nov",
    status: "unpublished",
    sold: 34,
    capacity: 40,
    category: "travel",
    when: "Sat, 21 Nov 2026",
    venue: "Gimpo Airport",
    inventory: [{ name: "Traveller", price: 120000, sold: 34, capacity: 40 }],
    held: 0,
  },
  {
    id: "sinhala-movie",
    title: "Sinhala Movie Screening",
    organizer: "Guro Film Club",
    date: "21 Nov",
    status: "cancelled",
    sold: 0,
    capacity: 120,
    category: "movies",
    when: "Sat, 21 Nov 2026",
    venue: "Guro Digital Cinema",
    inventory: [{ name: "Regular", price: 12000, sold: 0, capacity: 120 }],
    held: 0,
  },
];

export const eventTabCounts = { all: 31, review: 2, live: 14, draft: 4, unpublished: 2, cancelled: 1, ended: 8 };

/* ----------------------------------- payments ----------------------------------- */

export type MatchState = "matched" | "differs" | "possible" | "none";

export type BankRow = {
  id: string;
  deposit: string;
  sender: string;
  amount: number;
  memo: string;
  match: MatchState;
  note: string;
  booking?: string;
  due?: number;
};

export const bankRows: BankRow[] = [
  { id: "b1", deposit: "Today 9:51", sender: "SACHINI HERATH", amount: 55000, memo: "SL-41751", match: "matched", note: "SL-41751 · proof uploaded", booking: "SL-41751" },
  { id: "b2", deposit: "Today 8:20", sender: "RUWAN BANDARA", amount: 90000, memo: "SL-41749", match: "matched", note: "SL-41749 · proof uploaded", booking: "SL-41749" },
  { id: "b3", deposit: "Today 7:02", sender: "ASANKA M.", amount: 20000, memo: "SL-41698", match: "differs", note: "Booking is ₩25,000 · ₩5,000 short", booking: "SL-41698", due: 25000 },
  { id: "b4", deposit: "Yesterday", sender: "KAVINDU RATH", amount: 30000, memo: "", match: "possible", note: "Possible: SL-41742 Gayani Rathnayake" },
  { id: "b5", deposit: "Yesterday", sender: "JANITH E.", amount: 45000, memo: "SL-4170", match: "none", note: "No booking SL-4170 · typo?" },
  { id: "b6", deposit: "17 Oct", sender: "M. FERNANDO", amount: 30000, memo: "", match: "none", note: "No booking found" },
];

export const gatewayPayments = [
  { id: "g1", when: "Today 10:12", who: "Nuwan A.", amount: 30000, method: "Card · Toss Payments", booking: "SL-41760", status: "Paid" },
  { id: "g2", when: "Today 9:40", who: "Dilani P.", amount: 55000, method: "Toss Pay", booking: "SL-41758", status: "Paid" },
  { id: "g3", when: "Yesterday", who: "Chamath R.", amount: 25000, method: "Card · Toss Payments", booking: "SL-41744", status: "Paid" },
  { id: "g4", when: "Yesterday", who: "Harsha T.", amount: 12000, method: "Toss Pay", booking: "SL-41741", status: "Paid" },
];

export const failedPayments = [
  { id: "f1", reason: "Card declined", who: "Lahiru M.", amount: 55000, when: "Today 4:12 PM" },
  { id: "f2", reason: "Toss Pay timeout", who: "Shehani W.", amount: 30000, when: "Yesterday" },
  { id: "f3", reason: "Card declined", who: "Upeksha D.", amount: 25000, when: "17 Oct" },
  { id: "f4", reason: "Card declined", who: "Isuru K.", amount: 20000, when: "16 Oct" },
];

/* ------------------------------------- users ------------------------------------- */

export type Role = "Owner" | "Payments staff" | "Content editor" | "Organizer" | "Customer";

export const modules = ["Payments", "Bookings", "Events", "Organizers", "Reports", "Settings", "Users & roles"] as const;
export const actions = ["view", "edit", "approve", "export"] as const;
export type Module = (typeof modules)[number];
export type Action = (typeof actions)[number];
export type Permissions = Record<Module, Record<Action, boolean>>;

const none = (): Permissions =>
  Object.fromEntries(modules.map((m) => [m, { view: false, edit: false, approve: false, export: false }])) as Permissions;

export const rolePermissions: Record<Role, Permissions> = {
  Owner: Object.fromEntries(modules.map((m) => [m, { view: true, edit: true, approve: true, export: true }])) as Permissions,
  "Payments staff": (() => {
    const p = none();
    p.Payments = { view: true, edit: true, approve: true, export: false };
    p.Bookings.view = true;
    p.Events.view = true;
    p.Reports = { view: true, edit: false, approve: false, export: true };
    return p;
  })(),
  "Content editor": (() => {
    const p = none();
    p.Events.view = true;
    p.Settings.view = true;
    return p;
  })(),
  Organizer: none(),
  Customer: none(),
};

export type AdminUser = {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: Role;
  active: boolean;
  last: string;
  bookings: number | null;
  twoStep?: boolean;
  recent: { text: string; time: string }[];
};

export const seedUsers: AdminUser[] = [
  {
    id: "ishara",
    name: "Ishara Kumara",
    initials: "IK",
    email: "ishara@slevents.kr",
    role: "Payments staff",
    active: true,
    last: "12 min ago",
    bookings: null,
    twoStep: true,
    recent: [
      { text: "Confirmed payment SL-41740", time: "12 min ago" },
      { text: "Rejected proof SL-41738 · amount differs", time: "11 Oct" },
      { text: "Logged in from Chrome, Seoul", time: "Today 6:02 PM" },
    ],
  },
  { id: "sanduni", name: "Sanduni Perera", initials: "SP", email: "sanduni@slevents.kr", role: "Owner", active: true, last: "Now", bookings: null, twoStep: true, recent: [{ text: "Changed Ishara's permissions", time: "Today 6:30 PM" }] },
  { id: "nimal", name: "Nimal Fernando", initials: "NF", email: "nimal@example.com", role: "Organizer", active: true, last: "1 h ago", bookings: null, recent: [{ text: "Edited Sri Lankan Music Night", time: "1 h ago" }] },
  { id: "kasun", name: "Kasun Perera", initials: "KP", email: "kasun@example.com", role: "Customer", active: true, last: "Today", bookings: 7, recent: [{ text: "Booked Baila Night", time: "Today" }] },
  { id: "chamara", name: "Chamara Dissanayake", initials: "CD", email: "chamara.d@example.com", role: "Customer", active: false, last: "2 Sep", bookings: 2, recent: [{ text: "Failed login 5 times · locked 15 min", time: "Yesterday 8:03 PM" }] },
  { id: "hiruni", name: "Hiruni Weerasinghe", initials: "HW", email: "hiruni@slevents.kr", role: "Content editor", active: true, last: "Yesterday", bookings: null, twoStep: true, recent: [{ text: 'Published banner "Avurudu 2027"', time: "17 Oct" }] },
  { id: "tharushi", name: "Tharushi Silva", initials: "TS", email: "tharushi@example.com", role: "Customer", active: true, last: "3 days ago", bookings: 3, recent: [{ text: "Booked Cricket Cup", time: "3 days ago" }] },
];

export const userTabCounts = { all: 4128, customers: 4091, organizers: 23, staff: 9, admins: 5 };

/* ------------------------------------- reports ------------------------------------- */

export const reportStats = {
  gross: 61_980_000,
  growth: 18,
  bookings: 2104,
  ticketsPerBooking: 2.7,
  fees: 3_412_000,
  feeNote: "5% + ₩500 per ticket",
  activeOrganizers: 19,
  totalOrganizers: 23,
  paidOut: 49_860_000,
  waiting: 7_468_000,
};

export const ticketsPerWeek = [
  { label: "31 Aug", value: 610 },
  { label: "7 Sep", value: 680 },
  { label: "14 Sep", value: 790 },
  { label: "21 Sep", value: 730 },
  { label: "28 Sep", value: 960 },
  { label: "5 Oct", value: 1100 },
  { label: "12 Oct", value: 1060 },
  { label: "19 Oct", value: 1340 },
];

export const eventPerformance = [
  { name: "Sri Lankan Music Night", sold: 228, capacity: 360, sales: "₩7,350,000", checkedIn: "—" },
  { name: "Sri Lankan Cultural Festival", sold: 341, capacity: 880, sales: "₩5,935,000", checkedIn: "—" },
  { name: "Poson Dansala & Meetup", sold: 60, capacity: 100, sales: "Free", checkedIn: "87%" },
  { name: "Avurudu Night Seoul", sold: 412, capacity: 450, sales: "₩8,240,000", checkedIn: "94%" },
];

export const organizerActivity = [
  { name: "SL Events", events: 6, sales: "₩24,310,000" },
  { name: "Lanka Beats Korea", events: 3, sales: "₩11,550,000" },
  { name: "Ansan Arts Society", events: 1, sales: "₩0 · in review" },
  { name: "Guro Film Club", events: 1, sales: "Cancelled" },
];

/* ------------------------------------- audit log ------------------------------------- */

export type AuditType = "payment" | "permission" | "decision" | "settings" | "account" | "content" | "export" | "system";

export type AuditEntry = {
  id: string;
  at: string;
  who: string;
  initials: string;
  role: string;
  action: string;
  item: string;
  type: AuditType;
  detail?: { booking?: string; bankRef?: string; device?: string; changes?: { label: string; from: string; to: string }[] };
};

export const seedAudit: AuditEntry[] = [
  {
    id: "a1",
    at: "2026-10-19T18:41:12+09:00",
    who: "Ishara Kumara",
    initials: "IK",
    role: "Payments staff",
    action: "Confirmed bank transfer ₩60,000",
    item: "SL-41740",
    type: "payment",
    detail: {
      booking: "SL-41740 · Malith Ekanayake · ₩60,000",
      bankRef: "KB-20261019-1312-0981",
      device: "Chrome on Windows · Seoul",
      changes: [
        { label: "Payment status", from: "Under review", to: "Paid" },
        { label: "Tickets", from: "Not issued", to: "2 issued" },
      ],
    },
  },
  { id: "a2", at: "2026-10-19T18:30:00+09:00", who: "Sanduni Perera", initials: "SP", role: "Owner", action: "Changed Ishara's permissions", item: "user: ishara", type: "permission", detail: { device: "Chrome on Windows · Seoul", changes: [{ label: "Payments · approve", from: "Off", to: "On" }] } },
  { id: "a3", at: "2026-10-19T14:12:00+09:00", who: "Sanduni Perera", initials: "SP", role: "Owner", action: "Approved organizer Busan Lions Cricket Club", item: "org: busan-lions", type: "decision", detail: { device: "Chrome on Windows · Seoul" } },
  { id: "a4", at: "2026-10-19T11:52:00+09:00", who: "Ishara Kumara", initials: "IK", role: "Payments staff", action: "Rejected payment proof · amount differs", item: "SL-41698", type: "payment", detail: { booking: "SL-41698 · Asanka M. · ₩20,000", device: "Chrome on Windows · Seoul" } },
  { id: "a5", at: "2026-10-18T21:10:00+09:00", who: "Sanduni Perera", initials: "SP", role: "Owner", action: "Platform fee 4% → 5%", item: "settings: fees", type: "settings", detail: { changes: [{ label: "Platform fee", from: "4%", to: "5%" }] } },
  { id: "a6", at: "2026-10-18T20:03:00+09:00", who: "System", initials: "S", role: "Automatic", action: "Failed login 5 times · account locked 15 min", item: "user: chamara.d", type: "account", detail: { device: "Unknown device" } },
  { id: "a7", at: "2026-10-17T16:20:00+09:00", who: "Hiruni Weerasinghe", initials: "HW", role: "Content editor", action: 'Published banner "Avurudu 2027"', item: "content: banner", type: "content", detail: { device: "Safari on iPhone · Seoul" } },
  { id: "a8", at: "2026-10-16T10:05:00+09:00", who: "Sanduni Perera", initials: "SP", role: "Owner", action: "Exported All bookings (Excel)", item: "report: bookings", type: "export", detail: { device: "Chrome on Windows · Seoul" } },
];

/* ------------------------------------- content ------------------------------------- */

export type Template = { id: string; name: string; when: string; subject: string; body: string };

export const defaultTemplates: Template[] = [
  {
    id: "booking-received",
    name: "Booking received",
    when: "Sent after booking",
    subject: "We received your booking {{booking_no}}",
    body: "Hi {{first_name}}, thanks for booking {{event_name}}. Please transfer {{amount}} to the account in your booking and upload a screenshot. Your {{ticket_count}} tickets are held for you.",
  },
  {
    id: "payment-confirmed",
    name: "Payment confirmed",
    when: "With QR tickets",
    subject: "Your tickets for {{event_name}} are ready",
    body: "Hi {{first_name}}, we've confirmed your payment of {{amount}} for booking {{booking_no}}. Your {{ticket_count}} QR tickets are attached and saved in My tickets. Show them at the door on {{event_date}}. See you there!",
  },
  {
    id: "proof-rejected",
    name: "Payment proof rejected",
    when: "With the reason",
    subject: "We couldn't confirm your payment for {{booking_no}}",
    body: "Hi {{first_name}}, we couldn't match your payment for {{event_name}}. Please check the amount and upload a clear screenshot. Your tickets stay held for now.",
  },
  {
    id: "payment-reminder",
    name: "Payment reminder",
    when: "12 h before deadline",
    subject: "Your tickets for {{event_name}} are held for 12 more hours",
    body: "Hi {{first_name}}, we're holding {{ticket_count}} tickets for {{event_name}}. Transfer {{amount}} and upload your proof soon, or they go back on sale.",
  },
  {
    id: "event-reminder",
    name: "Event reminder",
    when: "Day before the event",
    subject: "{{event_name}} is tomorrow",
    body: "Hi {{first_name}}, {{event_name}} is on {{event_date}} at {{venue}}. Have your QR tickets ready in My tickets.",
  },
  {
    id: "event-changed",
    name: "Event changed",
    when: "Date, time or venue",
    subject: "A change to {{event_name}}",
    body: "Hi {{first_name}}, the organizer has changed the details of {{event_name}}. It's now on {{event_date}} at {{venue}}. Your tickets are still valid.",
  },
  {
    id: "organizer-approved",
    name: "Organizer approved",
    when: "To new organizers",
    subject: "You're approved as an organizer",
    body: "Hi {{first_name}}, your organizer application is approved. Log in to create your first event.",
  },
];

export const templateTags = ["{{first_name}}", "{{event_name}}", "{{event_date}}", "{{booking_no}}", "{{amount}}", "{{ticket_count}}", "{{venue}}"];

export const sampleValues: Record<string, string> = {
  first_name: "Kasun",
  event_name: "Sri Lankan Music Night",
  event_date: "Sat, 14 Nov 2026",
  booking_no: "SL-41730",
  amount: "₩60,000",
  ticket_count: "2",
  venue: "Hongdae Live Hall",
};

export const defaultBanner = {
  message: "Avurudu Festival 2027 tickets are on sale. Early bird ends 30 November.",
  link: "/events/avurudu-2027",
  button: "Get tickets",
  from: "2026-10-19",
  to: "2026-11-30",
  live: true,
};

export const notificationTexts = [
  { id: "n-ready", name: "Tickets ready", text: "Payment for {{event_name}} ({{booking_no}}) is confirmed. Your QR tickets are in My tickets." },
  { id: "n-review", name: "Proof received", text: "We received your payment proof for {{event_name}}. This usually takes 2–6 hours." },
  { id: "n-failed", name: "Payment failed", text: "We couldn't match your payment for {{booking_no}}. Upload a new screenshot to keep your tickets." },
  { id: "n-expired", name: "Booking expired", text: "The payment time for {{booking_no}} ran out and the tickets were released." },
];

export const websitePages = [
  { id: "about", name: "About SL Events", path: "/about", updated: "12 Oct 2026" },
  { id: "terms", name: "Terms and conditions", path: "/terms", updated: "Oct 2026" },
  { id: "privacy", name: "Privacy policy", path: "/privacy", updated: "Oct 2026" },
  { id: "payment", name: "Payment instructions", path: "/payment-instructions", updated: "9 Oct 2026" },
];

/* ------------------------------------- settings ------------------------------------- */

export const categoryNames = ["Concerts", "Parties", "Cricket", "Culture", "Movies", "Food", "Travel", "Community"];
export const ticketTypeNames = ["General admission", "VIP", "VVIP", "Student", "Child", "Couple seat", "Seat map (numbered seats)", "Free registration", "Donation tickets"];

export type PlatformSettings = {
  /** A small uploaded logo as a data URL; empty uses the built-in one. */
  logo: string;
  name: string;
  tagline: string;
  email: string;
  website: string;
  colours: string[];
  categories: string[];
  ticketTypes: Record<string, boolean>;
  feePercent: number;
  feeFixed: number;
  feePays: "Organizer" | "Buyer";
  maxTickets: number;
  seatHold: string;
  transferDeadline: string;
  cancelUntil: string;
  notifyOnCancel: boolean;
  languages: Record<string, boolean>;
  accountBank: string;
  accountNumber: string;
  accountHolder: string;
};

export const defaultSettings: PlatformSettings = {
  logo: "",
  name: "SL Events",
  tagline: "Sri Lankan events and entertainment in Korea",
  email: "support@slevents.kr",
  website: "slevents.kr",
  colours: ["#f7cb60", "#e0281f", "#000000"],
  categories: categoryNames,
  ticketTypes: Object.fromEntries(ticketTypeNames.map((t) => [t, t !== "Donation tickets"])),
  feePercent: 5,
  feeFixed: 500,
  feePays: "Organizer",
  maxTickets: 10,
  seatHold: "24 hours",
  transferDeadline: "24 hours after booking",
  cancelUntil: "3 days before the event",
  notifyOnCancel: true,
  languages: { English: true, "Sinhala (සිංහල)": true, "Tamil (தமிழ்)": true, "Korean (한국어)": false },
  accountBank: "KB Kookmin Bank",
  accountNumber: "123401-04-567890",
  accountHolder: "SL Events",
};

/* ------------------------------------- system ------------------------------------- */

export type ServiceState = "working" | "slow";

/** Days (oldest first) that were slow or partly down. Everything else was fine. */
export const services = [
  { id: "website", name: "Website", sub: "slevents.kr", state: "working" as ServiceState, uptime: "99.98%", slowDays: [] as number[] },
  { id: "bookings", name: "Bookings and checkout", sub: "Ticket holds and orders", state: "working" as ServiceState, uptime: "99.95%", slowDays: [14] },
  { id: "email", name: "Email sending", sub: "Tickets, reminders", state: "slow" as ServiceState, uptime: "99.70%", slowDays: [24, 28] },
  { id: "qr", name: "QR ticket scanning", sub: "Door scanner", state: "working" as ServiceState, uptime: "100%", slowDays: [] as number[] },
  { id: "storage", name: "File storage", sub: "Receipts, covers, logos", state: "working" as ServiceState, uptime: "99.99%", slowDays: [] as number[] },
  { id: "bank", name: "Bank statement import", sub: "KB Kookmin daily file", state: "working" as ServiceState, uptime: "99.90%", slowDays: [2] },
];

export const backups = [
  { id: "bk1", when: "Today, 3:00 AM", size: "2.4 GB", latest: true },
  { id: "bk2", when: "Yesterday, 3:00 AM", size: "2.4 GB", latest: false },
  { id: "bk3", when: "17 Oct, 3:00 AM", size: "2.3 GB", latest: false },
];

export const connected = [
  { id: "toss", name: "Toss Payments", sub: "Card and Toss Pay", state: "connected" as const },
  { id: "kb", name: "KB Kookmin Bank", sub: "Statement import", state: "connected" as const },
  { id: "email", name: "Email provider", sub: "12,480 emails this month", state: "slow" as const },
  { id: "kakao", name: "Kakao login", sub: "Customer sign-in", state: "connected" as const },
  { id: "google", name: "Google login", sub: "Customer sign-in", state: "connected" as const },
  { id: "naver", name: "Naver Map", sub: "Venue maps", state: "expires" as const },
];
