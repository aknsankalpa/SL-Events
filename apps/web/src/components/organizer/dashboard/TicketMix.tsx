const palette = ["#f7cb60", "#e0281f", "#e8a83a", "#ece7dc", "#8c1a14", "#b5ada0"];

type Slice = { label: string; sold: number };

/** Donut of tickets sold by ticket type. Segment lengths use a circumference of 100 for easy dash maths. */
export function TicketMix({ slices }: { slices: Slice[] }) {
  const total = slices.reduce((n, s) => n + s.sold, 0);
  // Each segment starts where the previous one ended.
  const segments: { label: string; len: number; start: number }[] = [];
  let cursor = 0;
  for (const s of slices) {
    const len = total ? (s.sold / total) * 100 : 0;
    segments.push({ label: s.label, len, start: cursor });
    cursor += len;
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6" aria-label="Sales by ticket type">
      <h2 className="text-base font-bold text-text">Sales by ticket type</h2>
      <p className="mt-1 text-[11px] text-dim">Share of tickets sold</p>

      {total === 0 ? (
        <p className="mt-6 text-sm text-muted">No sales yet.</p>
      ) : (
        <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row xl:flex-col 2xl:flex-row">
          <div className="relative size-40 shrink-0">
            <svg viewBox="0 0 42 42" className="size-full -rotate-90" role="img" aria-label={`${total} tickets sold`}>
              <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#2c2723" strokeWidth="5" />
              {segments.map((seg, i) => (
                <circle
                  key={seg.label}
                  cx="21"
                  cy="21"
                  r="15.9155"
                  fill="none"
                  stroke={palette[i % palette.length]}
                  strokeWidth="5"
                  strokeDasharray={`${Math.max(0, seg.len - 0.8)} ${100 - Math.max(0, seg.len - 0.8)}`}
                  strokeDashoffset={-seg.start}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[26px] font-bold leading-none text-text">{total}</span>
              <span className="mt-1 text-[10px] text-dim">tickets</span>
            </div>
          </div>

          <ul className="w-full space-y-3">
            {slices.map((s, i) => (
              <li key={s.label} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-2.5 text-muted">
                  <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: palette[i % palette.length] }} />
                  <span className="truncate">{s.label}</span>
                </span>
                <span className="shrink-0 font-bold text-text">
                  {s.sold} <span className="font-normal text-dim">· {Math.round((s.sold / total) * 100)}%</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
