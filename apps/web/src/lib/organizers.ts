import { events, ticketsLeft, type CategoryId, type EventItem } from "./data";

/** Mock organizer profiles, built from the events they run. The API will return real profiles. */
export type OrganizerProfile = {
  slug: string;
  name: string;
  about: string;
  cities: string[];
  categories: CategoryId[];
  eventCount: number;
  ticketsSold: number;
  email?: string;
  link?: string;
};

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const about: Record<string, { text: string; email?: string; link?: string }> = {
  "Lanka Beats Korea": {
    text: "Bands, DJs and dancers from the Sri Lankan community, bringing live music nights to stages across Korea.",
    email: "hello@lankabeats.example",
    link: "instagram.com/lankabeatskorea",
  },
  "Lanka Cinema Club Korea": { text: "A film club screening Sinhala and Tamil movies with subtitles, followed by a chat with the audience." },
  "Korea Sri Lanka Cricket Association": { text: "Runs the community cricket leagues and the yearly cup, with teams from cities all over Korea." },
  "Island Beats Entertainment": { text: "Party and baila nights with the best DJs and live bands from the community." },
  "Ulsan Sri Lankan Community": { text: "The Ulsan community group behind the cultural festival, with food, dance and children's activities." },
  "Gimhae Lanka Foodies": { text: "Home cooks and small restaurants sharing the island's street food at fairs and pop-ups." },
  "Daegu Lanka Arts Circle": { text: "Dancers and drummers performing Kandyan, low-country and folk traditions." },
  "Lanka Travel Club Korea": { text: "Group trips and weekend getaways around Korea, planned for Sri Lankan families and friends." },
  "SL Events Community Team": { text: "The SL Events team's own meetups and community days, usually free to join." },
};

function build(): OrganizerProfile[] {
  const byName = new Map<string, EventItem[]>();
  for (const e of events) byName.set(e.organizer, [...(byName.get(e.organizer) ?? []), e]);
  return [...byName.entries()].map(([name, list]) => ({
    slug: slugify(name),
    name,
    about: about[name]?.text ?? "An event organizer on SL Events.",
    email: about[name]?.email,
    link: about[name]?.link,
    cities: [...new Set(list.map((e) => e.city))],
    categories: [...new Set(list.map((e) => e.category))],
    eventCount: list.length,
    ticketsSold: list.reduce((n, e) => n + e.ticketTypes.reduce((m, t) => m + t.sold, 0), 0),
  }));
}

export const organizerProfiles = build();

/** Organizers ranked by tickets sold. */
export const popularOrganizers = [...organizerProfiles].sort((a, b) => b.ticketsSold - a.ticketsSold);

export const organizerByName = (name: string) => organizerProfiles.find((o) => o.name === name);
export const organizerBySlug = (slug: string) => organizerProfiles.find((o) => o.slug === slug);

/** Total tickets still on sale for an event. */
export const ticketsLeftTotal = (e: EventItem) => e.ticketTypes.reduce((n, t) => n + ticketsLeft(t), 0);

/** The most in-demand events that still have tickets: share of tickets sold, highest first. */
export const featuredEvents = [...events]
  .filter((e) => ticketsLeftTotal(e) > 0)
  .map((e) => {
    const cap = e.ticketTypes.reduce((n, t) => n + t.capacity, 0);
    const sold = e.ticketTypes.reduce((n, t) => n + t.sold, 0);
    return { e, ratio: cap ? sold / cap : 0 };
  })
  .sort((a, b) => b.ratio - a.ratio)
  .slice(0, 3)
  .map((x) => x.e);
