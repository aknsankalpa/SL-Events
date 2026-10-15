"use client";

import { useSyncExternalStore } from "react";
import { Ban, Download, Eye, ScanLine, ShieldAlert, UserCheck, Users, UserX, type LucideIcon } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { Breadcrumbs } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/StatusBadge";
import { statsFor } from "@/lib/operations";
import { attendees, daysUntil, eventStatusLabel } from "@/lib/organizer";
import { useOrganizer } from "../OrganizerContext";
import { downloadCsv, OrgPageHeader, Panel, TabbedPanel } from "../ui";
import { ActivityPanel } from "./ActivityPanel";
import { CheckInProgress } from "./CheckInProgress";
import { EntryStatistics } from "./EntryStatistics";
import { EventDaySettings } from "./EventDaySettings";
import { StaffPanel } from "./StaffPanel";
import { useEventOps } from "./useEventOps";

export function OperationsPage({ id }: { id: string }) {
  const { events } = useOrganizer();
  // Created events come from the browser store, which is empty until hydration: wait before deciding "not found".
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const event = events.find((e) => e.id === id);

  if (!hydrated) return <p className="text-sm text-muted">Loading event…</p>;
  if (!event) {
    return (
      <Panel className="p-10 text-center">
        <p className="text-base font-bold text-text">Event not found</p>
        <LinkButton href="/organizer/events" className="mt-5">
          Back to events
        </LinkButton>
      </Panel>
    );
  }
  return <Operations key={id} id={id} />;
}

function Operations({ id }: { id: string }) {
  const { events, setEventId } = useOrganizer();
  const event = events.find((e) => e.id === id)!;
  const { ops, addStaff, updateStaff, removeStaff, saveSettings } = useEventOps(id);

  if (event.status === "draft") {
    return (
      <>
        <OrgPageHeader
          crumbs={[{ label: "Events", href: "/organizer/events" }, { label: event.title }, { label: "Operations" }]}
          title="Event operations"
        />
        <Panel className="mx-auto max-w-xl p-10 text-center">
          <ShieldAlert size={26} aria-hidden className="mx-auto text-dim" />
          <p className="mt-4 text-base font-bold text-text">Operations open once the event is submitted</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Check-in, door staff and event-day settings are set up for events that have been sent for review.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <LinkButton href={`/organizer/events/${id}/preview`} variant="outline">
              <Eye size={15} aria-hidden /> Preview draft
            </LinkButton>
            <LinkButton href={`/organizer/events/${id}/edit`}>Continue editing</LinkButton>
          </div>
        </Panel>
      </>
    );
  }

  const stats = statsFor(id, event.sold);
  const activeStaff = ops.staff.filter((s) => s.status === "active").length;
  const invited = ops.staff.filter((s) => s.status === "invited").length;
  const refused = Object.values(stats.rejected).reduce((n, v) => n + v, 0);
  const left = Math.max(0, stats.expected - stats.checkedIn);
  const days = event.startsAt ? daysUntil(event.startsAt) : null;

  const phase = stats.live
    ? { tone: "success" as const, label: "Check-in live" }
    : { tone: "neutral" as const, label: days !== null && days > 0 ? `Opens in ${days} days` : eventStatusLabel[event.status] };

  function exportCheckIns() {
    downloadCsv(`${id}-check-ins.csv`, [
      ["Ticket holder", "Ticket", "Code", "Booking", "Check-in"],
      ...attendees.map((a) => [a.name, a.ticket, a.code, a.booking, a.state === "checked_in" ? "Checked in" : a.state === "cancelled" ? "Cancelled" : "Not yet"]),
    ]);
  }

  return (
    // On desktop this is exactly one screen tall (the page never scrolls) and each tab body scrolls inside its card.
    // The floor keeps very short windows scrollable instead of crushing the cards. Phones stack and scroll.
    <div className="flex flex-col gap-4 lg:h-[max(calc(100dvh-3.5rem),32rem)]">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <Breadcrumbs crumbs={[{ label: "Events", href: "/organizer/events" }, { label: event.title }, { label: "Operations" }]} />
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-[26px] font-bold leading-tight text-text sm:text-[28px]">Event operations</h1>
            <Badge tone={phase.tone} dot={phase.tone === "success"}>
              {phase.label}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button size="sm" variant="outline" className="border-line bg-surface text-text hover:bg-surface-2" onClick={exportCheckIns}>
            <Download size={15} aria-hidden /> Export
          </Button>
          <LinkButton size="sm" href="/organizer/scanner" onClick={() => setEventId(id)}>
            <ScanLine size={15} aria-hidden /> Open scanner
          </LinkButton>
        </div>
      </header>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <OpsStat
          label="Checked in"
          value={`${stats.checkedIn} / ${stats.expected}`}
          Icon={UserCheck}
          sub={stats.expected ? `${Math.round((stats.checkedIn / stats.expected) * 100)}% of guests` : "No guests yet"}
        />
        <OpsStat label="Still to arrive" value={String(left)} Icon={Users} sub="Paid tickets not yet scanned" />
        <OpsStat
          label="Refused scans"
          value={String(refused)}
          Icon={Ban}
          warn={refused > 0}
          sub={refused > 0 ? "Already used, wrong event or unknown" : "None so far"}
        />
        <OpsStat
          label="Staff on duty"
          value={`${activeStaff} / ${ops.staff.length}`}
          Icon={invited > 0 ? UserX : UserCheck}
          warn={invited > 0}
          sub={invited > 0 ? `${invited} invite${invited === 1 ? "" : "s"} not accepted yet` : "Everyone has accepted"}
        />
      </ul>

      {/* "contents" keeps the left wrapper out of the way on phones and makes it one desktop column. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)]">
        <div className="contents lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-4">
          <CheckInProgress stats={stats} />
          <TabbedPanel
            label="Entry statistics and activity"
            tabs={[
              { id: "entry", label: "Entry statistics", content: <EntryStatistics bare stats={stats} /> },
              { id: "activity", label: "Recent activity", content: <ActivityPanel bare items={ops.activity} /> },
            ]}
          />
        </div>
        <TabbedPanel
          label="Staff and event-day settings"
          tabs={[
            {
              id: "staff",
              label: "Event staff",
              content: <StaffPanel bare staff={ops.staff} onAdd={addStaff} onUpdate={updateStaff} onRemove={removeStaff} />,
            },
            { id: "settings", label: "Event-day settings", content: <EventDaySettings bare settings={ops.settings} onSave={saveSettings} /> },
          ]}
        />
      </div>
    </div>
  );
}

function OpsStat({ label, value, sub, Icon, warn }: { label: string; value: string; sub: string; Icon: LucideIcon; warn?: boolean }) {
  return (
    <li className="min-w-0 rounded-xl border border-line bg-surface p-3.5">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold lg:hidden xl:flex">
          <Icon size={16} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-muted">{label}</p>
          <p className="mt-1 truncate text-[20px] font-bold leading-none text-text">{value}</p>
        </div>
      </div>
      {/* The note is dropped on short desktop windows so the cards stay one line shorter. */}
      <p className={`mt-2 truncate text-[11px] ${warn ? "text-amber" : "text-dim"} lg:hidden lg:[@media(min-height:820px)]:block`}>
        {sub}
      </p>
    </li>
  );
}
