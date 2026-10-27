import { categories, type CategoryId, type EventItem, type TicketType } from "./data";
import { organizer, seatMapSectionStats, type EventDraft } from "./organizer";
import { htmlToText, isEmptyHtml } from "./richText";
import { chartFromSeatMap } from "./seating";

const MONTHS_UPPER = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function clock(t: string): string {
  const [h = "0", m = "00"] = t.split(":");
  const hour = Number(h);
  if (Number.isNaN(hour)) return "";
  return `${hour % 12 || 12}:${m.padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

/** Maps what the organizer typed in the wizard onto the shape the customer event page renders. */
export function draftToEventItem(draft: EventDraft, id: string): EventItem {
  const catId = (categories.find((c) => c.label.toLowerCase().startsWith(draft.category.toLowerCase().slice(0, 4)))?.id ??
    "culture") as CategoryId;

  const hasDate = /^\d{4}-\d{2}-\d{2}$/.test(draft.date);
  const [y, m, d] = hasDate ? draft.date.split("-").map(Number) : [0, 1, 1];
  const dow = hasDate ? DAYS[new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay()]! : "";
  const mon = hasDate ? MONTHS[m! - 1]! : "";
  const time = clock(draft.starts);

  const ticketTypes: TicketType[] =
    draft.sellMode === "seats"
      ? draft.seatMap.sections
          // On a chart built from a picture a section can end up with no seats; buyers shouldn't see it.
          .filter((s) => !draft.seatMap.layout || seatMapSectionStats(draft.seatMap, s).free > 0)
          .map((s) => ({
          id: s.id,
          name: s.name,
          price: s.price,
          summary: draft.seatMap.layout ? "Numbered seats" : `Seat ${s.rows.replace(/\s+to\s+/i, "–")} · numbered seats`,
          perks: [draft.seatMap.layout ? "Numbered seats" : `Seat ${s.rows}`],
          capacity: Math.max(1, seatMapSectionStats(draft.seatMap, s).free),
          sold: 0,
        }))
      : draft.ticketTypes
          .filter((t) => t.visible)
          .map((t) => ({
            id: t.id,
            name: t.name || "Ticket",
            price: t.price,
            summary: t.perks || undefined,
            perks: t.perks ? [t.perks] : [],
            capacity: Math.max(1, t.quantity),
            sold: 0,
          }));

  const paragraphs = htmlToText(draft.description)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const city = draft.address.split(",").pop()?.trim() || draft.address;

  const layout = draft.sellMode === "seats" ? draft.seatMap.layout : undefined;
  const seatingPlan = layout
    ? {
        imageUrl: layout.imageUrl,
        width: layout.width,
        height: layout.height,
        // Blocked seats are drawn muted so the dot in the original picture doesn't look like an available seat.
        seats: layout.seats
          .filter((s) => s.blocked || s.section)
          .map((s) => ({
            x: s.x,
            y: s.y,
            r: s.r,
            color: s.blocked ? "#3a3631" : (draft.seatMap.sections.find((sec) => sec.id === s.section)?.color ?? "#ece7dc"),
          })),
        legend: draft.seatMap.sections
          .map((sec) => ({
            name: sec.name,
            color: sec.color,
            price: sec.price,
            seats: seatMapSectionStats(draft.seatMap, sec).free,
          }))
          .filter((l) => l.seats > 0),
      }
    : undefined;

  return {
    slug: id,
    title: draft.name.trim() || "Untitled event",
    category: catId,
    startsAt: hasDate ? `${draft.date}T${draft.starts || "18:00"}:00+09:00` : "",
    dateLabel: hasDate ? `${dow}, ${mon} ${d} · ${time}` : "Date to be announced",
    longDate: hasDate ? `${dow}, ${d} ${mon} ${y}` : "Date to be announced",
    time: time || "Time to be announced",
    badgeDate: hasDate ? `${MONTHS_UPPER[m! - 1]} ${String(d).padStart(2, "0")}, ${y}` : "TO BE ANNOUNCED",
    venue: draft.venue.trim() || "Venue to be announced",
    city,
    area: draft.address.trim() || "Address to be announced",
    tagline: draft.tags,
    description: paragraphs.length ? paragraphs : ["No description yet."],
    descriptionHtml: isEmptyHtml(draft.description) ? undefined : draft.description,
    seatingPlan,
    seatChart: draft.sellMode === "seats" ? chartFromSeatMap(draft.seatMap) : undefined,
    organizer: draft.organizerName?.trim() || organizer.org,
    organizerAbout: draft.organizerAbout?.trim() || undefined,
    organizerEmail: draft.organizerEmail?.trim() || undefined,
    organizerPhone: draft.organizerPhone?.trim() || undefined,
    organizerLink: draft.organizerLink?.trim() || undefined,
    doorsOpen: clock(draft.doorsOpen),
    ticketTypes: ticketTypes.length ? ticketTypes : [{ id: "tbd", name: "Tickets", price: 0, perks: [], capacity: 1, sold: 0 }],
  };
}
