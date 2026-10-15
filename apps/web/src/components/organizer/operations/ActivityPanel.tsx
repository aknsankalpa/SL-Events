import { Cog, ScanLine, Settings2, UserCog, type LucideIcon } from "lucide-react";
import type { ActivityItem } from "@/lib/operations";
import { Panel } from "../ui";

const icons: Record<ActivityItem["kind"], LucideIcon> = {
  scan: ScanLine,
  staff: UserCog,
  setting: Settings2,
  system: Cog,
};

export function ActivityPanel({ items, bare }: { items: ActivityItem[]; bare?: boolean }) {
  return (
    <Panel bare={bare} className="p-5 sm:p-6">
      <h2 className="text-base font-bold text-text">Recent activity</h2>
      <p className="mt-1 text-[11px] text-dim">Scans, staff and setting changes for this event</p>

      {items.length === 0 ? (
        <p className="mt-5 text-sm text-muted">Nothing has happened yet.</p>
      ) : (
        <ol className="mt-5 space-y-4">
          {items.slice(0, 8).map((a) => {
            const Icon = icons[a.kind];
            return (
              <li key={a.id} className="flex gap-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-gold">
                  <Icon size={14} aria-hidden />
                </span>
                <span className="min-w-0 flex-1 leading-snug">
                  <span className="block text-xs text-text">{a.text}</span>
                  <span className="mt-0.5 block text-[11px] text-dim">{a.time}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
