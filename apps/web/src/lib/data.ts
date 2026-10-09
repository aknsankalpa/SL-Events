// Mock data used until the backend API exists. Shapes mirror what the API should return.
// Everything marked "placeholder" was not specified in the Figma designs.

export type CategoryId =
  | "concert"
  | "party"
  | "cricket"
  | "culture"
  | "movies"
  | "food"
  | "travel"
  | "community";

export type Category = { id: CategoryId; label: string };

export const categories: Category[] = [
  { id: "concert", label: "Concerts" },
  { id: "party", label: "Parties" },
  { id: "cricket", label: "Cricket" },
  { id: "culture", label: "Culture" },
  { id: "movies", label: "Movies" },
  { id: "food", label: "Food" },
  { id: "travel", label: "Travel" },
  { id: "community", label: "Community" },
];

export const cities = ["Seoul", "Busan", "Incheon", "Ulsan", "Ansan"] as const;

export type TicketType = {
  id: string;
  name: string;
  price: number; // KRW
  /** One-line description shown on the event page; falls back to the first perk. */
  summary?: string;
  perks: string[];
  capacity: number;
  sold: number;
};

export function ticketsLeft(t: TicketType) {
  return Math.max(0, t.capacity - t.sold);
}

export type EventItem = {
  slug: string;
  title: string;
  category: CategoryId;
  /** ISO date-time in Korea time (KST) */
  startsAt: string;
  dateLabel: string; // e.g. "Sat, Nov 14 · 6:00 PM"
  longDate: string; // e.g. "Sat, 14 Nov 2026"
  time: string; // e.g. "6:00 PM"
  badgeDate: string; // e.g. "NOV 14, 2026"
  venue: string;
  city: string;
  area: string; // e.g. "Mapo-gu, Seoul"
  tagline: string;
  description: string[];
  organizer: string;
  doorsOpen: string;
  ticketTypes: TicketType[];
  /** True when the event has one ticket price, so the card shows no "From" prefix. */
  singlePrice?: boolean;
  fewLeft?: boolean;
  sellingFast?: boolean;
  /** Shown in "Events near you" on the home page. */
  featured?: boolean;
};

/** Lowest price among tickets still on sale (falls back to all tickets when everything is sold out). */
export function fromPrice(e: EventItem) {
  const onSale = e.ticketTypes.filter((t) => ticketsLeft(t) > 0);
  return Math.min(...(onSale.length ? onSale : e.ticketTypes).map((t) => t.price));
}

/** Lowest price across every ticket type, including sold-out ones. */
export function lowestListedPrice(e: EventItem) {
  return Math.min(...e.ticketTypes.map((t) => t.price));
}

const generalOnly = (name: string, price: number, capacity: number, sold: number, perks: string[]): TicketType[] => [
  { id: name.toLowerCase(), name, price, perks, capacity, sold },
];

export const events: EventItem[] = [
  {
    slug: "newcomers-meetup",
    title: "Newcomers Meetup",
    category: "community",
    startsAt: "2026-10-25T14:00:00+09:00",
    dateLabel: "Sun, Oct 25 · 2:00 PM",
    longDate: "Sun, 25 Oct 2026",
    time: "2:00 PM",
    badgeDate: "OCT 25, 2026",
    venue: "Ansan Multicultural Center",
    city: "Ansan",
    area: "Danwon-gu, Ansan",
    tagline: "Meet the community · Free entry · All ages",
    description: [
      "New to Korea or new to the community? Come and meet other Sri Lankans living nearby, share tips on work, visas and life here, and enjoy tea and snacks.",
      "Registration is free, but you need a ticket so we can plan the seating.",
    ],
    organizer: "SL Events Community Team",
    doorsOpen: "1:30 PM",
    ticketTypes: generalOnly("General", 0, 120, 74, ["Free entry", "Tea and snacks included"]),
    singlePrice: true,
  },
  {
    slug: "sri-lankan-music-night",
    title: "Sri Lankan Music Night",
    category: "concert",
    startsAt: "2026-11-14T18:00:00+09:00",
    dateLabel: "Sat, Nov 14 · 6:00 PM",
    longDate: "Sat, 14 Nov 2026",
    time: "6:00 PM",
    badgeDate: "NOV 14, 2026",
    venue: "Hongdae Live Hall",
    city: "Seoul",
    area: "Mapo-gu, Seoul",
    tagline: "Live music · DJ · All ages",
    description: [
      "An evening of Sinhala and Tamil songs performed live by Sri Lankan bands based in Korea, followed by a DJ set until late. Food stalls inside the hall sell short eats and milk tea.",
      "Doors open at 5:30 PM. Bring your QR ticket on your phone; one ticket admits one person.",
    ],
    organizer: "Lanka Beats Korea",
    doorsOpen: "5:30 PM",
    sellingFast: true,
    featured: true,
    ticketTypes: [
      { id: "general", name: "General", price: 30000, capacity: 250, sold: 168, summary: "Standing area", perks: ["Standing area", "Entry from 5:30 PM"] },
      {
        id: "vip",
        name: "VIP",
        price: 55000,
        capacity: 50,
        sold: 42,
        summary: "Front seats and meet-and-greet",
        perks: ["Front-row seats", "Meet-and-greet with the artists", "Free welcome drink"],
      },
      { id: "student", name: "Student", price: 20000, capacity: 60, sold: 60, summary: "Valid student ID needed at the door", perks: ["Standing area", "Valid student ID needed at the door"] },
    ],
  },
  {
    slug: "sinhala-movie-screening",
    title: "Sinhala Movie Screening",
    category: "movies",
    startsAt: "2026-11-21T19:00:00+09:00",
    dateLabel: "Sat, Nov 21 · 7:00 PM",
    longDate: "Sat, 21 Nov 2026",
    time: "7:00 PM",
    badgeDate: "NOV 21, 2026",
    venue: "Guro Digital Cinema",
    city: "Seoul",
    area: "Guro-gu, Seoul",
    tagline: "Sinhala film · English subtitles · All ages",
    description: [
      "A special screening of a celebrated Sinhala film with English subtitles, followed by a short Q&A.",
      "Seating is first come, first served within your ticket.",
    ],
    organizer: "Lanka Cinema Club Korea",
    doorsOpen: "6:30 PM",
    ticketTypes: generalOnly("Regular", 12000, 140, 96, ["Cinema seating", "English subtitles"]),
    singlePrice: true,
    featured: true,
  },
  {
    slug: "sri-lanka-cricket-cup",
    title: "Sri Lanka Cricket Cup",
    category: "cricket",
    startsAt: "2026-11-22T08:30:00+09:00",
    dateLabel: "Sun, Nov 22 · 8:30 AM",
    longDate: "Sun, 22 Nov 2026",
    time: "8:30 AM",
    badgeDate: "NOV 22, 2026",
    venue: "Samnak Riverside Ground",
    city: "Busan",
    area: "Gangseo-gu, Busan",
    tagline: "Tournament day · Food stalls · Family friendly",
    description: [
      "A full day of community cricket with teams from across Korea. Bring a hat, sunscreen and a lot of energy.",
      "Spectator tickets include a seat on the ground and a lunch voucher.",
    ],
    organizer: "Korea Sri Lanka Cricket Association",
    doorsOpen: "8:00 AM",
    featured: true,
    ticketTypes: generalOnly("Spectator", 10000, 400, 210, ["Ground seating", "Lunch voucher"]),
  },
  {
    slug: "baila-night",
    title: "Baila Night",
    category: "party",
    startsAt: "2026-11-28T20:00:00+09:00",
    dateLabel: "Sat, Nov 28 · 8:00 PM",
    longDate: "Sat, 28 Nov 2026",
    time: "8:00 PM",
    badgeDate: "NOV 28, 2026",
    venue: "Songdo Event Hall",
    city: "Incheon",
    area: "Yeonsu-gu, Incheon",
    tagline: "Baila · DJ · Dance floor",
    description: [
      "The biggest Baila party of the season with a live band and DJs. Dress up and dance until late.",
      "Ages 19 and over. Bring your ID.",
    ],
    organizer: "Island Beats Entertainment",
    doorsOpen: "7:30 PM",
    featured: true,
    singlePrice: true,
    fewLeft: true,
    ticketTypes: generalOnly("Regular", 25000, 300, 292, ["Dance floor access", "Cloakroom included"]),
  },
  {
    slug: "sri-lankan-cultural-festival",
    title: "Sri Lankan Cultural Festival",
    category: "culture",
    startsAt: "2026-12-06T11:00:00+09:00",
    dateLabel: "Sun, Dec 6 · 11:00 AM",
    longDate: "Sun, 6 Dec 2026",
    time: "11:00 AM",
    badgeDate: "DEC 06, 2026",
    venue: "Taehwa River Grand Park",
    city: "Ulsan",
    area: "Jung-gu, Ulsan",
    tagline: "Dance · Craft · Food · Family friendly",
    description: [
      "A day-long festival of traditional dance, crafts and food from across Sri Lanka, set in the park by the river.",
      "Kids' activities run all afternoon.",
    ],
    organizer: "Ulsan Sri Lankan Community",
    doorsOpen: "10:30 AM",
    featured: true,
    ticketTypes: generalOnly("Entry", 5000, 600, 240, ["Festival entry", "Kids' activities"]),
  },
  {
    slug: "kottu-and-hoppers-food-fair",
    title: "Kottu & Hoppers Food Fair",
    category: "food",
    startsAt: "2026-12-13T12:00:00+09:00",
    dateLabel: "Sun, Dec 13 · 12:00 PM",
    longDate: "Sun, 13 Dec 2026",
    time: "12:00 PM",
    badgeDate: "DEC 13, 2026",
    venue: "Gimhae Civic Plaza",
    city: "Gimhae",
    area: "Gimhae-si, Gyeongsangnam-do",
    tagline: "Street food · Live cooking · All ages",
    description: [
      "Kottu, hoppers, short eats and sweets from home-style cooks and food trucks. Your entry ticket includes a tasting token.",
    ],
    organizer: "Gimhae Lanka Foodies",
    doorsOpen: "11:30 AM",
    featured: true,
    ticketTypes: generalOnly("Entry", 5000, 500, 180, ["Fair entry", "One tasting token"]),
  },
  {
    // Placeholder: the listing shows a second culture event and a travel event on page 2, which are not designed.
    slug: "sri-lankan-dance-showcase",
    title: "Sri Lankan Dance Showcase",
    category: "culture",
    startsAt: "2027-01-09T17:00:00+09:00",
    dateLabel: "Sat, Jan 9 · 5:00 PM",
    longDate: "Sat, 9 Jan 2027",
    time: "5:00 PM",
    badgeDate: "JAN 09, 2027",
    venue: "Daegu Culture Hall",
    city: "Daegu",
    area: "Jung-gu, Daegu",
    tagline: "Kandyan and low-country dance · All ages",
    description: ["An evening of Kandyan, Sabaragamuwa and low-country dance performed by troupes based in Korea."],
    organizer: "Daegu Lanka Arts Circle",
    doorsOpen: "4:30 PM",
    ticketTypes: generalOnly("General", 15000, 200, 60, ["Reserved seating"]),
    singlePrice: true,
  },
  {
    slug: "jeju-island-weekend-trip",
    title: "Jeju Island Weekend Trip",
    category: "travel",
    startsAt: "2027-01-16T07:00:00+09:00",
    dateLabel: "Sat, Jan 16 · 7:00 AM",
    longDate: "Sat, 16 Jan 2027",
    time: "7:00 AM",
    badgeDate: "JAN 16, 2027",
    venue: "Gimpo Airport, Gate 3",
    city: "Seoul",
    area: "Gangseo-gu, Seoul",
    tagline: "2 days · Group trip · Meet at the airport",
    description: ["A two-day group trip to Jeju with a guided tour, a seafood dinner and a Sri Lankan-style bonfire evening."],
    organizer: "Lanka Travel Club Korea",
    doorsOpen: "6:30 AM",
    ticketTypes: generalOnly("Traveller", 120000, 40, 22, ["Guided tour", "Dinner included"]),
  },
];

export function getEvent(slug: string) {
  return events.find((e) => e.slug === slug);
}

export const homeEvents = events.filter((e) => e.featured);
export const totalUpcomingEvents = events.length;
export const citiesWithEvents = [...new Set(events.map((e) => e.city))];

export const currentUser = {
  firstName: "Kasun",
  fullName: "Kasun Perera",
  initials: "KP",
  email: "kasun@example.com",
  phone: "010-2345-6789",
  city: "Seoul",
  language: "English",
  memberSince: "March 2026",
  memberSinceShort: "Mar 2026",
  refundAccount: { bank: "Shinhan Bank", number: "110-123-456789", holder: "KASUN PERERA" },
};

export const banks = [
  "KB Kookmin Bank",
  "Shinhan Bank",
  "Woori Bank",
  "Hana Bank",
  "NH Nonghyup Bank",
  "IBK Industrial Bank",
  "Toss Bank",
  "KakaoBank",
];

/** Bank account customers transfer to. */
export const paymentAccount = {
  bank: "KB Kookmin Bank",
  number: "123401-04-567890",
  holder: "SL Events",
};
