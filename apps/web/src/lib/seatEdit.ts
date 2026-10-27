// Hand-editing a seat chart: moving, straightening, spacing and renumbering seats. Pure functions over `LayoutSeat[]`
// so the builder stays a thin layer of pointer handling and these rules can be tested without a browser.

import type { LayoutSeat } from "./organizer";
import { rowIndex, rowLabel } from "./seating";

const median = (values: number[]) => {
  const v = [...values].sort((a, b) => a - b);
  return v.length ? v[v.length >> 1]! : 0;
};

/** Rounds to the nearest grid line. A grid of 0 means no snapping. */
export const snapTo = (value: number, grid: number) => (grid > 0 ? Math.round(value / grid) * grid : value);

/** The label for a new block of rows: the first one after every row label already in use. */
export function nextRowLabel(seats: readonly LayoutSeat[]): string {
  const highest = seats.reduce((n, s) => Math.max(n, rowIndex(s.row)), -1);
  return rowLabel(highest + 1);
}

/** Moves the chosen seats by (dx, dy), keeping every seat inside the chart. */
export function moveSeats(seats: LayoutSeat[], ids: ReadonlySet<string>, dx: number, dy: number, width: number, height: number, grid = 0): LayoutSeat[] {
  const chosen = seats.filter((s) => ids.has(s.uid));
  if (chosen.length === 0) return seats;
  // Clamp the whole group so a drag towards an edge stops at the edge instead of squashing the rows together.
  const minX = Math.min(...chosen.map((s) => s.x - s.r));
  const maxX = Math.max(...chosen.map((s) => s.x + s.r));
  const minY = Math.min(...chosen.map((s) => s.y - s.r));
  const maxY = Math.max(...chosen.map((s) => s.y + s.r));
  const cx = Math.min(width - maxX, Math.max(-minX, dx));
  const cy = Math.min(height - maxY, Math.max(-minY, dy));
  // Snap the group by its first seat, so the rows keep their spacing relative to each other.
  const lead = chosen[0]!;
  const sx = grid > 0 ? snapTo(lead.x + cx, grid) - lead.x : cx;
  const sy = grid > 0 ? snapTo(lead.y + cy, grid) - lead.y : cy;
  const fx = Math.min(width - maxX, Math.max(-minX, sx));
  const fy = Math.min(height - maxY, Math.max(-minY, sy));
  return seats.map((s) => (ids.has(s.uid) ? { ...s, x: round(s.x + fx), y: round(s.y + fy) } : s));
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Groups seats by row label. */
function byRow(seats: readonly LayoutSeat[]): Map<string, LayoutSeat[]> {
  const rows = new Map<string, LayoutSeat[]>();
  for (const s of seats) (rows.get(s.row) ?? rows.set(s.row, []).get(s.row)!).push(s);
  return rows;
}

/** Puts each chosen row on one horizontal line (the average height of its chosen seats). */
export function straightenRows(seats: LayoutSeat[], ids: ReadonlySet<string>): LayoutSeat[] {
  const rows = byRow(seats.filter((s) => ids.has(s.uid)));
  const y = new Map<string, number>();
  for (const [row, list] of rows) y.set(row, list.reduce((n, s) => n + s.y, 0) / list.length);
  return seats.map((s) => (ids.has(s.uid) ? { ...s, y: round(y.get(s.row)!) } : s));
}

/** Spreads each chosen row's seats evenly between its leftmost and rightmost seat. */
export function spaceEvenly(seats: LayoutSeat[], ids: ReadonlySet<string>): LayoutSeat[] {
  const next = new Map<string, number>();
  for (const list of byRow(seats.filter((s) => ids.has(s.uid))).values()) {
    if (list.length < 3) continue;
    const sorted = [...list].sort((a, b) => a.x - b.x);
    const first = sorted[0]!.x;
    const step = (sorted.at(-1)!.x - first) / (sorted.length - 1);
    sorted.forEach((s, i) => next.set(s.uid, round(first + i * step)));
  }
  return seats.map((s) => (next.has(s.uid) ? { ...s, x: next.get(s.uid)! } : s));
}

/** Which way a row is numbered, from the seats it already has. */
function rowDirection(list: readonly LayoutSeat[]): "left-right" | "right-left" {
  const sorted = [...list].sort((a, b) => a.x - b.x);
  return sorted.length > 1 && sorted[0]!.num > sorted.at(-1)!.num ? "right-left" : "left-right";
}

/**
 * Numbers every row that has a chosen seat 1, 2, 3… with no gaps, following the row's direction. The chosen seats say
 * which rows to fix; the whole row is renumbered so a row never ends up with two seat 5s.
 */
export function renumberRows(seats: LayoutSeat[], ids: ReadonlySet<string>): LayoutSeat[] {
  const rows = new Set(seats.filter((s) => ids.has(s.uid)).map((s) => s.row));
  const next = new Map<string, number>();
  for (const [row, list] of byRow(seats)) {
    if (!rows.has(row)) continue;
    const dir = rowDirection(list);
    const sorted = [...list].sort((a, b) => (dir === "left-right" ? a.x - b.x : b.x - a.x));
    sorted.forEach((s, i) => next.set(s.uid, i + 1));
  }
  return seats.map((s) => (next.has(s.uid) ? { ...s, num: next.get(s.uid)!, locked: true } : s));
}

/**
 * A seat dropped next to an existing row joins it: it takes the row's label and the row is renumbered so the new seat
 * sits in the right place. Far from any row it stays a loose seat, and the builder numbers it as a row of its own.
 * Only rows made with the rows table (locked) are joined; detected rows are renumbered by position anyway.
 */
export function addSeatNearRow(seats: LayoutSeat[], seat: LayoutSeat): LayoutSeat[] {
  let nearest: LayoutSeat | null = null;
  let best = Infinity;
  for (const s of seats) {
    const d = Math.hypot(s.x - seat.x, s.y - seat.y);
    if (d < best) {
      best = d;
      nearest = s;
    }
  }
  const reach = nearest ? Math.max(nearest.r * 3.4, median(seats.map((s) => s.r)) * 3.4) : 0;
  if (!nearest || !nearest.locked || best > reach) return [...seats, seat];
  const joined: LayoutSeat = { ...seat, row: nearest.row, num: 0, locked: true, section: seat.section ?? nearest.section };
  return renumberRows([...seats, joined], new Set([joined.uid]));
}
