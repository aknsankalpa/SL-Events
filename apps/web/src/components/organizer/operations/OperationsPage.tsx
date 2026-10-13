"use client";

import { useState, useSyncExternalStore } from "react";
import { Download, Eye, PauseCircle, PlayCircle, ScanLine, ShieldAlert, UserCheck, Users, UserX, Ban } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/StatusBadge";
import { statsFor } from "@/lib/operations";
import { attendees, daysUntil, eventStatusLabel } from "@/lib/organizer";
import { useOrganizer } from "../OrganizerContext";
import { Dialog, downloadCsv, OrgPageHeader, Panel, StatCard } from "../ui";
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
  const { ops, addStaff, updateStaff, removeStaff, saveSettings, setPaused } = useEventOps(id);
  const [confirmPause, setConfirmPause] = useState(false);

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

  const phase = ops.paused
    ? { tone: "warning" as const, label: "Check-in paused" }
    : stats.live
      ? { tone: "success" as const, label: "Check-in live" }
      : { tone: "neutral" as const, label: days !== null && days > 0 ? `Opens in ${days} days` : eventStatusLabel[event.status] };

  function exportCheckIns() {
    downloadCsv(`${id}-check-ins.csv`, [
      ["Ticket holder", "Ticket", "Code", "Booking", "Check-in"],
      ...attendees.map((a) => [a.name, a.ticket, a.code, a.booking, a.state === "checked_in" ? "Checked in" : a.state === "cancelled" ? "Cancelled" : "Not yet"]),
    ]);
  }

  return (
    <>
      <OrgPageHeader
        crumbs={[{ label: "Events", href: "/organizer/events" }, { label: event.title }, { label: "Operations" }]}
        title="Event operations"
        titleAside={
          <Badge tone={phase.tone} dot={phase.tone === "success"}>
            {phase.label}
          </Badge>
        }
        actions={
          <>
            <Button
              variant="outline"
              className="border-line bg-surface text-text hover:bg-surface-2"
              onClick={() => (ops.paused ? setPaused(false) : setConfirmPause(true))}
            >
              {ops.paused ? <PlayCircle size={16} aria-hidden /> : <PauseCircle size={16} aria-hidden />}
              {ops.paused ? "Resume check-in" : "Pause check-in"}
            </Button>
            <Button variant="outline" className="border-line bg-surface text-text hover:bg-surface-2" onClick={exportCheckIns}>
              <Download size={16} aria-hidden /> Export
            </Button>
            <LinkButton href="/organizer/scanner" onClick={() => setEventId(id)}>
              <ScanLine size={16} aria-hidden /> Open scanner
            </LinkButton>
          </>
        }
      />

      <p className="-mt-3 mb-6 text-sm text-muted">{event.title}</p>

      {ops.paused && (
        <p
          role="status"
          className="mb-5 flex items-start gap-3 rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-[13px] text-text"
        >
          <PauseCircle size={16} aria-hidden className="mt-0.5 shrink-0 text-amber" />
          Check-in is paused. Every scanner shows &ldquo;Check-in paused&rdquo; and admits no one until you resume.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Checked in"
          value={`${stats.checkedIn} / ${stats.expected}`}
          Icon={UserCheck}
          sub={stats.expected ? `${Math.round((stats.checkedIn / stats.expected) * 100)}% of guests` : "No guests yet"}
        />
        <StatCard label="Still to arrive" value={left} Icon={Users} sub="Paid tickets not yet scanned" />
        <StatCard
          label="Refused scans"
          value={refused}
          Icon={Ban}
          subTone={refused > 0 ? "warn" : "default"}
          sub={refused > 0 ? "Already used, wrong event or unknown" : "None so far"}
        />
        <StatCard
          label="Staff on duty"
          value={`${activeStaff} / ${ops.staff.length}`}
          Icon={invited > 0 ? UserX : UserCheck}
          subTone={invited > 0 ? "warn" : "default"}
          sub={invited > 0 ? `${invited} invite${invited === 1 ? "" : "s"} not accepted yet` : "Everyone has accepted"}
        />
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-2">
        <div className="min-w-0 space-y-6">
          <CheckInProgress stats={stats} paused={ops.paused} />
          <EntryStatistics stats={stats} />
          <ActivityPanel items={ops.activity} />
        </div>
        <div className="min-w-0 space-y-6">
          <StaffPanel staff={ops.staff} onAdd={addStaff} onUpdate={updateStaff} onRemove={removeStaff} />
          <EventDaySettings settings={ops.settings} onSave={saveSettings} />
        </div>
      </div>

      <Dialog open={confirmPause} onClose={() => setConfirmPause(false)} title="Pause check-in?">
        <p className="text-sm leading-relaxed text-muted">
          Every scanner will stop admitting guests until you resume. Use this for an emergency or a stop in the programme. Guests
          already inside are not affected.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmPause(false)}>
            Keep going
          </Button>
          <Button
            onClick={() => {
              setPaused(true);
              setConfirmPause(false);
            }}
          >
            Pause check-in
          </Button>
        </div>
      </Dialog>
    </>
  );
}
