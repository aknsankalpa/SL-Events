"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Info, Monitor, Pencil, Send, Smartphone } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/StatusBadge";
import { capacityOf, eventStatusLabel, seatMapSectionStats, unassignedSeats, type EventDraft } from "@/lib/organizer";
import { isEmptyHtml } from "@/lib/richText";
import { useOrganizer } from "./OrganizerContext";

type Device = "desktop" | "phone";

const tone = { on_sale: "success", draft: "neutral", in_review: "warning" } as const;

/** What still blocks a draft from being sent for review. */
function problemsFor(d: EventDraft): string[] {
  const out: string[] = [];
  if (!d.name.trim()) out.push("Add an event name.");
  if (isEmptyHtml(d.description)) out.push("Add a description.");
  if (!d.date) out.push("Choose a date.");
  if (!d.venue.trim() || !d.address.trim()) out.push("Add the venue name and address.");
  const seats = d.sellMode === "seats";
  const capacity = seats
    ? d.seatMap.sections.reduce((n, s) => n + seatMapSectionStats(d.seatMap, s).free, 0)
    : capacityOf(d.ticketTypes).tickets;
  if (capacity === 0) out.push(seats ? "Add at least one section with seats." : "Add at least one ticket type.");
  if (seats && unassignedSeats(d.seatMap) > 0) out.push("Assign every seat on the seating plan to a section.");
  return out;
}

/**
 * Full-screen preview of an event advertisement: just the buyer-facing event page, with no site header or
 * footer, under a slim bar of controls. The page itself loads in a frame so "Phone" shows the real mobile layout.
 */
export function EventPreviewScreen({ id }: { id: string }) {
  const router = useRouter();
  const { events, updateEvent } = useOrganizer();
  const event = events.find((e) => e.id === id);
  const [device, setDevice] = useState<Device>("desktop");
  const [sent, setSent] = useState(false);

  // The preview takes over the whole window, so the page behind it must not scroll.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!event) {
    return (
      <div className="rounded-xl border border-line bg-surface p-10 text-center">
        <p className="text-base font-bold text-text">Event not found</p>
        <p className="mt-2 text-sm text-muted">It may have been created in a different browser.</p>
        <LinkButton href="/organizer/events" className="mt-5">
          Back to events
        </LinkButton>
      </div>
    );
  }

  const isDraft = event.status === "draft";
  const problems = event.draft ? problemsFor(event.draft) : [];
  const canSubmit = isDraft && !!event.draft && problems.length === 0;
  const editHref = `/organizer/events/${id}/edit`;

  function submit() {
    // TODO: send to the API; SL Events reviews new events within one day before they go live.
    updateEvent(id, { status: "in_review" });
    setSent(true);
  }

  const frame = (
    <iframe
      title={`Preview of ${event.title}`}
      src={`/preview/events/${encodeURIComponent(id)}`}
      className="block size-full border-0 bg-page"
    />
  );

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-page">
      <header className="shrink-0 border-b border-line bg-black">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <LinkButton href="/organizer/events" variant="ghost" size="sm" className="-ml-2 shrink-0">
            <ArrowLeft size={16} aria-hidden /> Events
          </LinkButton>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold text-text">{event.title}</p>
              <p className="mt-0.5 text-[11px] text-dim">Preview · buyers can&apos;t see this until it&apos;s published</p>
            </div>
            <Badge tone={tone[event.status]} dot={event.status === "on_sale"} className="shrink-0">
              {eventStatusLabel[event.status]}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Preview device" className="hidden gap-1 rounded-xl border border-line bg-surface p-1 sm:inline-flex">
              {([
                ["desktop", "Desktop", Monitor],
                ["phone", "Phone", Smartphone],
              ] as const).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={device === value}
                  onClick={() => setDevice(value)}
                  className={`flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-bold transition-colors focus-visible:focus-ring ${
                    device === value ? "bg-gold/15 text-gold" : "text-muted hover:text-text"
                  }`}
                >
                  <Icon size={14} aria-hidden /> {label}
                </button>
              ))}
            </div>
            <LinkButton href={editHref} variant="outline" size="sm" className="border-line bg-surface text-text hover:bg-surface-2">
              <Pencil size={14} aria-hidden /> Edit details
            </LinkButton>
            {isDraft && (
              <Button size="sm" onClick={submit} disabled={!canSubmit || sent}>
                <Send size={14} aria-hidden /> {sent ? "Sent for review" : "Submit for review"}
              </Button>
            )}
          </div>
        </div>

        {sent ? (
          <p role="status" className="border-t border-success/30 bg-success/10 px-4 py-2.5 text-xs text-text sm:px-6">
            Sent for review. SL Events checks new events within one day, then your event goes live.{" "}
            <button type="button" onClick={() => router.push("/organizer/events")} className="font-bold text-amber hover:text-gold">
              Back to events
            </button>
          </p>
        ) : (
          isDraft &&
          problems.length > 0 && (
            <p className="flex items-start gap-2.5 border-t border-amber/30 bg-amber/10 px-4 py-2.5 text-xs leading-relaxed text-muted sm:px-6">
              <Info size={14} aria-hidden className="mt-0.5 shrink-0 text-amber" />
              <span>
                <strong className="text-amber">Before you can submit:</strong> {problems.join(" ")}
              </span>
            </p>
          )
        )}
      </header>

      <div className={`min-h-0 flex-1 ${device === "phone" ? "overflow-auto bg-surface-2/40 p-4" : ""}`}>
        {device === "phone" ? (
          <div className="mx-auto h-full w-[390px] max-w-full overflow-hidden rounded-[2rem] border-4 border-line bg-page shadow-2xl shadow-black/50">
            {frame}
          </div>
        ) : (
          frame
        )}
      </div>
    </div>
  );
}
