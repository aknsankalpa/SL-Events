import { useMemo } from "react";
import { outcomeMeta, seedLog, staffEvent, type Outcome } from "./data";
import { useNow } from "@/lib/hooks";
import { useScans, type ScanResult } from "./store";

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

/** The recorded numbers for an event plus everything this phone has scanned since. */
export function useSummary(eventId: string): Summary | undefined {
  const scans = useScans();
  const now = useNow();
  return useMemo(() => {
    const e = staffEvent(eventId);
    if (!e) return undefined;
    const live: ScanResult[] = scans[eventId]?.log ?? [];
    const admits = live.filter((r) => r.outcome === "admit");
    const refused = live.filter((r) => outcomeMeta[r.outcome].refused);

    const byType = e.base.byType.map((t) => ({ ...t, in: t.in + admits.filter((r) => r.ticket === t.label).length }));
    for (const r of admits) if (!byType.some((t) => t.label === r.ticket)) byType.push({ label: r.ticket, in: 1, of: 0 });
    const byGate = e.base.byGate.map((g) => ({ ...g, in: g.in + admits.filter((r) => r.gate === g.label).length }));
    for (const r of admits) if (!byGate.some((g) => g.label === r.gate)) byGate.push({ label: r.gate, staff: "", in: admits.filter((x) => x.gate === r.gate).length });

    const checkedIn = e.base.checkedIn + admits.length;
    const recentAdmits = admits.filter((r) => now - new Date(r.at).getTime() < 5 * 60_000).length;
    // The seeded rows stand for scans made on other phones earlier tonight; only the live Music Night has them.
    const rows: LogRow[] = [...live.map(rowOf), ...(eventId === "music-night" ? seedLog : [])];
    const lastAdmit = live.find((r) => r.outcome === "admit");

    return {
      expected: e.expected,
      checkedIn,
      stillToArrive: Math.max(0, e.expected - checkedIn),
      rejected: e.base.rejected + refused.length,
      perMinute: e.phase === "past" ? 0 : Math.round((e.base.perMinute * 5 + recentAdmits) / 5),
      percent: e.expected ? Math.round((checkedIn / e.expected) * 100) : 0,
      byType,
      byGate,
      recent: rows,
      last: lastAdmit ? rowOf(lastAdmit) : eventId === "music-night" ? seedLog[0] : undefined,
    };
  }, [scans, eventId, now]);
}

const rowOf = (r: ScanResult): LogRow => ({ id: r.id, time: r.time, name: r.name, ticket: r.ticket, gate: r.gate, outcome: r.outcome });
