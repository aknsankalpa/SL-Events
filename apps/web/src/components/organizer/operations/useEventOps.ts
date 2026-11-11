"use client";

import { useCallback, useEffect, useState } from "react";
import { defaultSettings, type ActivityItem, type EntryStats, type OpsSettings, type StaffMember } from "@/lib/operations";

type Ops = { staff: StaffMember[]; settings: OpsSettings; activity: ActivityItem[]; stats: EntryStats | null };
const EMPTY: Ops = { staff: [], settings: defaultSettings, activity: [], stats: null };

/**
 * One event's operations from the server: door staff, event-day settings, the activity feed and entry statistics.
 * Changes go to the server; `error` holds its reason when it refuses one. Loads again every 30 seconds so entry numbers
 * keep up on the event day.
 */
export function useEventOps(eventId: string) {
  const [state, setState] = useState<{ id: string; ops: Ops; loaded: boolean }>({ id: "", ops: EMPTY, loaded: false });
  const [error, setError] = useState<string>();
  const base = eventId ? `/api/organizer/events/${encodeURIComponent(eventId)}/operations` : null;

  const reload = useCallback(async () => {
    if (!base) return;
    try {
      const res = await fetch(base, { credentials: "same-origin", cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as Partial<Ops> & { error?: string };
      if (res.ok) setState({ id: eventId, loaded: true, ops: { staff: data.staff ?? [], settings: data.settings ?? defaultSettings, activity: data.activity ?? [], stats: data.stats ?? null } });
      else setError(data.error ?? "Couldn't load operations.");
    } catch {
      setError("We couldn't reach SL Events.");
    }
  }, [base, eventId]);

  useEffect(() => {
    // Loading is the effect's whole job; its state arrives asynchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
    const id = setInterval(() => void reload(), 30_000);
    return () => clearInterval(id);
  }, [reload]);

  const send = useCallback(
    async (path: string, method: string, body?: unknown) => {
      if (!base) return;
      setError(undefined);
      try {
        const res = await fetch(`${base}${path}`, {
          method,
          headers: body === undefined ? undefined : { "content-type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
          credentials: "same-origin",
          cache: "no-store",
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) setError(data.error ?? "That didn't work. Try again.");
      } catch {
        setError("We couldn't reach SL Events.");
      }
      await reload();
    },
    [base, reload],
  );

  const current = state.id === eventId ? state : { ops: EMPTY, loaded: false };
  return {
    ops: current.ops,
    loaded: current.loaded,
    error,
    addStaff: (s: StaffMember) => void send("/staff", "POST", { name: s.name, contact: s.contact, role: s.role, gate: s.gate, accessFrom: s.accessFrom, accessUntil: s.accessUntil }),
    updateStaff: (s: StaffMember) => void send(`/staff/${encodeURIComponent(s.id)}`, "PATCH", { role: s.role, gate: s.gate, accessFrom: s.accessFrom, accessUntil: s.accessUntil, status: s.status }),
    removeStaff: (s: StaffMember) => void send(`/staff/${encodeURIComponent(s.id)}`, "DELETE"),
    saveSettings: (settings: OpsSettings) => void send("/settings", "PUT", { settings }),
  };
}
