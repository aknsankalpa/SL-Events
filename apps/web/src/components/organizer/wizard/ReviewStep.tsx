"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, MapPin, Send, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatKrw } from "@/lib/format";
import { categoryIdOf, formatEventDate, newId, seatMapSectionStats, unassignedSeats } from "@/lib/organizer";
import { htmlToText, isEmptyHtml } from "@/lib/richText";
import { useOrganizer } from "../OrganizerContext";
import { Panel } from "../ui";
import { capacityOf, useEventDraft, VENUE_LIMIT } from "./EventDraft";

const formatDate = (iso: string) => formatEventDate(iso) || "No date yet";

export function ReviewStep() {
  const router = useRouter();
  const { draft } = useEventDraft();
  const { addEvent } = useOrganizer();

  const seats = draft.sellMode === "seats";
  const ticketCap = capacityOf(draft.ticketTypes);
  const seatStats = draft.seatMap.sections.map((s) => seatMapSectionStats(draft.seatMap, s));
  const seatCount = seatStats.reduce((n, s) => n + s.free, 0);
  const capacity = seats ? seatCount : ticketCap.tickets;
  const revenue = seats ? seatStats.reduce((n, s) => n + s.revenue, 0) : ticketCap.revenue;

  const problems: string[] = [];
  if (!draft.name.trim()) problems.push("Add an event name.");
  if (isEmptyHtml(draft.description)) problems.push("Add a description.");
  if (!draft.date) problems.push("Choose a date.");
  if (!draft.venue.trim() || !draft.address.trim()) problems.push("Add the venue name and address.");
  if (capacity === 0) problems.push(seats ? "Add at least one section with seats." : "Add at least one ticket type.");
  if (!seats && capacity > VENUE_LIMIT) problems.push(`Ticket quantity is over the venue limit of ${VENUE_LIMIT}.`);
  if (!seats && draft.ticketTypes.some((t) => !t.name.trim())) problems.push("Give every ticket type a name.");
  if (seats && unassignedSeats(draft.seatMap) > 0) problems.push("Assign every seat on the seating plan to a section.");

  function submit() {
    if (problems.length) return;
    // TODO: send the event to the API; it goes to SL Events for review before it goes live.
    addEvent({
      id: newId("event"),
      title: draft.name.trim(),
      category: categoryIdOf(draft.category),
      dateLabel: formatDate(draft.date),
      shortDate: formatDate(draft.date),
      startsAt: draft.date ? `${draft.date}T${draft.starts || "18:00"}:00+09:00` : undefined,
      venue: [draft.venue, draft.address].filter(Boolean).join(", ") || undefined,
      sold: 0,
      capacity,
      revenue: 0,
      pending: 0,
      status: "in_review",
      draft,
    });
    router.push("/organizer/events");
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[1fr_20rem]">
      <Panel className="p-5 sm:p-6">
        <h2 className="text-lg font-bold text-text">{draft.name.trim() || "Untitled event"}</h2>
        <p className="mt-1 text-xs text-dim">
          {draft.category} {draft.tags && `· ${draft.tags}`}
        </p>
        <p className="mt-4 line-clamp-6 whitespace-pre-line text-sm leading-relaxed text-muted">{htmlToText(draft.description)}</p>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-lg border border-line bg-surface-2 p-4">
            <CalendarDays size={16} aria-hidden className="mt-0.5 text-gold" />
            <div className="leading-tight">
              <dt className="text-[11px] text-dim">When</dt>
              <dd className="mt-1 text-[13px] font-bold text-text">{formatDate(draft.date)}</dd>
              <dd className="mt-1 text-[11px] text-dim">
                Doors {draft.doorsOpen} · Starts {draft.starts}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-line bg-surface-2 p-4">
            <MapPin size={16} aria-hidden className="mt-0.5 text-gold" />
            <div className="leading-tight">
              <dt className="text-[11px] text-dim">Where</dt>
              <dd className="mt-1 text-[13px] font-bold text-text">{draft.venue || "—"}</dd>
              <dd className="mt-1 text-[11px] text-dim">{draft.address}</dd>
            </div>
          </div>
        </dl>

        <h3 className="mb-3 mt-8 text-sm font-bold text-text">{seats ? "Seat sections" : "Ticket types"}</h3>
        <ul className="divide-y divide-line rounded-lg border border-line">
          {seats
            ? draft.seatMap.sections.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 px-4 py-3 text-[13px]">
                  <span className="flex items-center gap-2 text-text">
                    <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                    <span className="text-[11px] text-dim">{seatMapSectionStats(draft.seatMap, s).total} seats</span>
                  </span>
                  <span className="font-bold text-text">{formatKrw(s.price)}</span>
                </li>
              ))
            : draft.ticketTypes.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-4 px-4 py-3 text-[13px]">
                  <span className="flex items-center gap-2 text-text">
                    <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.name || "Untitled"}
                    <span className="text-[11px] text-dim">
                      {t.quantity} tickets{t.visible ? "" : " · hidden"}
                    </span>
                  </span>
                  <span className="font-bold text-text">{formatKrw(t.price)}</span>
                </li>
              ))}
        </ul>
      </Panel>

      <div className="space-y-5">
        <Panel className="p-5">
          <p className="text-[11px] text-dim">{seats ? "Seats for sale" : "Tickets for sale"}</p>
          <p className="mt-2 text-[30px] font-bold leading-none text-text">{capacity}</p>
          <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
            <span className="text-xs font-bold text-text">If everything sells</span>
            <span className="text-base font-bold text-text">{formatKrw(revenue)}</span>
          </div>
        </Panel>

        {problems.length > 0 ? (
          <section className="rounded-xl border border-amber/40 bg-amber/10 p-4" aria-label="Things to fix">
            <p className="flex items-center gap-2 text-[13px] font-bold text-amber">
              <TriangleAlert size={14} aria-hidden /> Fix before submitting
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs text-amber">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 p-4 text-xs text-success">
            <CheckCircle2 size={14} aria-hidden /> Everything needed is filled in.
          </p>
        )}

        <Button size="lg" className="w-full" disabled={problems.length > 0} onClick={submit}>
          <Send size={16} aria-hidden /> Submit for review
        </Button>
        <p className="text-center text-[11px] text-dim">SL Events reviews new events within one day before they go live.</p>
      </div>
    </div>
  );
}
