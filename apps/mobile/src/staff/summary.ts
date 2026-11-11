import { useMemo } from "react";
import { staffEvent, useStaffHome, type Outcome } from "./data";
import { useSession } from "@/lib/hooks";

export type LogRow = { id: string; time: string; name: string; ticket: string; gate: string; outcome: Outcome };

export type Summary = {
  expected: number;
  checkedIn: number;
  stillToArrive: number;
  rejected: number;
  perMinute: number;
  percent: number;
  byType: { label: string; in: number; of: number }[];
  byGate: { label: string; staff: string; in: number }[];
  recent: LogRow[];
  last?: LogRow;
};

/** An event's entry numbers and latest scans, from the website (every phone at the door counts). */
export function useSummary(eventId: string): Summary | undefined {
  const user = useSession();
  const { events } = useStaffHome(user?.email);
  return useMemo(() => {
    const e = events.find((x) => x.id === eventId) ?? staffEvent(eventId);
    if (!e) return undefined;
    const { checkedIn, rejected, perMinute, byType, byGate } = e.base;
    return {
      expected: e.expected,
      checkedIn,
      stillToArrive: Math.max(0, e.expected - checkedIn),
      rejected,
      perMinute: e.phase === "past" ? 0 : perMinute,
      percent: e.expected ? Math.round((checkedIn / e.expected) * 100) : 0,
      byType,
      byGate,
      recent: e.recent,
      last: e.recent.find((r) => r.outcome === "admit"),
    };
  }, [events, eventId]);
}
