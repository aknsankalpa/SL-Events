"use client";

import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { EventThumb } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/StatusBadge";
import { formatKrw } from "@/lib/format";
import { eventStatusLabel } from "@/lib/organizer";
import { useOrganizer } from "./OrganizerContext";
import { OrgPageHeader, Panel } from "./ui";

const tone = { on_sale: "success", draft: "neutral", in_review: "warning" } as const;

/** Not in the Figma file: a simple index so the Events menu item and the wizard have somewhere to land. */
export function EventsList() {
  const { events, setEventId } = useOrganizer();

  return (
    <>
      <OrgPageHeader
        crumbs={[{ label: "Events" }]}
        title="Events"
        actions={
          <LinkButton href="/organizer/events/new">
            <Plus size={16} aria-hidden /> Create event
          </LinkButton>
        }
      />

      <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {events.map((e) => (
          <li key={e.id}>
            <Panel className="flex h-full flex-col p-5">
              <div className="flex items-start gap-4">
                <EventThumb category={e.category} size={52} />
                <div className="min-w-0 flex-1 leading-tight">
                  <h2 className="truncate text-base font-bold text-text">{e.title}</h2>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-dim">
                    <CalendarDays size={12} aria-hidden /> {e.dateLabel}
                  </p>
                </div>
                <Badge tone={tone[e.status]} dot={e.status === "on_sale"}>
                  {eventStatusLabel[e.status]}
                </Badge>
              </div>

              <dl className="mt-5 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <dt className="text-dim">Sold</dt>
                  <dd className="mt-1 font-bold text-text">
                    {e.sold} / {e.capacity}
                  </dd>
                </div>
                <div>
                  <dt className="text-dim">Revenue</dt>
                  <dd className="mt-1 font-bold text-text">{formatKrw(e.revenue)}</dd>
                </div>
                <div>
                  <dt className="text-dim">To verify</dt>
                  <dd className="mt-1 font-bold text-text">{e.pending || "—"}</dd>
                </div>
              </dl>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line" role="presentation">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber to-gold"
                  style={{ width: `${e.capacity ? Math.min(100, (e.sold / e.capacity) * 100) : 0}%` }}
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4 text-xs font-bold">
                <Link
                  href={`/organizer/events/${e.id}/edit`}
                  className="rounded-lg border border-line px-3 py-2 text-text hover:border-gold/50"
                >
                  Edit
                </Link>
                {[
                  ["Ticket types", "/organizer/ticket-types"],
                  ["Bookings", "/organizer/bookings"],
                  ["Attendees", "/organizer/attendees"],
                ].map(([label, href]) => (
                  <Link
                    key={href}
                    href={href!}
                    onClick={() => setEventId(e.id)}
                    className="rounded-lg px-3 py-2 text-muted hover:text-gold"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </Panel>
          </li>
        ))}
      </ul>
    </>
  );
}
