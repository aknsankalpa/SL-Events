"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, Eye, FilePen, Pencil, Plus, ScanLine } from "lucide-react";
import { EventThumb } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/StatusBadge";
import { formatKrw } from "@/lib/format";
import { eventStatusLabel, type OrganizerEvent } from "@/lib/organizer";
import { useOrganizer } from "./OrganizerContext";
import { OrgPageHeader, Panel } from "./ui";

const tone = { on_sale: "success", draft: "neutral", in_review: "warning" } as const;

type TabId = "all" | OrganizerEvent["status"];

const tabs: { id: TabId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "on_sale", label: "On sale" },
  { id: "in_review", label: "In review" },
  { id: "draft", label: "Drafts" },
];

/** Not in the Figma file: the index the Events menu item lands on, with draft review. */
export function EventsList() {
  const { events, setEventId } = useOrganizer();
  const [tab, setTab] = useState<TabId>("all");

  const visible = events.filter((e) => tab === "all" || e.status === tab);
  const count = (id: TabId) => (id === "all" ? events.length : events.filter((e) => e.status === id).length);

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

      <div role="tablist" aria-label="Filter events" className="-mx-1 mb-5 flex max-w-full gap-1 overflow-x-auto px-1">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-bold transition-colors focus-visible:focus-ring ${
                active ? "border-amber text-gold" : "border-transparent text-muted hover:text-text"
              }`}
            >
              {t.id === "draft" && <FilePen size={14} aria-hidden />}
              {t.label}
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">{count(t.id)}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <Panel className="p-10 text-center">
          <FilePen size={26} aria-hidden className="mx-auto text-dim" />
          <p className="mt-4 text-base font-bold text-text">{tab === "draft" ? "No drafts yet" : "No events here"}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            {tab === "draft"
              ? "Choose “Save as draft” while creating an event and it will show up here, where you can preview exactly how buyers will see it."
              : "Events in this state will appear here."}
          </p>
          <LinkButton href="/organizer/events/new" className="mt-5">
            <Plus size={16} aria-hidden /> Create event
          </LinkButton>
        </Panel>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {visible.map((e) => (
            <li key={e.id} className="min-w-0">
              <Panel className={`flex h-full flex-col p-5 ${e.status === "draft" ? "border-dashed" : ""}`}>
                <div className="flex items-start gap-4">
                  <EventThumb category={e.category} size={52} />
                  <div className="min-w-0 flex-1 leading-tight">
                    <h2 className="truncate text-base font-bold text-text">{e.title}</h2>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-dim">
                      <CalendarDays size={12} aria-hidden /> {e.dateLabel || "No date yet"}
                    </p>
                    {e.venue && <p className="mt-1 truncate text-xs text-dim">{e.venue}</p>}
                  </div>
                  <Badge tone={tone[e.status]} dot={e.status === "on_sale"}>
                    {eventStatusLabel[e.status]}
                  </Badge>
                </div>

                <dl className="mt-5 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <dt className="text-dim">{e.status === "draft" ? "Capacity" : "Sold"}</dt>
                    <dd className="mt-1 font-bold text-text">
                      {e.status === "draft" ? e.capacity || "—" : `${e.sold} / ${e.capacity}`}
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
                {e.status !== "draft" && (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line" role="presentation">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber to-gold"
                      style={{ width: `${e.capacity ? Math.min(100, (e.sold / e.capacity) * 100) : 0}%` }}
                    />
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-xs font-bold">
                  <Link
                    href={`/organizer/events/${e.id}/preview`}
                    className={
                      e.status === "draft"
                        ? "flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-gold to-amber px-3 py-2 text-ink hover:brightness-110"
                        : "flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-text hover:border-gold/50"
                    }
                  >
                    <Eye size={13} aria-hidden /> {e.status === "draft" ? "Preview draft" : "Preview"}
                  </Link>
                  <Link
                    href={`/organizer/events/${e.id}/edit`}
                    className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-text hover:border-gold/50"
                  >
                    <Pencil size={13} aria-hidden /> {e.status === "draft" ? "Continue editing" : "Edit"}
                  </Link>
                  {e.status !== "draft" && (
                    <Link
                      href={`/organizer/events/${e.id}/operations`}
                      className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-text hover:border-gold/50"
                    >
                      <ScanLine size={13} aria-hidden /> Operations
                    </Link>
                  )}
                  {e.status !== "draft" &&
                    [
                      ["Ticket types", "/organizer/ticket-types"],
                      ["Bookings", "/organizer/bookings"],
                      ["Attendees", "/organizer/attendees"],
                    ].map(([label, href]) => (
                      <Link
                        key={href}
                        href={href!}
                        onClick={() => setEventId(e.id)}
                        className="rounded-lg px-2.5 py-2 text-muted hover:text-gold"
                      >
                        {label}
                      </Link>
                    ))}
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
