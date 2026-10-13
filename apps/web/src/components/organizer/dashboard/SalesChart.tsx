"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { formatKrw } from "@/lib/format";

type Point = { date: string; label: string; value: number };
type Mode = "tickets" | "revenue";

const DEFAULT_W = 680;
const H = 250;
const PAD = { l: 48, r: 14, t: 16, b: 30 };

const compactKrw = (n: number) => (n >= 1_000_000 ? `₩${+(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `₩${Math.round(n / 1000)}k` : `₩${n}`);

/** A "nice" axis maximum so gridlines land on round numbers. */
function niceMax(v: number) {
  if (v <= 0) return 10;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

/** Catmull-Rom spline through the points, as an SVG cubic path. */
function smooth(pts: [number, number][]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0]![0]} ${pts[0]![1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

export function SalesChart({ series, avgPrice, periodLabel }: { series: Point[]; avgPrice: number; periodLabel: string }) {
  const gradientId = useId().replace(/:/g, "");
  const [mode, setMode] = useState<Mode>("tickets");
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  // Draw at the real pixel width so axis text stays readable on phones instead of shrinking with the SVG.
  const [W, setW] = useState(DEFAULT_W);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry?.contentRect.width ?? 0);
      if (w > 0) setW(Math.max(280, w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const values = useMemo(() => series.map((p) => (mode === "tickets" ? p.value : p.value * avgPrice)), [series, mode, avgPrice]);
  const total = values.reduce((n, v) => n + v, 0);
  const yMax = niceMax(Math.max(...values));
  const n = series.length;
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  const xs = series.map((_, i) => PAD.l + (n === 1 ? plotW / 2 : (i * plotW) / (n - 1)));
  const ys = values.map((v) => PAD.t + (1 - v / yMax) * plotH);
  const pts = xs.map((x, i) => [x, ys[i]!] as [number, number]);
  const line = smooth(pts);
  const area = `${line} L ${xs[n - 1]} ${PAD.t + plotH} L ${xs[0]} ${PAD.t + plotH} Z`;

  const active = hover ?? n - 1;
  const fmt = (v: number) => (mode === "tickets" ? `${v} tickets` : formatKrw(v));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * yMax);
  const labelEvery = W < 420 ? (n <= 8 ? 2 : n <= 16 ? 4 : 7) : n <= 8 ? 1 : n <= 16 ? 2 : 5;

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6" aria-label="Sales overview">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-text">Sales overview</h2>
          <p className="mt-1 text-[11px] text-dim">Confirmed payments only · {periodLabel}</p>
        </div>
        <div role="tablist" aria-label="Chart measure" className="inline-flex gap-1 rounded-xl border border-line bg-surface-2 p-1">
          {(["tickets", "revenue"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`h-8 rounded-lg px-3.5 text-xs font-bold capitalize transition-colors focus-visible:focus-ring ${
                mode === m ? "bg-gradient-to-b from-gold to-amber text-ink" : "text-muted hover:text-text"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-5 text-[30px] font-bold leading-none text-text">
        {mode === "tickets" ? total.toLocaleString("en-US") : formatKrw(total)}
        <span className="ml-2 text-xs font-normal text-dim">{mode === "tickets" ? "tickets sold" : "confirmed revenue"}</span>
      </p>

      <div ref={box} className="relative mt-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`${mode} per day, ${periodLabel}`}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#f7cb60" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#e8a83a" stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((t) => {
            const y = PAD.t + (1 - t / yMax) * plotH;
            return (
              <g key={t}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke="#2c2723" strokeDasharray="3 5" />
                <text x={PAD.l - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#7a756c">
                  {mode === "tickets" ? Math.round(t) : compactKrw(t)}
                </text>
              </g>
            );
          })}

          <path d={area} fill={`url(#${gradientId})`} />
          <path d={line} fill="none" stroke="#f7cb60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {series.map((p, i) =>
            i % labelEvery === 0 ? (
              <text key={p.date} x={xs[i]} y={H - 8} textAnchor="middle" fontSize="11" fill="#7a756c">
                {p.label}
              </text>
            ) : null,
          )}

          {/* Active point */}
          <line x1={xs[active]} x2={xs[active]} y1={PAD.t} y2={PAD.t + plotH} stroke="#e8a83a" strokeOpacity="0.35" />
          <circle cx={xs[active]} cy={ys[active]} r="6" fill="#0b0907" stroke="#f7cb60" strokeWidth="3" />

          {/* Hit targets: one per day, keyboard reachable */}
          {series.map((p, i) => {
            const step = plotW / Math.max(1, n - 1);
            return (
              <rect
                key={p.date}
                x={xs[i]! - step / 2}
                y={PAD.t}
                width={step}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                aria-label={`${p.label}: ${fmt(values[i]!)}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="outline-none"
              />
            );
          })}
        </svg>

        <div
          aria-hidden
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-line bg-surface-2 px-3 py-2 text-center shadow-xl shadow-black/50"
          style={{
            left: `${(Math.min(Math.max(xs[active]!, 70), W - 70) / W) * 100}%`,
            top: `${(ys[active]! / H) * 100 - 3}%`,
          }}
        >
          <p className="text-[10px] text-dim">{series[active]!.label}</p>
          <p className="text-xs font-bold text-text">{fmt(values[active]!)}</p>
        </div>
      </div>
    </section>
  );
}
