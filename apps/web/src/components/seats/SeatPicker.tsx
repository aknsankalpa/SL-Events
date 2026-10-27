"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, Maximize, Minus, Plus, Sparkles } from "lucide-react";
import { formatKrw } from "@/lib/format";
import { findSeatsTogether, sectionFree, type ChartSeat, type SeatChart } from "@/lib/seating";

type Props = {
  chart: SeatChart;
  /** Ids of seats someone else holds. */
  taken: ReadonlySet<string>;
  selected: readonly string[];
  /** Leave out for a chart that is only for looking at. */
  onToggle?: (id: string) => void;
  /** Used by "Find seats together" to choose several seats in one go. */
  onSelectMany?: (ids: string[]) => void;
  max?: number;
};

const TAKEN = "#3a3631";
const PAD = 28;
const clampZoom = (z: number) => Math.min(4, Math.max(0.2, +z.toFixed(2)));

/** The seat chart as buyers see it: coloured by section, taken seats greyed out, tap a seat to choose it. */
export function SeatPicker({ chart, taken, selected, onToggle, onSelectMany, max = 10 }: Props) {
  const interactive = !!onToggle;
  const pick = useMemo(() => new Set(selected), [selected]);
  const sections = useMemo(() => new Map(chart.sections.map((s) => [s.id, s])), [chart.sections]);

  // Crop the view to the seats and stage, so a small room fills the screen instead of floating in a 1400px canvas.
  const view = useMemo(() => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const s of chart.seats) {
      xs.push(s.x - s.r, s.x + s.r);
      ys.push(s.y - s.r, s.y + s.r);
    }
    if (chart.stage) {
      xs.push(chart.stage.x, chart.stage.x + chart.stage.w);
      ys.push(chart.stage.y, chart.stage.y + chart.stage.h);
    }
    const minX = Math.max(0, Math.min(...xs, chart.width) - PAD);
    const minY = Math.max(0, Math.min(...ys, chart.height) - PAD);
    const maxX = Math.min(chart.width, Math.max(...xs, 0) + PAD);
    const maxY = Math.min(chart.height, Math.max(...ys, 0) + PAD);
    return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
  }, [chart]);

  const medianR = useMemo(() => {
    const rs = chart.seats.map((s) => s.r).sort((a, b) => a - b);
    return rs.length ? rs[rs.length >> 1]! : 10;
  }, [chart.seats]);

  const box = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(0);
  const [focus, setFocus] = useState<string | null>(null);
  const [group, setGroup] = useState(2);
  const [note, setNote] = useState<string>();
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number; cx: number; cy: number; padX: number; padY: number } | null>(null);
  const anchor = useRef<{ cx: number; cy: number; padX: number; padY: number; mx: number; my: number } | null>(null);

  const fit = () => {
    const el = box.current;
    if (!el) return;
    setZoom(clampZoom(Math.floor(((el.clientWidth - 8) / view.w) * 100) / 100));
  };

  // Start fitted, but never so small that a seat can't be tapped: on a narrow screen the chart scrolls sideways instead.
  const started = useRef(false);
  const attach = useCallback(
    (el: HTMLDivElement | null) => {
      box.current = el;
      if (!el || started.current) return;
      started.current = true;
      const fitted = (el.clientWidth - 8) / view.w;
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const z = clampZoom(Math.max(fitted, (coarse ? 18 : 12) / (2 * medianR)));
      setZoom(z);
      // Centre the room once the sized chart has rendered.
      requestAnimationFrame(() => {
        el.scrollLeft = Math.max(0, (view.w * z - el.clientWidth) / 2);
      });
    },
    [view.w, medianR],
  );

  useLayoutEffect(() => {
    const a = anchor.current;
    const el = box.current;
    if (!a || !el) return;
    anchor.current = null;
    el.scrollLeft = a.cx * zoom + a.padX - a.mx;
    el.scrollTop = a.cy * zoom + a.padY - a.my;
  }, [zoom]);

  function onDown(e: React.PointerEvent) {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const el = box.current;
    const svg = el?.querySelector("svg");
    if (pointers.current.size !== 2 || !el || !svg) return;
    const [a, b] = [...pointers.current.values()] as [{ x: number; y: number }, { x: number; y: number }];
    const at = svg.getBoundingClientRect();
    const frame = el.getBoundingClientRect();
    pinch.current = {
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      zoom,
      cx: ((a.x + b.x) / 2 - at.left) / zoom,
      cy: ((a.y + b.y) / 2 - at.top) / zoom,
      padX: at.left - frame.left + el.scrollLeft,
      padY: at.top - frame.top + el.scrollTop,
    };
  }
  function onMove(e: React.PointerEvent) {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const el = box.current;
    const pc = pinch.current;
    if (!pc || !el || pointers.current.size < 2) return;
    const [a, b] = [...pointers.current.values()] as [{ x: number; y: number }, { x: number; y: number }];
    const next = clampZoom((pc.zoom * (Math.hypot(a.x - b.x, a.y - b.y) || 1)) / pc.dist);
    const frame = el.getBoundingClientRect();
    const mx = (a.x + b.x) / 2 - frame.left;
    const my = (a.y + b.y) / 2 - frame.top;
    if (next === zoom) {
      el.scrollLeft = pc.cx * zoom + pc.padX - mx;
      el.scrollTop = pc.cy * zoom + pc.padY - my;
    } else {
      anchor.current = { cx: pc.cx, cy: pc.cy, padX: pc.padX, padY: pc.padY, mx, my };
      setZoom(next);
    }
  }
  function onUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  // Ctrl or Cmd with the wheel zooms the chart instead of the page.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => clampZoom(z * (e.deltaY < 0 ? 1.1 : 0.9)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const statusOf = (s: ChartSeat) => (s.blocked || !s.sectionId ? "blocked" : taken.has(s.id) ? "taken" : pick.has(s.id) ? "selected" : "free");
  const priceOf = (s: ChartSeat) => sections.get(s.sectionId)?.price ?? 0;
  const label = (s: ChartSeat, status: string) =>
    `Seat ${s.label}, ${sections.get(s.sectionId)?.name ?? "not for sale"}${status === "free" || status === "selected" ? `, ${formatKrw(priceOf(s))}` : ""}${s.accessible ? ", accessible" : ""}, ${
      status === "selected" ? "selected" : status === "free" ? "available" : status === "taken" ? "taken" : "not for sale"
    }`;

  const rowLabels = useMemo(() => {
    const rows = new Map<string, ChartSeat>();
    for (const s of chart.seats) {
      if (!s.sectionId) continue;
      const key = `${s.sectionId}|${s.row}`;
      const cur = rows.get(key);
      if (!cur || s.x < cur.x) rows.set(key, s);
    }
    return [...rows.entries()];
  }, [chart.seats]);

  function together() {
    const ids = findSeatsTogether(chart, taken, group, focus ?? undefined);
    if (!ids) {
      setNote(`No ${group} seats are free side by side${focus ? " in this section" : ""}. Try fewer seats or another section.`);
      return;
    }
    setNote(undefined);
    onSelectMany?.(ids);
    // Bring the chosen seats into view.
    const first = chart.seats.find((s) => s.id === ids[0]);
    const el = box.current;
    if (first && el) {
      el.scrollTo({ left: Math.max(0, (first.x - view.x) * zoom - el.clientWidth / 2), top: Math.max(0, (first.y - view.y) * zoom - el.clientHeight / 2), behavior: "smooth" });
    }
  }

  const showNumbers = zoom * medianR >= 8;
  const free = chart.seats.filter((s) => !s.blocked && s.sectionId && !taken.has(s.id)).length;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-3 py-2.5">
        <p className="text-xs text-muted" aria-live="polite">
          <strong className="text-text">{free}</strong> seat{free === 1 ? "" : "s"} available
          {interactive && <span className="text-dim"> · tap a seat to choose it</span>}
        </p>
        <div className="flex items-center gap-1.5" role="group" aria-label="Zoom">
          <ZoomButton label="Zoom out" onClick={() => setZoom((z) => clampZoom(z - (z > 1 ? 0.25 : 0.1)))}>
            <Minus size={15} />
          </ZoomButton>
          <span className="w-11 text-center text-xs font-bold text-text">{Math.round(zoom * 100)}%</span>
          <ZoomButton label="Zoom in" onClick={() => setZoom((z) => clampZoom(z + (z >= 1 ? 0.25 : 0.1)))}>
            <Plus size={15} />
          </ZoomButton>
          <ZoomButton label="Fit the whole room" onClick={fit}>
            <Maximize size={15} />
          </ZoomButton>
        </div>
      </div>

      <div
        ref={attach}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        // One finger scrolls the chart natively; two fingers are handled above as a pinch.
        style={{ touchAction: "pan-x pan-y" }}
        className="max-h-[70vh] overflow-auto bg-black/40 p-2"
        tabIndex={0}
        aria-label="Seat chart. Scroll to look around."
      >
        {zoom > 0 && (
          <svg
            viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
            style={{ width: view.w * zoom, height: view.h * zoom, maxWidth: "none" }}
            className="mx-auto block select-none"
            role="group"
            aria-label={`Seat chart with ${chart.seats.length} seats in ${chart.sections.length} sections`}
          >
            {chart.imageUrl && <image href={chart.imageUrl} width={chart.width} height={chart.height} opacity={0.3} style={{ filter: "grayscale(1)" }} />}
            {chart.stage && (
              <g aria-hidden>
                <rect x={chart.stage.x} y={chart.stage.y} width={chart.stage.w} height={chart.stage.h} rx={10} fill="#f7cb60" fillOpacity={0.14} stroke="#f7cb60" strokeOpacity={0.6} strokeDasharray="6 4" />
                <text x={chart.stage.x + chart.stage.w / 2} y={chart.stage.y + chart.stage.h / 2 + 5} textAnchor="middle" fontSize={15} fontWeight={700} fill="#f7cb60" style={{ letterSpacing: "0.2em", textTransform: "uppercase" }}>
                  {chart.stage.label}
                </text>
              </g>
            )}

            {zoom * medianR >= 5 &&
              rowLabels.map(([key, s]) => (
                <text key={key} x={s.x - s.r * 2.6} y={s.y + 4} textAnchor="middle" fontSize={Math.max(9, s.r)} fontWeight={700} fill="#f7cb60" fillOpacity={0.8} aria-hidden>
                  {s.row}
                </text>
              ))}

            {chart.seats.map((s) => {
              const status = statusOf(s);
              const sec = sections.get(s.sectionId);
              const dim = focus !== null && s.sectionId !== focus;
              const clickable = interactive && (status === "free" || status === "selected");
              const fill = status === "taken" || status === "blocked" ? TAKEN : (sec?.color ?? "#ece7dc");
              return (
                <g
                  key={s.id}
                  opacity={dim ? 0.25 : status === "blocked" ? 0.5 : 1}
                  role={clickable ? "button" : "img"}
                  aria-label={label(s, status)}
                  aria-pressed={clickable ? status === "selected" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  className={clickable ? "cursor-pointer focus:outline-none" : undefined}
                  onClick={clickable ? () => onToggle?.(s.id) : undefined}
                  onKeyDown={
                    clickable
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onToggle?.(s.id);
                          }
                        }
                      : undefined
                  }
                >
                  {/* A bigger invisible circle makes small seats easier to hit with a finger. */}
                  {clickable && <circle cx={s.x} cy={s.y} r={s.r * 1.25} fill="transparent" />}
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={s.r * 0.95}
                    fill={status === "selected" ? "#f7cb60" : fill}
                    fillOpacity={status === "taken" || status === "blocked" ? 0.9 : 0.9}
                    stroke={status === "selected" ? "#fff" : status === "taken" || status === "blocked" ? "#7a756c" : "#0b0907"}
                    strokeWidth={status === "selected" ? 2.4 : 1}
                    strokeDasharray={status === "blocked" ? "3 2" : undefined}
                  />
                  {status === "selected" && (
                    <path d={`M${s.x - s.r * 0.4} ${s.y} l${s.r * 0.28} ${s.r * 0.3} l${s.r * 0.55} ${-s.r * 0.6}`} fill="none" stroke="#0b0907" strokeWidth={Math.max(1.6, s.r * 0.2)} strokeLinecap="round" strokeLinejoin="round" />
                  )}
                  {(status === "taken" || status === "blocked") && (
                    <path d={`M${s.x - s.r * 0.4} ${s.y - s.r * 0.4} L${s.x + s.r * 0.4} ${s.y + s.r * 0.4} M${s.x + s.r * 0.4} ${s.y - s.r * 0.4} L${s.x - s.r * 0.4} ${s.y + s.r * 0.4}`} stroke="#7a756c" strokeWidth={1.3} />
                  )}
                  {s.accessible && status === "free" && <circle cx={s.x} cy={s.y} r={s.r * 0.42} fill="#0b0907" fillOpacity={0.7} />}
                  {showNumbers && status === "free" && !s.accessible && (
                    <text x={s.x} y={s.y + s.r * 0.32} fontSize={Math.max(6, s.r * 0.85)} textAnchor="middle" fill="#0b0907" fontWeight={700} pointerEvents="none">
                      {s.num}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {interactive && (
        <div className="flex flex-wrap items-center gap-3 border-t border-line px-3 py-2.5">
          <span className="flex items-center gap-1.5 text-xs font-bold text-text">
            <Sparkles size={14} aria-hidden className="text-gold" /> Sit together
          </span>
          <div className="flex items-center rounded-lg border border-line bg-surface-2" role="group" aria-label="How many seats together">
            <button type="button" aria-label="Fewer seats" disabled={group <= 1} onClick={() => setGroup((g) => g - 1)} className="flex size-9 items-center justify-center text-text disabled:text-dim">
              <Minus size={13} />
            </button>
            <span className="w-8 text-center text-sm font-bold text-text" aria-live="polite">
              {group}
            </span>
            <button type="button" aria-label="More seats" disabled={group >= max} onClick={() => setGroup((g) => g + 1)} className="flex size-9 items-center justify-center text-text disabled:text-dim">
              <Plus size={13} />
            </button>
          </div>
          <button type="button" onClick={together} className="h-9 rounded-lg border border-gold/50 px-3 text-xs font-bold text-gold transition-colors hover:bg-gold/10 focus-visible:focus-ring">
            Find {group} seat{group === 1 ? "" : "s"} together
          </button>
          {note && (
            <p role="status" className="basis-full text-[11px] text-amber">
              {note}
            </p>
          )}
        </div>
      )}

      <ul className="flex flex-wrap gap-x-5 gap-y-2 border-t border-line px-3 py-3" aria-label="Sections and prices">
        {chart.sections.map((sec) => {
          const on = focus === sec.id;
          return (
            <li key={sec.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => setFocus(on ? null : sec.id)}
                className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:focus-ring ${on ? "border-gold bg-gold/10" : "border-transparent hover:border-line"}`}
              >
                <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: sec.color }} />
                <span className="font-bold text-text">{sec.name}</span>
                <span className="text-dim">
                  {formatKrw(sec.price)} · {sectionFree(chart, sec.id, taken)} left
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <ul className="flex flex-wrap gap-x-5 gap-y-2 border-t border-line px-3 py-3 text-[11px] text-dim">
        <Key swatch={<span className="size-3 rounded-full bg-text/70" />}>Available</Key>
        <Key swatch={<span className="flex size-3 items-center justify-center rounded-full bg-gold"><Check size={9} className="text-black" /></span>}>Your seats</Key>
        <Key swatch={<span className="size-3 rounded-full" style={{ backgroundColor: TAKEN, boxShadow: "inset 0 0 0 1px #7a756c" }} />}>Taken</Key>
        {chart.seats.some((s) => s.accessible) && <Key swatch={<span className="flex size-3 items-center justify-center rounded-full bg-text/70"><span className="size-1.5 rounded-full bg-black" /></span>}>Accessible</Key>}
      </ul>
    </div>
  );
}

function Key({ swatch, children }: { swatch: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      {swatch} {children}
    </li>
  );
}

function ZoomButton({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="flex size-9 items-center justify-center rounded-lg border border-line text-text transition-colors hover:border-gold/50 focus-visible:focus-ring">
      {children}
    </button>
  );
}
