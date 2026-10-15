"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { ActivityItem, EventOps, OpsSettings, StaffMember } from "@/lib/operations";
import { getServerSnapshot, getSnapshot, opsFor, subscribe, updateOps } from "@/lib/opsStore";
import { newId } from "@/lib/organizer";

const stamp = () => new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** Read and change one event's operations record. Every change also lands in the activity log. */
export function useEventOps(eventId: string) {
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ops = useMemo(() => opsFor(all, eventId), [all, eventId]);

  const apply = useCallback(
    (change: (o: EventOps) => EventOps, log?: Omit<ActivityItem, "id" | "time">) =>
      updateOps(eventId, (o) => {
        const next = change(o);
        return log ? { ...next, activity: [{ ...log, id: newId("act"), time: stamp() }, ...next.activity].slice(0, 30) } : next;
      }),
    [eventId],
  );

  return {
    ops,
    addStaff: (s: StaffMember) =>
      apply((o) => ({ ...o, staff: [...o.staff, s] }), { kind: "staff", text: `${s.name} was invited as ${s.role === "gate_lead" ? "Gate lead" : s.role === "scanner" ? "Scanner" : "Help desk"}` }),
    updateStaff: (s: StaffMember) =>
      apply((o) => ({ ...o, staff: o.staff.map((x) => (x.id === s.id ? s : x)) }), { kind: "staff", text: `${s.name}'s access was updated` }),
    removeStaff: (s: StaffMember) =>
      apply((o) => ({ ...o, staff: o.staff.filter((x) => x.id !== s.id) }), { kind: "staff", text: `${s.name} was removed. Their access has ended` }),
    saveSettings: (settings: OpsSettings) => apply((o) => ({ ...o, settings }), { kind: "setting", text: "Event-day settings were updated" }),
  };
}
