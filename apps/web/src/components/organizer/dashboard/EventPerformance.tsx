import { Download } from "lucide-react";
import { EventThumb } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/StatusBadge";
import { formatKrw } from "@/lib/format";
import type { OrganizerEvent } from "@/lib/organizer";
import { downloadCsv } from "../ui";

/** Sales and payments to check, per event. The surrounding panel provides the card, title and scrolling. */
export function EventPerformance({ events }: { events: OrganizerEvent[] }) {
  return (
    <table className="w-full min-w-[40rem] text-left text-[13px]">
      <thead className="sticky top-0 z-10 bg-surface-2 text-[10px] uppercase tracking-wider text-dim">
        <tr>
          {["Event", "Date", "Sold", "Revenue", "To verify"].map((h) => (
            <th key={h} scope="col" className="whitespace-nowrap px-5 py-2.5 font-bold">
              {h}
            </th>
          ))}
          <th scope="col" className="px-5">
            <span className="sr-only">Report</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {events.map((e) => (
          <tr key={e.id} className="border-t border-line">
            <td className="px-5 py-3">
              <span className="flex items-center gap-3 font-bold text-text">
                <EventThumb category={e.category} size={30} />
                <span className="whitespace-nowrap">{e.title}</span>
              </span>
            </td>
            <td className="whitespace-nowrap px-5 py-3 text-muted">{e.shortDate}</td>
            <td className="px-5 py-3">
              <div className="w-32">
                <p className="mb-1.5 text-[11px] text-muted">
                  {e.sold} / {e.capacity}
                </p>
                <div className="h-1.5 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber to-gold"
                    style={{ width: `${e.capacity ? (e.sold / e.capacity) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </td>
            <td className="whitespace-nowrap px-5 py-3 font-bold text-text">{formatKrw(e.revenue)}</td>
            <td className="px-5 py-3">
              {e.pending > 0 ? <Badge tone="warning">{e.pending} pending</Badge> : <span className="text-dim">—</span>}
            </td>
            <td className="px-5 py-3 text-right">
              <Button
                variant="outline"
                size="sm"
                className="border-line text-text hover:bg-surface-2"
                onClick={() =>
                  downloadCsv(`${e.id}-report.csv`, [
                    ["Event", "Date", "Sold", "Capacity", "Revenue (KRW)", "Payments to verify"],
                    [e.title, e.shortDate, e.sold, e.capacity, e.revenue, e.pending],
                  ])
                }
              >
                <Download size={14} aria-hidden /> Report
              </Button>
            </td>
          </tr>
        ))}
        {events.length === 0 && (
          <tr>
            <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted">
              No events to show.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
