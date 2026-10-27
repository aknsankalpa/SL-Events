// The seat chart that customers see and pick from. Pure TypeScript with no DOM, Next or storage imports, so the website
// and the mobile app (as `@core/seating`) share the same rules: how a chart is built, which seats are taken, and what a
// valid selection is.

import type { Booking, BookingStatus } from "./bookings";
import type { LayoutSeat, SeatLayout, SeatMapState, SeatSection } from "./organizer";

/* ---------- Types ---------- */

/** The stage marker drawn on a chart, in chart pixels. */
export type Stage = { x: number; y: number; w: number; h: number; label: string };

export type ChartSection = { id: string; name: string; color: string; price: number };

export type ChartSeat = {
  /** Stable id (the builder's `uid`). Bookings store this, never the label. */
  id: string;
  row: string;
  num: number;
  /** What people read: "C12". */
  label: string;
  x: number;
  y: number;
  r: number;
  /** Id of its section, or "" for a blocked seat that was never assigned. */
  sectionId: string;
  accessible?: boolean;
  /** Not for sale. Shown greyed out so the chart still looks like the room. */
  blocked?: boolean;
};

/** What `EventItem.seatChart` holds: everything needed to draw the room and sell its seats. */
export type SeatChart = {
  width: number;
  height: number;
  /** The organizer's plan picture, when they started from one. Drawn faded behind the seats. */
  imageUrl?: string;
  stage?: Stage;
  sections: ChartSection[];
  seats: ChartSeat[];
};

export const CHART_WIDTH = 1400;
export const CHART_MIN_HEIGHT = 700;

/* ---------- Labels and ids ---------- */

/** 0 → "A", 25 → "Z", 26 → "AA", the way spreadsheets and theatres label rows. */
export function rowLabel(index: number): string {
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

/** "A" → 0, "Z" → 25, "AA" → 26. Returns -1 for text that is not a row label. */
export function rowIndex(label: string): number {
  const t = label.trim().toUpperCase();
  if (!/^[A-Z]+$/.test(t)) return -1;
  let n = 0;
  for (const ch of t) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

let counter = 0;
/** Unique within a session, and across sessions because of the time prefix. The `g` prefix keeps it apart from detected seats. */
export const newGeneratedUid = () => `g${Date.now().toString(36)}${(counter++).toString(36)}`;

export const seatLabel = (row: string, num: number) => `${row}${num}`;

/* ---------- Generating seats from a table (rows × seats) ---------- */

export type NumberingOrder = "left-right" | "right-left" | "odd-even";

export type RowsSpec = {
  /** Section the new seats belong to. */
  sectionId: string;
  rows: number;
  seatsPerRow: number;
  /** Label of the first row. Defaults to "A". */
  firstRow?: string;
  /** Seats on the left of the aisle. 0 or more than the row length means no aisle. */
  aisleAfter?: number;
  /** 0 = straight rows, 1 = strongly curved around the stage. */
  curve?: number;
  /** Distance between seat centres, in chart pixels. */
  spacing?: number;
  /** Distance between rows. */
  rowGap?: number;
  /** Seat radius. */
  r?: number;
  /** Horizontal centre and top of the block. */
  centerX: number;
  top: number;
  numbering?: NumberingOrder;
  /** Injectable so tests are deterministic. */
  uid?: () => string;
};

export const ROW_DEFAULTS = { spacing: 34, rowGap: 38, r: 11 } as const;

/** Label shown at each position of a row, left to right. */
export function numberAt(position: number, count: number, order: NumberingOrder): number {
  if (order === "right-left") return count - position;
  if (order === "odd-even") {
    const base = Array.from({ length: count }, (_, i) => i + 1);
    const odds = base.filter((n) => n % 2 === 1);
    const evens = base.filter((n) => n % 2 === 0).reverse();
    return [...odds, ...evens][position]!;
  }
  return position + 1;
}

/**
 * Seats for a block of rows. Every seat carries its own row label and number, so a curved or hand-moved row keeps its
 * numbers (the builder does not re-derive them from position for these seats; see `locked`).
 */
export function generateRows(spec: RowsSpec): LayoutSeat[] {
  const {
    sectionId,
    rows,
    seatsPerRow: n,
    spacing = ROW_DEFAULTS.spacing,
    rowGap = ROW_DEFAULTS.rowGap,
    r = ROW_DEFAULTS.r,
    curve = 0,
    numbering = "left-right",
    uid = newGeneratedUid,
  } = spec;
  if (rows <= 0 || n <= 0) return [];
  const first = Math.max(0, rowIndex(spec.firstRow ?? "A"));
  const aisleAfter = spec.aisleAfter && spec.aisleAfter > 0 && spec.aisleAfter < n ? spec.aisleAfter : 0;
  const aisleGap = aisleAfter ? spacing * 1.2 : 0;
  const width = (n - 1) * spacing + aisleGap;
  const half = (n - 1) / 2;
  // Ends of a row sit nearer the stage, as in a real hall: the centre seat is the lowest point of the arc.
  const depth = Math.max(0, Math.min(1, curve)) * width * 0.12;

  const seats: LayoutSeat[] = [];
  for (let row = 0; row < rows; row++) {
    const label = rowLabel(first + row);
    for (let i = 0; i < n; i++) {
      const t = half === 0 ? 0 : (i - half) / half;
      const x = spec.centerX - width / 2 + i * spacing + (aisleAfter && i >= aisleAfter ? aisleGap : 0);
      const y = spec.top + row * rowGap + depth * (1 - t * t);
      seats.push({
        uid: uid(),
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        r,
        section: sectionId,
        row: label,
        num: numberAt(i, n, numbering),
        locked: true,
      });
    }
  }
  return seats;
}

/** A sensible stage for a chart of this width: a bar across the top. */
export const defaultStage = (width = CHART_WIDTH): Stage => ({ x: width * 0.25, y: 28, w: width * 0.5, h: 44, label: "Stage" });

/* ---------- Converting the old row/column grid into free-form seats ---------- */

function parseRowRange(text: string): string[] | null {
  const m = text.trim().toUpperCase().match(/^([A-Z])\s*(?:TO|-|–)\s*([A-Z])$/);
  if (!m) return null;
  const [from, to] = [m[1]!.charCodeAt(0), m[2]!.charCodeAt(0)];
  if (to < from) return null;
  return Array.from({ length: to - from + 1 }, (_, i) => String.fromCharCode(from + i));
}

const GRID_SECTION_GAP = 50;
const GRID_TOP = 150;

/**
 * Lays out the old grid builder's sections as free-form seats, one block below the other under a stage.
 * A "Couple" seat sat two people for one price, so it becomes two neighbouring seats at half the price each: the
 * customer still pays the same per couple, and the door staff get one ticket per person.
 */
export function gridToLayout(
  sections: SeatSection[],
  blocked: string[] = [],
  accessible: string[] = [],
  uid?: () => string,
): { layout: SeatLayout; sections: SeatSection[] } {
  const seats: LayoutSeat[] = [];
  const outSections: SeatSection[] = [];
  let top = GRID_TOP;

  for (const section of sections) {
    const rows = parseRowRange(section.rows) ?? [];
    const couple = section.seatType === "Couple";
    const perRow = section.seatsPerRow * (couple ? 2 : 1);
    outSections.push(couple ? { ...section, price: Math.round(section.price / 2), seatType: "Single", seatsPerRow: perRow } : section);
    if (rows.length === 0 || perRow <= 0) continue;

    const block = generateRows({
      sectionId: section.id,
      rows: rows.length,
      seatsPerRow: perRow,
      firstRow: rows[0],
      aisleAfter: section.aisleAfter ? section.aisleAfter * (couple ? 2 : 1) : 0,
      centerX: CHART_WIDTH / 2,
      top,
      numbering: section.numbering === "16 → 1" ? "right-left" : section.numbering === "Odd / even" ? "odd-even" : "left-right",
      uid: uid ?? (() => ""),
    });
    for (const s of block) {
      // Without an injected generator the ids come from the section and label, so converting the same saved draft on
      // every load gives the same ids and a booking can keep pointing at its seat.
      if (!uid) s.uid = `${section.id}-${seatLabel(s.row, s.num)}`;
      // Blocked and accessible ids refer to the original couple seat: couple 3 became seats 5 and 6 side by side.
      const id = seatLabel(s.row, couple ? Math.ceil(s.num / 2) : s.num);
      if (blocked.includes(id)) s.blocked = true;
      if (accessible.includes(id)) s.accessible = true;
    }
    seats.push(...block);
    top += rows.length * ROW_DEFAULTS.rowGap + GRID_SECTION_GAP;
  }

  const height = Math.max(CHART_MIN_HEIGHT, top + 40);
  return {
    layout: {
      imageUrl: "",
      width: CHART_WIDTH,
      height,
      seats,
      stage: defaultStage(),
      settings: { polarity: "auto", threshold: 0, sizeRange: [0.5, 2], rowTolerance: 0.6, rowOrder: "top-down", seatOrder: "left-right" },
    },
    sections: outSections,
  };
}

/* ---------- From the organizer's map to the customer's chart ---------- */

/** What customers receive for a seat map, or undefined when there is nothing to sell. */
export function chartFromSeatMap(map: SeatMapState): SeatChart | undefined {
  const base =
    map.layout ?? (map.sections.length ? gridToLayout(map.sections, map.blocked, map.accessible).layout : undefined);
  if (!base) return undefined;
  const sections =
    !map.layout && map.sections.length ? gridToLayout(map.sections, map.blocked, map.accessible).sections : map.sections;

  const seats: ChartSeat[] = [];
  for (const s of base.seats) {
    // An unassigned seat that is not blocked can't be sold, so it is left off (the review step asks the organizer to place it).
    if (!s.section && !s.blocked) continue;
    seats.push({
      id: s.uid,
      row: s.row,
      num: s.num,
      label: seatLabel(s.row, s.num),
      x: s.x,
      y: s.y,
      r: s.r,
      sectionId: s.section ?? "",
      accessible: s.accessible || undefined,
      blocked: s.blocked || undefined,
    });
  }
  const used = new Set(seats.filter((s) => !s.blocked).map((s) => s.sectionId));
  return {
    width: base.width,
    height: base.height,
    imageUrl: base.imageUrl || undefined,
    stage: base.stage,
    sections: sections.filter((s) => used.has(s.id)).map((s) => ({ id: s.id, name: s.name, color: s.color, price: s.price })),
    seats,
  };
}

/* ---------- Availability ---------- */

/** Statuses whose seats are still someone's. A cancelled or expired booking has let go of them. */
const HOLDING: ReadonlySet<BookingStatus> = new Set(["confirmed", "under_review", "awaiting_payment", "proof_rejected", "attended"]);

export const holdsSeats = (status: BookingStatus) => HOLDING.has(status);

/**
 * Ids of seats that are taken for an event. Derived from bookings every time, so an unpaid booking that passes its
 * deadline (or is cancelled) frees its seats with nothing to clean up. `statusOf` should be `effectiveStatus` at "now".
 */
export function takenSeatIds(
  bookings: readonly Pick<Booking, "eventSlug" | "status" | "seats" | "payByIso">[],
  eventSlug: string,
  statusOf: (b: Pick<Booking, "status" | "payByIso">) => BookingStatus = (b) => b.status,
): Set<string> {
  const taken = new Set<string>();
  for (const b of bookings) {
    if (b.eventSlug !== eventSlug || !b.seats || !holdsSeats(statusOf(b))) continue;
    for (const s of b.seats) taken.add(s.id);
  }
  return taken;
}

/* ---------- Selection ---------- */

export type SeatSelectionError =
  | { code: "none" }
  | { code: "too-many"; max: number }
  | { code: "unknown"; id: string }
  | { code: "blocked"; label: string }
  | { code: "taken"; label: string }
  | { code: "duplicate"; label: string };

export type SeatSelectionResult =
  | { ok: true; seats: ChartSeat[]; total: number }
  | { ok: false; error: SeatSelectionError; message: string };

const fail = (error: SeatSelectionError, message: string): SeatSelectionResult => ({ ok: false, error, message });

/** The same checks run in the picker, on the review page and again when the booking is created (and, later, on the server). */
export function validateSelection(chart: SeatChart, taken: ReadonlySet<string>, ids: readonly string[], max: number): SeatSelectionResult {
  if (ids.length === 0) return fail({ code: "none" }, "Choose at least one seat.");
  if (ids.length > max) return fail({ code: "too-many", max }, `You can book up to ${max} seats at a time.`);
  const byId = new Map(chart.seats.map((s) => [s.id, s] as const));
  const priceOf = new Map(chart.sections.map((s) => [s.id, s.price] as const));
  const seen = new Set<string>();
  const seats: ChartSeat[] = [];
  let total = 0;
  for (const id of ids) {
    const seat = byId.get(id);
    if (!seat) return fail({ code: "unknown", id }, "One of the seats is no longer part of this event.");
    if (seen.has(id)) return fail({ code: "duplicate", label: seat.label }, `Seat ${seat.label} is chosen twice.`);
    seen.add(id);
    if (seat.blocked) return fail({ code: "blocked", label: seat.label }, `Seat ${seat.label} is not for sale.`);
    if (taken.has(id)) return fail({ code: "taken", label: seat.label }, `Seat ${seat.label} was just taken. Please choose another.`);
    seats.push(seat);
    total += priceOf.get(seat.sectionId) ?? 0;
  }
  return { ok: true, seats, total };
}

/** Seats grouped the way a booking bills them: one line per section. */
export function linesForSeats(chart: SeatChart, seats: readonly ChartSeat[]): { sectionId: string; ticketName: string; qty: number; unitPrice: number }[] {
  const out = new Map<string, { sectionId: string; ticketName: string; qty: number; unitPrice: number }>();
  for (const seat of seats) {
    const section = chart.sections.find((s) => s.id === seat.sectionId);
    if (!section) continue;
    const line = out.get(section.id) ?? { sectionId: section.id, ticketName: section.name, qty: 0, unitPrice: section.price };
    line.qty += 1;
    out.set(section.id, line);
  }
  return [...out.values()];
}

/* ---------- Counting ---------- */

export function chartStats(chart: SeatChart, taken: ReadonlySet<string>) {
  const sellable = chart.seats.filter((s) => !s.blocked && s.sectionId);
  const free = sellable.filter((s) => !taken.has(s.id));
  return { total: sellable.length, free: free.length, taken: sellable.length - free.length };
}

export function sectionFree(chart: SeatChart, sectionId: string, taken: ReadonlySet<string>): number {
  return chart.seats.filter((s) => s.sectionId === sectionId && !s.blocked && !taken.has(s.id)).length;
}

/* ---------- "Find N seats together" ---------- */

/**
 * The best run of `count` free seats side by side in one row: nearest the stage and the middle first. Seats are
 * "side by side" when each is no further from its neighbour than the usual gap in that row, so an aisle ends a run.
 * `sectionId` limits the search to one section. Returns seat ids, or null when no row has enough room.
 */
export function findSeatsTogether(chart: SeatChart, taken: ReadonlySet<string>, count: number, sectionId?: string): string[] | null {
  if (count <= 0) return null;
  const rows = new Map<string, ChartSeat[]>();
  for (const s of chart.seats) {
    if (s.blocked || !s.sectionId || (sectionId && s.sectionId !== sectionId)) continue;
    const key = `${s.sectionId}|${s.row}`;
    (rows.get(key) ?? rows.set(key, []).get(key)!).push(s);
  }

  const stage = chart.stage;
  const focusX = stage ? stage.x + stage.w / 2 : chart.width / 2;
  const focusY = stage ? stage.y + stage.h : 0;

  const best: { ids: string[] | null; score: number } = { ids: null, score: Infinity };
  for (const seats of rows.values()) {
    seats.sort((a, b) => a.x - b.x);
    const gaps = seats.slice(1).map((s, i) => s.x - seats[i]!.x).sort((a, b) => a - b);
    const usual = gaps.length ? gaps[Math.floor(gaps.length / 2)]! : 0;
    let run: ChartSeat[] = [];
    const flush = () => {
      for (let i = 0; i + count <= run.length; i++) {
        const pick = run.slice(i, i + count);
        const cx = pick.reduce((n, s) => n + s.x, 0) / count;
        const cy = pick.reduce((n, s) => n + s.y, 0) / count;
        const score = Math.hypot(cx - focusX, (cy - focusY) * 1.4);
        if (score < best.score) {
          best.ids = pick.map((s) => s.id);
          best.score = score;
        }
      }
    };
    for (const s of seats) {
      const prev = run.at(-1);
      const free = !taken.has(s.id);
      if (!free) {
        flush();
        run = [];
        continue;
      }
      if (prev && usual > 0 && s.x - prev.x > usual * 1.5) {
        flush();
        run = [];
      }
      run.push(s);
    }
    flush();
  }
  return best.ids;
}
