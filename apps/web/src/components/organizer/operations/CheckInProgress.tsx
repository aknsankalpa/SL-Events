import type { EntryStats } from "@/lib/operations";
import { Panel } from "../ui";

/** The headline: how many people are in, as a ring, with the split by ticket type. */
export function CheckInProgress({ stats }: { stats: EntryStats }) {
  const pct = stats.expected ? Math.round((stats.checkedIn / stats.expected) * 100) : 0;
  const left = Math.max(0, stats.expected - stats.checkedIn);

  return (
    <Panel className="p-4 sm:p-5">
      <div>
        <h2 className="text-base font-bold text-text">Check-in progress</h2>
        <p className="mt-1 text-[11px] text-dim lg:[@media(max-height:760px)]:hidden">Paid tickets scanned or checked in by hand</p>
      </div>

      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <div className="relative size-28 shrink-0">
          <svg viewBox="0 0 42 42" className="size-full -rotate-90" role="img" aria-label={`${pct}% checked in`}>
            <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#2c2723" strokeWidth="4" />
            <circle
              cx="21"
              cy="21"
              r="15.9155"
              fill="none"
              stroke="#f7cb60"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${pct} ${100 - pct}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[26px] font-bold leading-none text-text">{pct}%</span>
            <span className="mt-1 text-[10px] text-dim">checked in</span>
          </div>
        </div>

        <div className="w-full min-w-0 flex-1">
          <p className="text-2xl font-bold text-text">
            {stats.checkedIn}
            <span className="text-base font-normal text-dim"> of {stats.expected} guests in</span>
          </p>
          <p className="mt-1 text-xs text-muted">{left} still to arrive</p>

          {stats.byType.length > 0 && (
            <ul className="mt-4 grid gap-x-5 gap-y-2.5 sm:grid-cols-2">
              {stats.byType.map((t) => (
                <li key={t.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-bold text-text">{t.label}</span>
                    <span className="text-muted">
                      {t.in} / {t.of}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-line" role="presentation">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber to-gold"
                      style={{ width: `${t.of ? (t.in / t.of) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {!stats.live && (
        <p className="mt-4 rounded-lg border border-line bg-surface-2 px-4 py-3 text-xs text-muted">
          Check-in hasn&apos;t started. Numbers appear here once scanners begin admitting guests.
        </p>
      )}
    </Panel>
  );
}
