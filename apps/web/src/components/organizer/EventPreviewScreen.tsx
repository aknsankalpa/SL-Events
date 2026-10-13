"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Info, Monitor, Pencil, Send, Smartphone } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/StatusBadge";
import { capacityOf, eventStatusLabel, seatMapSectionStats, unassignedSeats, type EventDraft } from "@/lib/organizer";
import { isEmptyHtml } from "@/lib/richText";
import { useOrganizer } from "./OrganizerContext";
import { OrgPageHeader } from "./ui";

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

export function EventPreviewScreen({ id }: { id: string }) {
  const router = useRouter();
  const { events, updateEvent } = useOrganizer();
  const event = events.find((e) => e.id === id);
  const [device, setDevice] = useState<Device>("desktop");
  const [sent, setSent] = useState(false);

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

  function submit() {
    // TODO: send to the API; SL Events reviews new events within one day before they go live.
    updateEvent(id, { status: "in_review" });
    setSent(true);
  }

  return (
    <>
      <OrgPageHeader
        crumbs={[{ label: "Events", href: "/organizer/events" }, { label: event.title }, { label: "Preview" }]}
        title="Preview"
        titleAside={
          <Badge tone={tone[event.status]} dot={event.status === "on_sale"}>
            {eventStatusLabel[event.status]}
          </Badge>
        }
        actions={
          <>
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
                  className={`flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold transition-colors focus-visible:focus-ring ${
                    device === value ? "bg-gold/15 text-gold" : "text-muted hover:text-text"
                  }`}
                >
                  <Icon size={14} aria-hidden /> {label}
                </button>
              ))}
            </div>
            <LinkButton
              href={`/organizer/events/${id}/edit`}
              variant="outline"
              className="border-line bg-surface text-text hover:bg-surface-2"
            >
              <Pencil size={15} aria-hidden /> Edit details
            </LinkButton>
            {isDraft && (
              <Button onClick={submit} disabled={!canSubmit || sent}>
                <Send size={15} aria-hidden /> {sent ? "Sent for review" : "Submit for review"}
              </Button>
            )}
          </>
        }
      />

      {sent ? (
        <p role="status" className="mb-4 rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm text-text">
          Sent for review. SL Events checks new events within one day, then your event goes live.{" "}
          <button type="button" onClick={() => router.push("/organizer/events")} className="font-bold text-amber hover:text-gold">
            Back to events
          </button>
        </p>
      ) : (
        <p className="mb-4 flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
          <Info size={14} aria-hidden className="mt-0.5 shrink-0 text-amber" />
          <span>
            This is how buyers will see your event. Buying is switched off in the preview.
            {isDraft && problems.length > 0 && (
              <>
                {" "}
                <strong className="text-amber">Before you can submit:</strong> {problems.join(" ")}
              </>
            )}
          </span>
        </p>
      )}

      <div
        className={`mx-auto overflow-hidden border border-line bg-page shadow-2xl shadow-black/40 ${
          device === "phone" ? "w-[390px] max-w-full rounded-[2rem] border-4" : "w-full rounded-xl"
        }`}
      >
        <iframe
          title={`Preview of ${event.title}`}
          src={`/preview/events/${encodeURIComponent(id)}`}
          className={`block w-full border-0 bg-page ${device === "phone" ? "h-[780px]" : "h-[calc(100vh-15rem)] min-h-[560px]"}`}
        />
      </div>

      <p className="mt-4 text-center text-[11px] text-dim">
        The preview updates when you save changes.{" "}
        <Link href={`/organizer/events/${id}/edit`} className="font-bold text-amber hover:text-gold">
          Edit this event
        </Link>
      </p>
    </>
  );
}
