import type { EntryStats } from "@/lib/operations";
import { Panel } from "../ui";

const reasonLabels = {
  already_used: "Ticket already used",
  wrong_event: "Ticket for a different event",
  not_found: "Code not recognised",
} as const;

export function EntryStatistics({ stats }: { stats: EntryStats }) {
  const slots = stats.timeline;
  const max = Math.max(1, ...slots.map((s) => s.value));
  const peak = slots.reduce<(typeof slots)[number] | null>((best, s) => (!best || s.value > best.value ? s : best), null);
  const minutes = slots.length * 15;
  const perMinute = minutes ? stats.checkedIn / minutes : 0;
  const totalRejected = Object.values(stats.rejected).reduce((n, v) => n + v, 0);
  const gateTotal = stats.byGate.reduce((n, g) => n + g.in, 0);
  const busiest = stats.byGate.reduce<(typeof stats.byGate)[number] | null>((b, g) => (!b || g.in > b.in ? g : b), null);

  return (
    <Panel className="p-5 sm:p-6">
      <h2 className="text-base font-bold text-text">Entry statistics</h2>
      <p className="mt-1 text-[11px] text-dim">When and where guests came in</p>

      {slots.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          No entries yet. The arrival chart fills in as people check in.
        </p>
      ) : (
        <>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact label="Busiest slot" value={peak ? `${peak.label} PM` : "—"} sub={peak ? `${peak.value} guests` : undefined} />
            <Fact label="Average pace" value={perMinute.toFixed(1)} sub="guests per minute" />
            <Fact
              label="Busiest door"
              value={busiest?.label ?? "—"}
              sub={busiest && gateTotal ? `${Math.round((busiest.in / gateTotal) * 100)}% of entries` : undefined}
            />
            <Fact label="Refused scans" value={String(totalRejected)} sub="not admitted" />
          </dl>

          <figure className="mt-6" aria-label="Guests checked in per 15 minutes">
            <div className="flex h-40 items-end gap-2 sm:gap-3">
              {slots.map((s) => {
                const isPeak = peak?.label === s.label;
                return (
                  <div key={s.label} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center">
                    <span className="mb-1 text-[11px] font-bold text-text">{s.value}</span>
                    <span
                      title={`${s.label}: ${s.value} guests`}
                      style={{ height: `${(s.value / max) * 82}%` }}
                      className={`block w-full rounded-t-md ${isPeak ? "bg-gradient-to-t from-amber to-gold" : "bg-amber/60"}`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex gap-2 sm:gap-3">
              {slots.map((s) => (
                <span key={s.label} className="min-w-0 flex-1 text-center text-[10px] text-dim">
                  {s.label}
                </span>
              ))}
            </div>
            <figcaption className="mt-3 text-[11px] text-dim">15-minute slots from when doors opened.</figcaption>
          </figure>
        </>
      )}

      <div className="mt-7 grid gap-6 border-t border-line pt-6 md:grid-cols-2">
        <section aria-label="Entries by door">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-dim">By door</h3>
          <ul className="space-y-3">
            {stats.byGate.map((g) => (
              <li key={g.label}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-text">{g.label}</span>
                  <span className="font-bold text-text">{g.in}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-line" role="presentation">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber to-gold"
                    style={{ width: `${gateTotal ? (g.in / gateTotal) * 100 : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Refused scans">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-dim">Refused scans</h3>
          <ul className="space-y-3">
            {(Object.keys(reasonLabels) as (keyof typeof reasonLabels)[]).map((k) => (
              <li key={k} className="flex items-center justify-between text-xs">
                <span className="text-muted">{reasonLabels[k]}</span>
                <span className={`font-bold ${stats.rejected[k] > 0 ? "text-danger" : "text-dim"}`}>{stats.rejected[k]}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Panel>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-3.5">
      <dt className="text-[11px] text-dim">{label}</dt>
      <dd className="mt-1.5 truncate text-base font-bold text-text">{value}</dd>
      {sub && <p className="mt-0.5 text-[11px] text-dim">{sub}</p>}
    </div>
  );
}
